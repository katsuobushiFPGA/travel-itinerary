import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));

import { parseItineraryForm } from "@/lib/actions/itinerary";

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

describe("parseItineraryForm", () => {
  it("正常系: 必須項目のみで成功する", async () => {
    const fd = makeFormData({
      dayIndex: "1",
      startTime: "09:00",
      title: "東京駅集合",
    });
    const result = await parseItineraryForm(fd);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dayIndex).toBe(1);
      expect(result.data.startTime).toBe("09:00");
      expect(result.data.title).toBe("東京駅集合");
      expect(result.data.endTime).toBeUndefined();
      expect(result.data.location).toBeUndefined();
      expect(result.data.note).toBeUndefined();
    }
  });

  it("正常系: 全フィールドを指定して成功する", async () => {
    const fd = makeFormData({
      dayIndex: "2",
      startTime: "10:00",
      endTime: "12:00",
      title: "浅草観光",
      location: "東京都台東区",
      note: "雷門を見る",
    });
    const result = await parseItineraryForm(fd);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dayIndex).toBe(2);
      expect(result.data.endTime).toBe("12:00");
      expect(result.data.location).toBe("東京都台東区");
      expect(result.data.note).toBe("雷門を見る");
    }
  });

  it("endTime が空文字なら undefined に正規化される", async () => {
    const fd = makeFormData({
      dayIndex: "1",
      startTime: "09:00",
      endTime: "",
      title: "午前観光",
    });
    const result = await parseItineraryForm(fd);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.endTime).toBeUndefined();
    }
  });

  it("HH:mm 形式でない startTime はエラー", async () => {
    const fd = makeFormData({
      dayIndex: "1",
      startTime: "9:00",
      title: "集合",
    });
    const result = await parseItineraryForm(fd);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.startTime?.length).toBeGreaterThan(0);
    }
  });

  it("HH:mm 形式でない endTime はエラー", async () => {
    const fd = makeFormData({
      dayIndex: "1",
      startTime: "09:00",
      endTime: "1200",
      title: "集合",
    });
    const result = await parseItineraryForm(fd);
    expect(result.success).toBe(false);
  });

  it("endTime < startTime はエラー", async () => {
    const fd = makeFormData({
      dayIndex: "1",
      startTime: "12:00",
      endTime: "09:00",
      title: "逆転",
    });
    const result = await parseItineraryForm(fd);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.endTime?.[0]).toMatch(/開始時刻/);
    }
  });

  it("dayIndex が 0 以下はエラー", async () => {
    const fd = makeFormData({
      dayIndex: "0",
      startTime: "09:00",
      title: "x",
    });
    const result = await parseItineraryForm(fd);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.dayIndex?.length).toBeGreaterThan(0);
    }
  });

  it("dayIndex が負の数はエラー", async () => {
    const fd = makeFormData({
      dayIndex: "-1",
      startTime: "09:00",
      title: "x",
    });
    const result = await parseItineraryForm(fd);
    expect(result.success).toBe(false);
  });

  it("title が空文字はエラー", async () => {
    const fd = makeFormData({
      dayIndex: "1",
      startTime: "09:00",
      title: "",
    });
    const result = await parseItineraryForm(fd);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.title?.length).toBeGreaterThan(0);
    }
  });

  it("location が空文字なら undefined に正規化される", async () => {
    const fd = makeFormData({
      dayIndex: "1",
      startTime: "09:00",
      title: "集合",
      location: "",
    });
    const result = await parseItineraryForm(fd);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.location).toBeUndefined();
    }
  });
});
