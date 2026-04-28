import { describe, expect, it } from "vitest";
import { parseBulkItinerary } from "@/lib/itinerary-parser";

describe("parseBulkItinerary", () => {
  it("空文字列で items=[]", () => {
    const r = parseBulkItinerary("");
    expect(r.items).toEqual([]);
    expect(r.errors).toEqual([]);
  });

  it("基本的な複数日入力", () => {
    const text = [
      "Day 1",
      "09:00 東京駅集合 @東京駅",
      "10:30 大涌谷観光",
      "",
      "Day 2",
      "09:00 ポーラ美術館 @ポーラ美術館",
    ].join("\n");
    const r = parseBulkItinerary(text);
    expect(r.errors).toEqual([]);
    expect(r.items).toEqual([
      { day: 1, startTime: "09:00", endTime: undefined, title: "東京駅集合", location: "東京駅" },
      { day: 1, startTime: "10:30", endTime: undefined, title: "大涌谷観光", location: undefined },
      { day: 2, startTime: "09:00", endTime: undefined, title: "ポーラ美術館", location: "ポーラ美術館" },
    ]);
  });

  it("Day 指定なしなら day=1 から始まる", () => {
    const r = parseBulkItinerary("09:00 集合");
    expect(r.items[0].day).toBe(1);
  });

  it("defaultDay オプションが効く", () => {
    const r = parseBulkItinerary("09:00 集合", { defaultDay: 3 });
    expect(r.items[0].day).toBe(3);
  });

  it("HH:MM-HH:MM のレンジ表記をパースする", () => {
    const r = parseBulkItinerary("10:00-12:30 観光");
    expect(r.items[0]).toMatchObject({
      startTime: "10:00",
      endTime: "12:30",
      title: "観光",
    });
  });

  it("全角チルダ〜のレンジ表記もパースする", () => {
    const r = parseBulkItinerary("10:00〜12:30 観光");
    expect(r.items[0].endTime).toBe("12:30");
  });

  it("1 桁時刻はゼロパディングされる", () => {
    const r = parseBulkItinerary("9:00 集合");
    expect(r.errors).toEqual([]);
    expect(r.items[0].startTime).toBe("09:00");
  });

  it("時刻が読めない行はエラー", () => {
    const r = parseBulkItinerary("abc タイトル");
    expect(r.items).toEqual([]);
    expect(r.errors[0].message).toMatch(/時刻が読めません/);
    expect(r.errors[0].line).toBe(1);
  });

  it("時刻の値が不正（25:00）はエラー", () => {
    const r = parseBulkItinerary("25:00 集合");
    expect(r.items).toEqual([]);
    expect(r.errors[0].message).toMatch(/不正/);
  });

  it("end < start はエラー", () => {
    const r = parseBulkItinerary("12:00-09:00 逆転");
    expect(r.items).toEqual([]);
    expect(r.errors[0].message).toMatch(/開始時刻以降/);
  });

  it("タイトル空はエラー (タイトルとロケーションの間に空白あり)", () => {
    const r = parseBulkItinerary("09:00 @東京駅");
    expect(r.items).toEqual([]);
    expect(r.errors[0].message).toMatch(/タイトル/);
  });

  it("タイトル空はエラー (空白なしで @ のみ)", () => {
    // 回帰: @始まりのフィールドをタイトルとして誤解釈していたバグの再現条件
    const r = parseBulkItinerary("09:00 @東京駅のみ");
    expect(r.items).toEqual([]);
    expect(r.errors[0].message).toMatch(/タイトル/);
  });

  it("CRLF 改行も正しく行分割される", () => {
    const r = parseBulkItinerary("09:00 集合\r\n10:00 出発");
    expect(r.errors).toEqual([]);
    expect(r.items.length).toBe(2);
  });

  it("Day 0 を指定してもパーサは通すが day=0 として記録される", () => {
    // 範囲チェックは UI / Server Action 側で行う設計
    const r = parseBulkItinerary("Day 0\n09:00 集合");
    expect(r.errors).toEqual([]);
    expect(r.items[0].day).toBe(0);
  });

  it("@location は最初の @ で末尾分離される", () => {
    const r = parseBulkItinerary("09:00 ランチ会 @カフェ A");
    expect(r.items[0]).toMatchObject({
      title: "ランチ会",
      location: "カフェ A",
    });
  });

  it("Day 行が複数あれば直近の値が以降に適用される", () => {
    const text = [
      "Day 1",
      "09:00 朝食",
      "Day 2",
      "10:00 観光",
      "Day 3",
      "11:00 ランチ",
    ].join("\n");
    const r = parseBulkItinerary(text);
    expect(r.items.map((i) => i.day)).toEqual([1, 2, 3]);
  });

  it("不正な行と正常な行が混在する場合は正常分だけ採用しエラーも返す", () => {
    const text = [
      "09:00 集合",
      "あいうえお",
      "10:00 出発",
    ].join("\n");
    const r = parseBulkItinerary(text);
    expect(r.items.length).toBe(2);
    expect(r.errors.length).toBe(1);
    expect(r.errors[0].line).toBe(2);
  });
});
