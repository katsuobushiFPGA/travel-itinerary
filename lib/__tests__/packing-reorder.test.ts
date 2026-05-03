import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const findManyMock = vi.fn();
const updateMock = vi.fn();
const transactionMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    packingItem: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
    },
    $transaction: (...args: unknown[]) => transactionMock(...args),
  },
}));

import { reorderPackingItems } from "@/lib/actions/packing";

describe("reorderPackingItems", () => {
  beforeEach(() => {
    findManyMock.mockReset();
    updateMock.mockReset();
    transactionMock.mockReset();
    transactionMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("orderedIds が空配列はエラー", async () => {
    const res = await reorderPackingItems("trip1", "衣類", []);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/対象/);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("orderedIds に重複があればエラー", async () => {
    const res = await reorderPackingItems("trip1", "衣類", ["a", "a"]);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/重複/);
  });

  it("既存集合と一致しない（ID 不一致）ならエラー", async () => {
    findManyMock.mockResolvedValue([{ id: "a" }, { id: "b" }]);
    const res = await reorderPackingItems("trip1", "衣類", ["a", "b", "c"]);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/集合/);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("category=null（未分類） も独立した集合として扱う", async () => {
    findManyMock.mockResolvedValue([{ id: "a" }, { id: "b" }]);
    updateMock.mockImplementation((args: unknown) => args);
    const res = await reorderPackingItems("trip1", null, ["b", "a"]);
    expect(res.ok).toBe(true);
    expect(findManyMock).toHaveBeenCalledWith({
      where: { tripId: "trip1", category: null },
      select: { id: true },
    });
  });

  it("正常系: 0..N の sortOrder で update + tripId つき where", async () => {
    findManyMock.mockResolvedValue([{ id: "a" }, { id: "b" }, { id: "c" }]);
    updateMock.mockImplementation((args: unknown) => args);
    const res = await reorderPackingItems("trip1", "衣類", ["c", "a", "b"]);
    expect(res.ok).toBe(true);
    expect(findManyMock).toHaveBeenCalledWith({
      where: { tripId: "trip1", category: "衣類" },
      select: { id: true },
    });
    expect(transactionMock).toHaveBeenCalledTimes(1);
    const calls = updateMock.mock.calls.map((c) => c[0]);
    expect(calls).toEqual([
      { where: { id: "c", tripId: "trip1" }, data: { sortOrder: 0 } },
      { where: { id: "a", tripId: "trip1" }, data: { sortOrder: 1 } },
      { where: { id: "b", tripId: "trip1" }, data: { sortOrder: 2 } },
    ]);
  });

  it("$transaction が失敗したら ok=false", async () => {
    findManyMock.mockResolvedValue([{ id: "a" }]);
    transactionMock.mockRejectedValue(new Error("boom"));
    const res = await reorderPackingItems("trip1", "衣類", ["a"]);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/失敗/);
  });
});
