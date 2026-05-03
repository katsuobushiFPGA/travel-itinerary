"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { tripInputSchema } from "@/lib/validators";

function generateShareToken() {
  return randomBytes(16).toString("base64url");
}

type FormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function parseTripForm(formData: FormData) {
  return tripInputSchema.safeParse({
    title: formData.get("title")?.toString() ?? "",
    destination: formData.get("destination")?.toString() ?? "",
    startDate: formData.get("startDate")?.toString() ?? "",
    endDate: formData.get("endDate")?.toString() ?? "",
    memo: formData.get("memo")?.toString() ?? "",
    coverImage: formData.get("coverImage")?.toString() ?? "",
  });
}

export async function createTrip(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseTripForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      error: "入力に誤りがあります",
    };
  }
  const trip = await prisma.trip.create({
    data: {
      title: parsed.data.title,
      destination: parsed.data.destination,
      startDate: new Date(`${parsed.data.startDate}T00:00:00.000Z`),
      endDate: new Date(`${parsed.data.endDate}T00:00:00.000Z`),
      memo: parsed.data.memo,
      coverImage: parsed.data.coverImage,
    },
  });
  revalidatePath("/");
  redirect(`/trips/${trip.id}`);
}

export async function updateTrip(
  tripId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseTripForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      error: "入力に誤りがあります",
    };
  }
  await prisma.trip.update({
    where: { id: tripId },
    data: {
      title: parsed.data.title,
      destination: parsed.data.destination,
      startDate: new Date(`${parsed.data.startDate}T00:00:00.000Z`),
      endDate: new Date(`${parsed.data.endDate}T00:00:00.000Z`),
      memo: parsed.data.memo,
      coverImage: parsed.data.coverImage ?? null,
    },
  });
  revalidatePath("/");
  revalidatePath(`/trips/${tripId}`, "layout");
  return { ok: true };
}

export async function deleteTrip(tripId: string) {
  await prisma.trip.delete({ where: { id: tripId } });
  revalidatePath("/");
  redirect("/");
}

export async function issueShareToken(tripId: string): Promise<FormState> {
  const token = generateShareToken();
  try {
    await prisma.trip.update({
      where: { id: tripId },
      data: { shareToken: token, shareEnabled: true },
    });
  } catch {
    return { ok: false, error: "共有リンクの発行に失敗しました" };
  }
  revalidatePath(`/trips/${tripId}`, "layout");
  return { ok: true };
}

export async function pauseShare(tripId: string): Promise<FormState> {
  try {
    await prisma.trip.update({
      where: { id: tripId },
      data: { shareEnabled: false },
    });
  } catch {
    return { ok: false, error: "公開停止に失敗しました" };
  }
  revalidatePath(`/trips/${tripId}`, "layout");
  return { ok: true };
}

export async function resumeShare(tripId: string): Promise<FormState> {
  try {
    await prisma.trip.update({
      where: { id: tripId },
      data: { shareEnabled: true },
    });
  } catch {
    return { ok: false, error: "再公開に失敗しました" };
  }
  revalidatePath(`/trips/${tripId}`, "layout");
  return { ok: true };
}

export async function revokeShareToken(tripId: string): Promise<FormState> {
  try {
    await prisma.trip.update({
      where: { id: tripId },
      data: { shareToken: null },
    });
  } catch {
    return { ok: false, error: "URL の削除に失敗しました" };
  }
  revalidatePath(`/trips/${tripId}`, "layout");
  return { ok: true };
}
