"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { packingItemInputSchema } from "@/lib/validators";
import {
  MAX_BULK_PACKING_ITEMS,
  type ParsedPackingLine,
} from "@/lib/packing-parser";

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

export async function parsePackingForm(formData: FormData) {
  const quantityRaw = formData.get("quantity")?.toString();
  return packingItemInputSchema.safeParse({
    name: formData.get("name")?.toString() ?? "",
    category: formData.get("category")?.toString() ?? "",
    owner: formData.get("owner")?.toString() ?? "",
    quantity: quantityRaw !== undefined && quantityRaw !== "" ? quantityRaw : undefined,
  });
}

export async function createPackingItem(
  tripId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = await parsePackingForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      error: "入力に誤りがあります",
    };
  }

  const count = await prisma.packingItem.count({ where: { tripId } });

  await prisma.packingItem.create({
    data: {
      tripId,
      name: parsed.data.name,
      category: parsed.data.category,
      owner: parsed.data.owner,
      quantity: parsed.data.quantity,
      sortOrder: count,
    },
  });

  revalidatePath(`/trips/${tripId}/packing`);
  return { ok: true };
}

export async function updatePackingItem(
  itemId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = await parsePackingForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      error: "入力に誤りがあります",
    };
  }

  const item = await prisma.packingItem.findUnique({ where: { id: itemId } });
  if (!item) {
    return { ok: false, error: "アイテムが見つかりません" };
  }

  await prisma.packingItem.update({
    where: { id: itemId },
    data: {
      name: parsed.data.name,
      category: parsed.data.category,
      owner: parsed.data.owner,
      quantity: parsed.data.quantity,
    },
  });

  revalidatePath(`/trips/${item.tripId}/packing`);
  return { ok: true };
}

export async function createPackingItemsBulk(
  tripId: string,
  items: ParsedPackingLine[],
): Promise<BulkResult> {
  if (items.length === 0) {
    return { ok: false, created: 0, error: "追加対象がありません" };
  }
  if (items.length > MAX_BULK_PACKING_ITEMS) {
    return {
      ok: false,
      created: 0,
      error: `一度に登録できるのは ${MAX_BULK_PACKING_ITEMS} 件までです`,
    };
  }

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) {
    return { ok: false, created: 0, error: "旅程が見つかりません" };
  }

  const validated: Array<{
    name: string;
    category: string | null;
    owner: string | null;
    quantity: number;
  }> = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const parsed = packingItemInputSchema.safeParse({
      name: item.name,
      category: item.category ?? "",
      owner: item.owner ?? "",
      quantity: String(item.quantity),
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return {
        ok: false,
        created: 0,
        error: `${i + 1} 件目「${item.name || "(無題)"}」: ${first?.message ?? "入力エラー"}`,
        failedLine: i + 1,
      };
    }
    validated.push({
      name: parsed.data.name,
      category: parsed.data.category ?? null,
      owner: parsed.data.owner ?? null,
      quantity: parsed.data.quantity,
    });
  }

  const baseSortOrder = await prisma.packingItem.count({ where: { tripId } });

  let result: { count: number };
  try {
    result = await prisma.packingItem.createMany({
      data: validated.map((v, i) => ({
        tripId,
        name: v.name,
        category: v.category,
        owner: v.owner,
        quantity: v.quantity,
        sortOrder: baseSortOrder + i,
      })),
    });
  } catch {
    return { ok: false, created: 0, error: "保存に失敗しました" };
  }
  revalidatePath(`/trips/${tripId}/packing`);
  return { ok: true, created: result.count };
}

export async function deletePackingItem(
  itemId: string,
  tripId: string,
): Promise<FormState> {
  await prisma.packingItem.delete({ where: { id: itemId } });
  revalidatePath(`/trips/${tripId}/packing`);
  return { ok: true };
}

export async function togglePackingItemChecked(
  itemId: string,
  tripId: string,
  checked: boolean,
): Promise<FormState> {
  await prisma.packingItem.update({
    where: { id: itemId },
    data: { checked },
  });
  revalidatePath(`/trips/${tripId}/packing`);
  return { ok: true };
}
