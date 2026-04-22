"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { memberInputSchema } from "@/lib/validators";

type FormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export function parseMemberForm(formData: FormData) {
  return memberInputSchema.safeParse({
    name: formData.get("name")?.toString() ?? "",
    role: formData.get("role")?.toString() ?? "",
    contact: formData.get("contact")?.toString() ?? "",
  });
}

export async function createMember(
  tripId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseMemberForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      error: "入力に誤りがあります",
    };
  }
  try {
    await prisma.member.create({
      data: {
        tripId,
        name: parsed.data.name,
        role: parsed.data.role,
        contact: parsed.data.contact,
      },
    });
  } catch {
    return { ok: false, error: "メンバーの作成に失敗しました" };
  }
  revalidatePath(`/trips/${tripId}/members`);
  return { ok: true };
}

export async function updateMember(
  memberId: string,
  tripId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseMemberForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      error: "入力に誤りがあります",
    };
  }
  try {
    await prisma.member.update({
      where: { id: memberId },
      data: {
        name: parsed.data.name,
        role: parsed.data.role,
        contact: parsed.data.contact,
      },
    });
  } catch {
    return { ok: false, error: "メンバーの更新に失敗しました" };
  }
  revalidatePath(`/trips/${tripId}/members`);
  return { ok: true };
}

export async function deleteMember(
  memberId: string,
  tripId: string,
): Promise<FormState> {
  try {
    await prisma.member.delete({ where: { id: memberId } });
  } catch {
    return { ok: false, error: "メンバーの削除に失敗しました" };
  }
  revalidatePath(`/trips/${tripId}/members`);
  return { ok: true };
}
