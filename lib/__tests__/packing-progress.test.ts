import { describe, expect, it } from "vitest";
import {
  formatPackingProgress,
  packingProgress,
} from "@/lib/packing-progress";

describe("packingProgress", () => {
  it("total=0 のときは percent=0", () => {
    expect(packingProgress(0, 0)).toEqual({
      total: 0,
      checked: 0,
      percent: 0,
    });
  });

  it("3 / 12 は percent=25", () => {
    expect(packingProgress(3, 12)).toEqual({
      total: 12,
      checked: 3,
      percent: 25,
    });
  });

  it("3 / 11 は percent=27（四捨五入）", () => {
    // 27.27... → 27
    expect(packingProgress(3, 11).percent).toBe(27);
  });

  it("199 / 200 のような境界では percent=100 にはなるが checked!=total を区別できる", () => {
    // 99.5 → 100 で四捨五入される。完了判定を percent ではなく checked===total
    // で行う前提を明示的にテストする。
    const p = packingProgress(199, 200);
    expect(p.percent).toBe(100);
    expect(p.checked).toBe(199);
    expect(p.total).toBe(200);
    expect(p.checked === p.total).toBe(false);
  });

  it("checked が total を超えたら total に丸め percent は 100 で打ち止め", () => {
    // 整合性が壊れている場合はクランプして表示を素直に保つ
    expect(packingProgress(15, 10)).toEqual({
      total: 10,
      checked: 10,
      percent: 100,
    });
  });

  it("負値の checked は 0 として扱う", () => {
    expect(packingProgress(-3, 10)).toEqual({
      total: 10,
      checked: 0,
      percent: 0,
    });
  });
});

describe("formatPackingProgress", () => {
  it("total=0 は専用文言", () => {
    const p = packingProgress(0, 0);
    expect(formatPackingProgress(p)).toBe("持ち物なし");
  });

  it("通常は X / Y 完了 (Z%) フォーマット", () => {
    const p = packingProgress(3, 12);
    expect(formatPackingProgress(p)).toBe("3 / 12 完了 (25%)");
  });

  it("100% のとき", () => {
    const p = packingProgress(8, 8);
    expect(formatPackingProgress(p)).toBe("8 / 8 完了 (100%)");
  });
});
