// Trip 一覧の絞り込みヘルパ。URL searchParams と Prisma where 条件の橋渡しを担う純関数。

import type { Prisma } from "@/lib/generated/prisma/client";

export type TripStatus = "all" | "upcoming" | "active" | "past";

export type TripFilter = {
  q: string;
  status: TripStatus;
};

const STATUSES: ReadonlyArray<TripStatus> = [
  "all",
  "upcoming",
  "active",
  "past",
];

export function parseTripFilter(
  params: { q?: string | string[]; status?: string | string[] } | undefined,
): TripFilter {
  const rawQ = pickString(params?.q);
  const rawStatus = pickString(params?.status);
  const status = (STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as TripStatus)
    : "all";
  return { q: rawQ.trim(), status };
}

function pickString(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

// SQLite の `contains` はデフォルトで大小文字を区別する。
// 日本語タイトルが主用途なので現状は許容。英字混在で検索したい場合は呼び出し側で
// 入力を正規化することで吸収する。
export function buildTripWhere(
  filter: TripFilter,
  now: Date,
): Prisma.TripWhereInput {
  const where: Prisma.TripWhereInput = {};
  if (filter.q) {
    where.OR = [
      { title: { contains: filter.q } },
      { destination: { contains: filter.q } },
    ];
  }
  switch (filter.status) {
    case "upcoming":
      where.startDate = { gt: now };
      break;
    case "active":
      where.AND = [{ startDate: { lte: now } }, { endDate: { gte: now } }];
      break;
    case "past":
      where.endDate = { lt: now };
      break;
    case "all":
      break;
  }
  return where;
}

export function statusLabel(status: TripStatus): string {
  switch (status) {
    case "all":
      return "すべて";
    case "upcoming":
      return "これから";
    case "active":
      return "進行中";
    case "past":
      return "終了";
  }
}

export const TRIP_STATUSES = STATUSES;
