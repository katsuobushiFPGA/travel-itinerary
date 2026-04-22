"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { packingItemInputSchema } from "@/lib/validators";

type FormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export function parsePackingForm(formData: FormData) {
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
  const parsed = parsePackingForm(formData);
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
  const parsed = parsePackingForm(formData);
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
