"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { itineraryItemInputSchema } from "@/lib/validators";

type FormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function parseItineraryForm(formData: FormData) {
  return itineraryItemInputSchema.safeParse({
    dayIndex: formData.get("dayIndex")?.toString() ?? "",
    startTime: formData.get("startTime")?.toString() ?? "",
    endTime: formData.get("endTime")?.toString() ?? "",
    title: formData.get("title")?.toString() ?? "",
    location: formData.get("location")?.toString() ?? "",
    note: formData.get("note")?.toString() ?? "",
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
      note: parsed.data.note,
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
      note: parsed.data.note,
    },
  });
  revalidatePath(`/trips/${item.tripId}/itinerary`);
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
