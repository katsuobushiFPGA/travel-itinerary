import { describe, expect, it } from "vitest";
import {
  formatItineraryCsv,
  type CsvItineraryItem,
} from "@/lib/itinerary-csv";

function item(
  partial: Partial<CsvItineraryItem> & {
    dayIndex: number;
    startTime: string;
    title: string;
  },
): CsvItineraryItem {
  return {
    endTime: null,
    location: null,
    url: null,
    note: null,
    ...partial,
  };
}

describe("formatItineraryCsv", () => {
  it("空配列でも見出し行は付ける", () => {
    const csv = formatItineraryCsv([]);
    expect(csv.startsWith("Day,開始時刻,終了時刻,タイトル,場所,URL,メモ")).toBe(
      true,
    );
    expect(csv.split("\r\n").length).toBe(2); // header + 末尾空行
  });

  it("1 件の通常データ", () => {
    const csv = formatItineraryCsv([
      item({
        dayIndex: 1,
        startTime: "09:00",
        endTime: "12:00",
        title: "観光",
        location: "金閣寺",
        url: "https://example.com",
        note: "注意点",
      }),
    ]);
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe("1,09:00,12:00,観光,金閣寺,https://example.com,注意点");
  });

  it("カンマを含むフィールドは引用符で囲む", () => {
    const csv = formatItineraryCsv([
      item({
        dayIndex: 1,
        startTime: "09:00",
        title: "京都, 大阪",
      }),
    ]);
    expect(csv).toMatch(/"京都, 大阪"/);
  });

  it("引用符を含むフィールドはエスケープして引用符で囲む", () => {
    const csv = formatItineraryCsv([
      item({
        dayIndex: 1,
        startTime: "09:00",
        title: 'a "b" c',
      }),
    ]);
    // RFC4180: " → "" + 引用符で囲む
    expect(csv).toMatch(/"a ""b"" c"/);
  });

  it("改行を含むフィールドは引用符で囲んだまま CRLF を保持する", () => {
    const csv = formatItineraryCsv([
      item({
        dayIndex: 1,
        startTime: "09:00",
        title: "観光",
        note: "1行目\n2行目",
      }),
    ]);
    expect(csv).toMatch(/"1行目\n2行目"/);
  });

  it("null フィールドは空文字で出る", () => {
    const csv = formatItineraryCsv([
      item({ dayIndex: 1, startTime: "09:00", title: "観光" }),
    ]);
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe("1,09:00,,観光,,,");
  });
});
