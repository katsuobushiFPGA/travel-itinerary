"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { itineraryItemInputSchema } from "@/lib/validators";
import type { ParsedItineraryLine } from "@/lib/itinerary-parser";

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
    },
  });
  revalidatePath(`/trips/${tripId}/itinerary`);
  return { ok: true };
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
    validated.push({
      dayIndex: parsed.data.dayIndex,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime ?? null,
      title: parsed.data.title,
      location: parsed.data.location ?? null,
    });
  }

  const result = await prisma.itineraryItem.createMany({
    data: validated.map((v) => ({
      tripId,
      dayIndex: v.dayIndex,
      startTime: v.startTime,
      endTime: v.endTime,
      title: v.title,
      location: v.location,
    })),
  });
  revalidatePath(`/trips/${tripId}/itinerary`);
  return { ok: true, created: result.count };
}

export async function deleteItineraryItem(
  itemId: string,
  tripId: string,
): Promise<FormState> {
  await prisma.itineraryItem.delete({ where: { id: itemId } });
  revalidatePath(`/trips/${tripId}/itinerary`);
  return { ok: true };
}
