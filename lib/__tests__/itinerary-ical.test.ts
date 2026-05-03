import { describe, expect, it } from "vitest";
import {
  formatItineraryIcal,
  type IcalItineraryItem,
  type IcalTrip,
} from "@/lib/itinerary-ical";

const trip: IcalTrip = {
  id: "trip1",
  title: "京都旅行",
  startDate: new Date("2026-08-01T00:00:00.000Z"),
};

function item(
  partial: Partial<IcalItineraryItem> & {
    id: string;
    dayIndex: number;
    startTime: string;
    title: string;
  },
): IcalItineraryItem {
  return {
    endTime: null,
    location: null,
    url: null,
    note: null,
    ...partial,
  };
}

describe("formatItineraryIcal", () => {
  it("空配列でも有効な VCALENDAR を返す", () => {
    const ics = formatItineraryIcal(trip, []);
    expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/);
    expect(ics).toMatch(/END:VCALENDAR\r\n$/);
    expect(ics).toMatch(/VERSION:2\.0/);
    expect(ics).not.toMatch(/BEGIN:VEVENT/);
  });

  it("1 件: DTSTART/DTEND/SUMMARY が出る", () => {
    const ics = formatItineraryIcal(trip, [
      item({
        id: "a",
        dayIndex: 1,
        startTime: "09:00",
        endTime: "12:30",
        title: "金閣寺",
        location: "金閣寺",
      }),
    ]);
    expect(ics).toMatch(/BEGIN:VEVENT\r\n/);
    expect(ics).toMatch(/UID:a@travel-itinerary/);
    expect(ics).toMatch(/DTSTART:20260801T090000/);
    expect(ics).toMatch(/DTEND:20260801T123000/);
    expect(ics).toMatch(/SUMMARY:金閣寺/);
    expect(ics).toMatch(/LOCATION:金閣寺/);
  });

  it("endTime が無いときは DTSTART+1h を DTEND にする", () => {
    const ics = formatItineraryIcal(trip, [
      item({ id: "a", dayIndex: 1, startTime: "09:00", title: "集合" }),
    ]);
    expect(ics).toMatch(/DTSTART:20260801T090000/);
    expect(ics).toMatch(/DTEND:20260801T100000/);
  });

  it("dayIndex で日付が計算される（dayIndex=3 は startDate + 2日）", () => {
    const ics = formatItineraryIcal(trip, [
      item({ id: "x", dayIndex: 3, startTime: "08:30", title: "朝食" }),
    ]);
    expect(ics).toMatch(/DTSTART:20260803T083000/);
  });

  it("特殊文字（カンマ/セミコロン/バックスラッシュ/改行）はエスケープされる", () => {
    const ics = formatItineraryIcal(trip, [
      item({
        id: "x",
        dayIndex: 1,
        startTime: "10:00",
        title: "タイトル, with; symbols\\and\nnewline",
      }),
    ]);
    // RFC5545: , → \, ; → \; \\ → \\\\ \n → \n
    expect(ics).toMatch(/SUMMARY:タイトル\\, with\\; symbols\\\\and\\nnewline/);
  });

  it("DESCRIPTION の改行は \\n にエスケープされる", () => {
    const ics = formatItineraryIcal(trip, [
      item({
        id: "x",
        dayIndex: 1,
        startTime: "10:00",
        title: "観光",
        note: "1行目\n2行目\n3行目",
      }),
    ]);
    expect(ics).toMatch(/DESCRIPTION:1行目\\n2行目\\n3行目/);
  });

  it("URL フィールドが含まれる", () => {
    const ics = formatItineraryIcal(trip, [
      item({
        id: "x",
        dayIndex: 1,
        startTime: "10:00",
        title: "公式サイト",
        url: "https://example.com/spot",
      }),
    ]);
    expect(ics).toMatch(/URL:https:\/\/example\.com\/spot/);
  });

  it("URL に改行が含まれていたら出力しない（iCal インジェクション防止）", () => {
    const ics = formatItineraryIcal(trip, [
      item({
        id: "x",
        dayIndex: 1,
        startTime: "10:00",
        title: "観光",
        url: "https://example.com\r\nDESCRIPTION:hijack",
      }),
    ]);
    expect(ics).not.toMatch(/URL:/);
    expect(ics).not.toMatch(/DESCRIPTION:hijack/);
  });

  it("URL が javascript: 等のスキームなら出力しない", () => {
    const ics = formatItineraryIcal(trip, [
      item({
        id: "x",
        dayIndex: 1,
        startTime: "10:00",
        title: "観光",
        url: "javascript:alert(1)",
      }),
    ]);
    expect(ics).not.toMatch(/URL:/);
  });

  it("now を渡すと DTSTAMP が固定される", () => {
    const ics = formatItineraryIcal(
      trip,
      [item({ id: "a", dayIndex: 1, startTime: "09:00", title: "朝食" })],
      new Date("2026-05-03T12:34:56.000Z"),
    );
    expect(ics).toMatch(/DTSTAMP:20260503T123456Z/);
  });

  it("複数イベントが順序通りに含まれる", () => {
    const ics = formatItineraryIcal(trip, [
      item({ id: "a", dayIndex: 1, startTime: "09:00", title: "朝食" }),
      item({ id: "b", dayIndex: 1, startTime: "10:00", title: "観光" }),
    ]);
    const occurrences = ics.split("BEGIN:VEVENT").length - 1;
    expect(occurrences).toBe(2);
    expect(ics.indexOf("UID:a@")).toBeLessThan(ics.indexOf("UID:b@"));
  });

  it("行末は CRLF で終端する", () => {
    const ics = formatItineraryIcal(trip, [
      item({ id: "a", dayIndex: 1, startTime: "09:00", title: "朝食" }),
    ]);
    const lines = ics.split("\r\n");
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    // 末尾は空文字（最後に CRLF があるため）
    expect(lines[lines.length - 1]).toBe("");
  });
});
