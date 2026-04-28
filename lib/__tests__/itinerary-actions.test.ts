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

  it("mapX/mapY が両方空なら座標は undefined", async () => {
    const fd = makeFormData({
      dayIndex: "1",
      startTime: "09:00",
      title: "集合",
      mapX: "",
      mapY: "",
    });
    const result = await parseItineraryForm(fd);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mapX).toBeUndefined();
      expect(result.data.mapY).toBeUndefined();
    }
  });

  it("mapX/mapY が両方指定されれば数値として通る", async () => {
    const fd = makeFormData({
      dayIndex: "1",
      startTime: "09:00",
      title: "集合",
      mapX: "42.5",
      mapY: "61",
    });
    const result = await parseItineraryForm(fd);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mapX).toBeCloseTo(42.5);
      expect(result.data.mapY).toBe(61);
    }
  });

  it("mapX のみ指定はエラー", async () => {
    const fd = makeFormData({
      dayIndex: "1",
      startTime: "09:00",
      title: "集合",
      mapX: "30",
    });
    const result = await parseItineraryForm(fd);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.mapX?.[0]).toMatch(/X \/ Y/);
    }
  });

  it("mapX が範囲外はエラー", async () => {
    const fd = makeFormData({
      dayIndex: "1",
      startTime: "09:00",
      title: "集合",
      mapX: "150",
      mapY: "50",
    });
    const result = await parseItineraryForm(fd);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.mapX?.[0]).toMatch(/0〜100/);
    }
  });

  it("mapY が範囲外（>75）はエラー", async () => {
    const fd = makeFormData({
      dayIndex: "1",
      startTime: "09:00",
      title: "集合",
      mapX: "50",
      mapY: "80",
    });
    const result = await parseItineraryForm(fd);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.mapY?.[0]).toMatch(/0〜75/);
    }
  });

  it("mapY のみ指定もペア整合性エラー（mapX 側に出る）", async () => {
    const fd = makeFormData({
      dayIndex: "1",
      startTime: "09:00",
      title: "集合",
      mapY: "30",
    });
    const result = await parseItineraryForm(fd);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.mapX?.[0]).toMatch(/X \/ Y/);
    }
  });
});
