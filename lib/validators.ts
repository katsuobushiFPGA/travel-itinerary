import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const timeSchema = z
  .string()
  .regex(timeRegex, "HH:mm 形式で入力してください");

export const tripInputSchema = z
  .object({
    title: z.string().trim().min(1, "タイトルは必須です").max(100),
    destination: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "日付形式が不正です"),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "日付形式が不正です"),
    memo: z
      .string()
      .max(2000)
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
    coverImage: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .transform((v) => (v === "" ? undefined : v))
      .refine(
        (v) => v === undefined || /^https?:\/\//.test(v),
        { message: "http(s) で始まる URL を指定してください" },
      ),
  })
  .refine((v) => v.startDate <= v.endDate, {
    message: "開始日は終了日以前にしてください",
    path: ["endDate"],
  });

export type TripInput = z.infer<typeof tripInputSchema>;

export const memberInputSchema = z.object({
  name: z.string().trim().min(1, "名前は必須です").max(100),
  role: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  contact: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});
export type MemberInput = z.infer<typeof memberInputSchema>;

export const itineraryItemInputSchema = z
  .object({
    dayIndex: z.coerce.number().int().min(1, "1 以上を指定してください"),
    startTime: timeSchema,
    endTime: z
      .string()
      .optional()
      .transform((v) => (v === "" ? undefined : v))
      .refine((v) => v === undefined || timeRegex.test(v), {
        message: "HH:mm 形式で入力してください",
      }),
    title: z.string().trim().min(1, "タイトルは必須です").max(200),
    location: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
    url: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .transform((v) => (v === "" ? undefined : v))
      .refine(
        (v) => v === undefined || /^https?:\/\//.test(v),
        { message: "http(s) で始まる URL を指定してください" },
      ),
    note: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
  })
  .refine(
    (v) => v.endTime === undefined || v.startTime <= v.endTime,
    { message: "終了時刻は開始時刻以降にしてください", path: ["endTime"] },
  );
export type ItineraryItemInput = z.infer<typeof itineraryItemInputSchema>;

export const packingItemInputSchema = z.object({
  name: z.string().trim().min(1, "名前は必須です").max(100),
  category: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  owner: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  quantity: z.coerce.number().int().min(1, "1 以上").max(9999).default(1),
});
export type PackingItemInput = z.infer<typeof packingItemInputSchema>;
