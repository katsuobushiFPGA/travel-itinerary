import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const findManyMock = vi.fn();
const updateMock = vi.fn();
const transactionMock = vi.fn();
const tripFindUniqueMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    itineraryItem: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
    },
    trip: {
      findUnique: (...args: unknown[]) => tripFindUniqueMock(...args),
    },
    $transaction: (...args: unknown[]) => transactionMock(...args),
  },
}));

const trip5days = {
  id: "t1",
  startDate: new Date("2026-08-01T00:00:00.000Z"),
  endDate: new Date("2026-08-05T00:00:00.000Z"), // 5 日間
};

import { reorderItineraryItemsCrossDay } from "@/lib/actions/itinerary";

describe("reorderItineraryItemsCrossDay", () => {
  beforeEach(() => {
    findManyMock.mockReset();
    updateMock.mockReset();
    transactionMock.mockReset();
    tripFindUniqueMock.mockReset();
    transactionMock.mockResolvedValue([]);
    tripFindUniqueMock.mockResolvedValue(trip5days);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("perDayOrder が空はエラー", async () => {
    const res = await reorderItineraryItemsCrossDay("t1", {});
    expect(res.ok).toBe(false);
  });

  it("ID が重複していたらエラー（同一日内で重複）", async () => {
    const res = await reorderItineraryItemsCrossDay("t1", {
      "1": ["a", "a"],
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/重複/);
  });

  it("ID が重複していたらエラー（別日に同じ ID）", async () => {
    const res = await reorderItineraryItemsCrossDay("t1", {
      "1": ["a"],
      "2": ["a", "b"],
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/重複/);
  });

  it("dayIndex が 1 未満や非整数はエラー", async () => {
    const res = await reorderItineraryItemsCrossDay("t1", { "0": ["a"] });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/Day/);
  });

  it("dayIndex が trip の最大日数を超えたらエラー", async () => {
    const res = await reorderItineraryItemsCrossDay("t1", { "6": ["a"] });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/Day/);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("trip が見つからなければエラー", async () => {
    tripFindUniqueMock.mockResolvedValue(null);
    const res = await reorderItineraryItemsCrossDay("t1", { "1": ["a"] });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/見つかりません/);
  });

  it("payload に DB に存在しない ID が混ざっていたらエラー", async () => {
    findManyMock.mockResolvedValue([{ id: "a" }]);
    const res = await reorderItineraryItemsCrossDay("t1", {
      "1": ["a", "phantom"],
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/集合/);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("既存集合と一致しないなら更新しない", async () => {
    findManyMock.mockResolvedValue([
      { id: "a", dayIndex: 1, sortOrder: 0 },
      { id: "b", dayIndex: 1, sortOrder: 1 },
    ]);
    const res = await reorderItineraryItemsCrossDay("t1", {
      "1": ["a"], // b が抜けている
    });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/集合/);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("正常系: 各 day で 0..N の sortOrder を再採番、dayIndex も新値で update", async () => {
    findManyMock.mockResolvedValue([
      { id: "a", dayIndex: 1, sortOrder: 0 },
      { id: "b", dayIndex: 1, sortOrder: 1 },
      { id: "c", dayIndex: 2, sortOrder: 0 },
    ]);
    updateMock.mockImplementation((args: unknown) => args);
    const res = await reorderItineraryItemsCrossDay("t1", {
      "1": ["a"],
      "2": ["c", "b"], // b が day1→day2 に移動
    });
    expect(res.ok).toBe(true);
    const calls = updateMock.mock.calls.map((c) => c[0]);
    expect(calls).toEqual([
      {
        where: { id: "a", tripId: "t1" },
        data: { dayIndex: 1, sortOrder: 0 },
      },
      {
        where: { id: "c", tripId: "t1" },
        data: { dayIndex: 2, sortOrder: 0 },
      },
      {
        where: { id: "b", tripId: "t1" },
        data: { dayIndex: 2, sortOrder: 1 },
      },
    ]);
  });

  it("$transaction が失敗したら ok=false", async () => {
    findManyMock.mockResolvedValue([{ id: "a", dayIndex: 1, sortOrder: 0 }]);
    transactionMock.mockRejectedValue(new Error("boom"));
    const res = await reorderItineraryItemsCrossDay("t1", { "1": ["a"] });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/失敗/);
  });
});
