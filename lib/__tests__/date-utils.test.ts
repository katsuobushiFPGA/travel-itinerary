import { describe, expect, it } from "vitest";
import {
  formatTripRange,
  toDateInputValue,
  tripDurationDays,
} from "@/lib/date-utils";

describe("toDateInputValue", () => {
  it("Date から yyyy-MM-dd 形式を返す", () => {
    const d = new Date("2026-05-03T00:00:00Z");
    expect(toDateInputValue(d)).toBe("2026-05-03");
  });

  it("ISO 文字列も受け付ける", () => {
    expect(toDateInputValue("2026-05-03T00:00:00.000Z")).toBe("2026-05-03");
  });
});

describe("formatTripRange", () => {
  it("開始日と終了日が異なれば区間表記", () => {
    const s = new Date("2026-05-01T00:00:00Z");
    const e = new Date("2026-05-03T00:00:00Z");
    expect(formatTripRange(s, e)).toBe("2026/05/01 — 2026/05/03");
  });

  it("開始日と終了日が同じなら 1 日分の表記", () => {
    const s = new Date("2026-05-01T00:00:00Z");
    expect(formatTripRange(s, s)).toBe("2026/05/01");
  });
});

describe("tripDurationDays", () => {
  it("同日なら 1 日", () => {
    const s = new Date("2026-05-01T00:00:00Z");
    expect(tripDurationDays(s, s)).toBe(1);
  });

  it("3 日間の旅程は 3 を返す", () => {
    const s = new Date("2026-05-01T00:00:00Z");
    const e = new Date("2026-05-03T00:00:00Z");
    expect(tripDurationDays(s, e)).toBe(3);
  });
});
