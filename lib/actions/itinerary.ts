"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { tripDurationDays } from "@/lib/date-utils";
import { itineraryItemInputSchema } from "@/lib/validators";
import {
  MAX_BULK_ITINERARY_ITEMS,
  type ParsedItineraryLine,
} from "@/lib/itinerary-parser";

type FormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

type BulkResult = {
  ok: boolean;
  created: number;
  error?: string;
  failedLine?: number;
};

export async function parseItineraryForm(formData: FormData) {
  return itineraryItemInputSchema.safeParse({
    dayIndex: formData.get("dayIndex")?.toString() ?? "",
    startTime: formData.get("startTime")?.toString() ?? "",
    endTime: formData.get("endTime")?.toString() ?? "",
    title: formData.get("title")?.toString() ?? "",
    location: formData.get("location")?.toString() ?? "",
    url: formData.get("url")?.toString() ?? "",
    note: formData.get("note")?.toString() ?? "",
    mapX: formData.get("mapX")?.toString() ?? "",
    mapY: formData.get("mapY")?.toString() ?? "",
  });
}

export async function createItineraryItem(
  tripId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = await parseItineraryForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      error: "入力に誤りがあります",
    };
  }
  const nextSortOrder = await nextDaySortOrder(tripId, parsed.data.dayIndex);
  await prisma.itineraryItem.create({
    data: {
      tripId,
      dayIndex: parsed.data.dayIndex,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      title: parsed.data.title,
      location: parsed.data.location,
      url: parsed.data.url,
      note: parsed.data.note,
      mapX: parsed.data.mapX ?? null,
      mapY: parsed.data.mapY ?? null,
      sortOrder: nextSortOrder,
    },
  });
  revalidatePath(`/trips/${tripId}/itinerary`);
  return { ok: true };
}

// 指定 day の末尾に追加するときの sortOrder を返す。
async function nextDaySortOrder(
  tripId: string,
  dayIndex: number,
): Promise<number> {
  const last = await prisma.itineraryItem.findFirst({
    where: { tripId, dayIndex },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return last ? last.sortOrder + 1 : 0;
}

export async function updateItineraryItem(
  itemId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = await parseItineraryForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      error: "入力に誤りがあります",
    };
  }
  const item = await prisma.itineraryItem.findUnique({ where: { id: itemId } });
  if (!item) {
    return { ok: false, error: "アイテムが見つかりません" };
  }
  await prisma.itineraryItem.update({
    where: { id: itemId },
    data: {
      dayIndex: parsed.data.dayIndex,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      title: parsed.data.title,
      location: parsed.data.location,
      url: parsed.data.url ?? null,
      note: parsed.data.note,
      mapX: parsed.data.mapX ?? null,
      mapY: parsed.data.mapY ?? null,
    },
  });
  revalidatePath(`/trips/${item.tripId}/itinerary`);
  return { ok: true };
}

export async function createItineraryItemsBulk(
  tripId: string,
  items: ParsedItineraryLine[],
): Promise<BulkResult> {
  if (items.length === 0) {
    return { ok: false, created: 0, error: "追加対象がありません" };
  }
  if (items.length > MAX_BULK_ITINERARY_ITEMS) {
    return {
      ok: false,
      created: 0,
      error: `一度に登録できるのは ${MAX_BULK_ITINERARY_ITEMS} 件までです`,
    };
  }

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) {
    return { ok: false, created: 0, error: "旅程が見つかりません" };
  }
  const maxDay = tripDurationDays(trip.startDate, trip.endDate);

  const validated: Array<{
    dayIndex: number;
    startTime: string;
    endTime: string | null;
    title: string;
    location: string | null;
  }> = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const parsed = itineraryItemInputSchema.safeParse({
      dayIndex: String(item.day),
      startTime: item.startTime,
      endTime: item.endTime ?? "",
      title: item.title,
      location: item.location ?? "",
      url: "",
      note: "",
      mapX: "",
      mapY: "",
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return {
        ok: false,
        created: 0,
        error: `${i + 1} 件目「${item.title || "(無題)"}」: ${first?.message ?? "入力エラー"}`,
        failedLine: i + 1,
      };
    }
    if (parsed.data.dayIndex > maxDay) {
      return {
        ok: false,
        created: 0,
        error: `${i + 1} 件目: Day ${parsed.data.dayIndex} は旅程の範囲外です（最大 ${maxDay}）`,
        failedLine: i + 1,
      };
    }
    validated.push({
      dayIndex: parsed.data.dayIndex,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime ?? null,
      title: parsed.data.title,
      location: parsed.data.location ?? null,
    });
  }

  // 各 day の現状の末尾 sortOrder を 1 度だけ取って、バッチ内ではローカルにインクリメント。
  // 複数 day が含まれるケースは並行クエリで取りに行く。
  const uniqueDays = Array.from(new Set(validated.map((v) => v.dayIndex)));
  const dayCursorEntries = await Promise.all(
    uniqueDays.map(
      async (day) => [day, await nextDaySortOrder(tripId, day)] as const,
    ),
  );
  const dayCursors = new Map<number, number>(dayCursorEntries);

  let result: { count: number };
  try {
    result = await prisma.itineraryItem.createMany({
      data: validated.map((v) => {
        const order = dayCursors.get(v.dayIndex) ?? 0;
        dayCursors.set(v.dayIndex, order + 1);
        return {
          tripId,
          dayIndex: v.dayIndex,
          startTime: v.startTime,
          endTime: v.endTime,
          title: v.title,
          location: v.location,
          sortOrder: order,
        };
      }),
    });
  } catch {
    return { ok: false, created: 0, error: "保存に失敗しました" };
  }
  revalidatePath(`/trips/${tripId}/itinerary`);
  return { ok: true, created: result.count };
}

export async function reorderItineraryItems(
  tripId: string,
  dayIndex: number,
  orderedIds: string[],
): Promise<FormState> {
  if (!Number.isInteger(dayIndex) || dayIndex < 1) {
    return { ok: false, error: "Day が不正です" };
  }
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { ok: false, error: "並び替え対象がありません" };
  }
  if (new Set(orderedIds).size !== orderedIds.length) {
    return { ok: false, error: "ID が重複しています" };
  }

  const items = await prisma.itineraryItem.findMany({
    where: { tripId, dayIndex },
    select: { id: true },
  });
  const existingIds = new Set(items.map((i) => i.id));
  if (
    existingIds.size !== orderedIds.length ||
    orderedIds.some((id) => !existingIds.has(id))
  ) {
    return { ok: false, error: "対象アイテムの集合が一致しません" };
  }

  try {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.itineraryItem.update({
          // Prisma 5+ の extendedWhereUnique（安定機能）。tripId を where に含めることで
          // 別 trip のアイテムが万一混じった場合に P2025 を投げて catch 側に流す。
          where: { id, tripId },
          data: { sortOrder: index },
        }),
      ),
    );
  } catch {
    // チェック後にレコードが消えた等の TOCTOU で findMany〜update 間に整合が崩れた場合
    return { ok: false, error: "並び替えの保存に失敗しました" };
  }
  revalidatePath(`/trips/${tripId}/itinerary`);
  return { ok: true };
}

export async function deleteItineraryItem(
  itemId: string,
  tripId: string,
): Promise<FormState> {
  await prisma.itineraryItem.delete({ where: { id: itemId } });
  revalidatePath(`/trips/${tripId}/itinerary`);
  return { ok: true };
}
