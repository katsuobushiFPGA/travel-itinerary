import { describe, expect, it } from "vitest";
import {
  itineraryItemInputSchema,
  memberInputSchema,
  packingItemInputSchema,
  tripInputSchema,
} from "@/lib/validators";

describe("tripInputSchema", () => {
  it("有効な入力を受け付ける", () => {
    const result = tripInputSchema.safeParse({
      title: "沖縄旅行",
      destination: "沖縄県",
      startDate: "2026-05-01",
      endDate: "2026-05-03",
      memo: "海で泳ぐ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("沖縄旅行");
      expect(result.data.destination).toBe("沖縄県");
    }
  });

  it("destination が空文字なら undefined に正規化される", () => {
    const result = tripInputSchema.safeParse({
      title: "家族旅行",
      destination: "",
      startDate: "2026-05-01",
      endDate: "2026-05-03",
      memo: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.destination).toBeUndefined();
      expect(result.data.memo).toBeUndefined();
    }
  });

  it("title が空ならエラー", () => {
    const result = tripInputSchema.safeParse({
      title: "",
      startDate: "2026-05-01",
      endDate: "2026-05-03",
    });
    expect(result.success).toBe(false);
  });

  it("startDate > endDate ならエラー", () => {
    const result = tripInputSchema.safeParse({
      title: "逆転旅行",
      startDate: "2026-05-10",
      endDate: "2026-05-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.endDate?.[0]).toMatch(/開始日/);
    }
  });

  it("日付形式が不正ならエラー", () => {
    const result = tripInputSchema.safeParse({
      title: "タイトル",
      startDate: "2026/05/01",
      endDate: "2026-05-03",
    });
    expect(result.success).toBe(false);
  });
});

describe("memberInputSchema", () => {
  it("名前のみでも通る", () => {
    const r = memberInputSchema.safeParse({ name: "山田太郎" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.role).toBeUndefined();
      expect(r.data.contact).toBeUndefined();
    }
  });

  it("空の名前はエラー", () => {
    expect(memberInputSchema.safeParse({ name: "  " }).success).toBe(false);
  });
});

describe("itineraryItemInputSchema", () => {
  it("基本形が通る", () => {
    const r = itineraryItemInputSchema.safeParse({
      dayIndex: 1,
      startTime: "09:00",
      title: "東京駅集合",
    });
    expect(r.success).toBe(true);
  });

  it("HH:mm 形式以外の startTime はエラー", () => {
    const r = itineraryItemInputSchema.safeParse({
      dayIndex: 1,
      startTime: "9:00",
      title: "集合",
    });
    expect(r.success).toBe(false);
  });

  it("endTime < startTime はエラー", () => {
    const r = itineraryItemInputSchema.safeParse({
      dayIndex: 1,
      startTime: "12:00",
      endTime: "09:00",
      title: "逆転",
    });
    expect(r.success).toBe(false);
  });

  it("endTime が空文字なら undefined 扱い", () => {
    const r = itineraryItemInputSchema.safeParse({
      dayIndex: 1,
      startTime: "09:00",
      endTime: "",
      title: "午前観光",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.endTime).toBeUndefined();
  });

  it("dayIndex は 1 以上", () => {
    const r = itineraryItemInputSchema.safeParse({
      dayIndex: 0,
      startTime: "09:00",
      title: "x",
    });
    expect(r.success).toBe(false);
  });

  it("dayIndex は文字列入力も coerce する", () => {
    const r = itineraryItemInputSchema.safeParse({
      dayIndex: "2",
      startTime: "09:00",
      title: "x",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.dayIndex).toBe(2);
  });
});

describe("packingItemInputSchema", () => {
  it("name のみでも quantity が 1 になる", () => {
    const r = packingItemInputSchema.safeParse({ name: "歯ブラシ" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.quantity).toBe(1);
  });

  it("quantity は文字列入力も coerce される", () => {
    const r = packingItemInputSchema.safeParse({ name: "充電器", quantity: "3" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.quantity).toBe(3);
  });

  it("quantity が 0 以下ならエラー", () => {
    const r = packingItemInputSchema.safeParse({ name: "x", quantity: 0 });
    expect(r.success).toBe(false);
  });
});
