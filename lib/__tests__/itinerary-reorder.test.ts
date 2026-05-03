import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const findManyMock = vi.fn();
const updateMock = vi.fn();
const transactionMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    itineraryItem: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
    },
    $transaction: (...args: unknown[]) => transactionMock(...args),
  },
}));

import { reorderItineraryItems } from "@/lib/actions/itinerary";

describe("reorderItineraryItems", () => {
  beforeEach(() => {
    findManyMock.mockReset();
    updateMock.mockReset();
    transactionMock.mockReset();
    transactionMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dayIndex が 0 はエラー", async () => {
    const res = await reorderItineraryItems("trip1", 0, ["a"]);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/Day/);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("dayIndex が小数はエラー", async () => {
    const res = await reorderItineraryItems("trip1", 1.5, ["a"]);
    expect(res.ok).toBe(false);
  });

  it("orderedIds が空配列はエラー", async () => {
    const res = await reorderItineraryItems("trip1", 1, []);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/対象/);
  });

  it("orderedIds に重複があればエラー", async () => {
    const res = await reorderItineraryItems("trip1", 1, ["a", "b", "a"]);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/重複/);
  });

  it("既存集合と一致しない（ID が余分）ならエラー", async () => {
    findManyMock.mockResolvedValue([{ id: "a" }, { id: "b" }]);
    const res = await reorderItineraryItems("trip1", 1, ["a", "b", "c"]);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/集合/);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("既存集合と一致しない（ID が不足）ならエラー", async () => {
    findManyMock.mockResolvedValue([{ id: "a" }, { id: "b" }, { id: "c" }]);
    const res = await reorderItineraryItems("trip1", 1, ["a", "b"]);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/集合/);
  });

  it("正常系: $transaction が呼ばれて 0..N の sortOrder で update される", async () => {
    findManyMock.mockResolvedValue([{ id: "a" }, { id: "b" }, { id: "c" }]);
    updateMock.mockImplementation((args: unknown) => args);
    transactionMock.mockResolvedValue([]);
    const res = await reorderItineraryItems("trip1", 2, ["b", "c", "a"]);
    expect(res.ok).toBe(true);
    // 集合一致チェックの前半: tripId/dayIndex 絞り込みで findMany している
    expect(findManyMock).toHaveBeenCalledWith({
      where: { tripId: "trip1", dayIndex: 2 },
      select: { id: true },
    });
    expect(transactionMock).toHaveBeenCalledTimes(1);
    // $transaction の第一引数は update 呼び出し配列
    const calls = updateMock.mock.calls.map((c) => c[0]);
    expect(calls).toEqual([
      { where: { id: "b", tripId: "trip1" }, data: { sortOrder: 0 } },
      { where: { id: "c", tripId: "trip1" }, data: { sortOrder: 1 } },
      { where: { id: "a", tripId: "trip1" }, data: { sortOrder: 2 } },
    ]);
  });

  it("$transaction が失敗したら ok=false を返す（TOCTOU の救済）", async () => {
    findManyMock.mockResolvedValue([{ id: "a" }]);
    transactionMock.mockRejectedValue(new Error("RecordNotFound"));
    const res = await reorderItineraryItems("trip1", 1, ["a"]);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/失敗/);
  });
});
