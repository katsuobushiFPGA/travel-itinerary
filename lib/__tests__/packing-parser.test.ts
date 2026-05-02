import { describe, expect, it } from "vitest";
import { parseBulkPacking } from "@/lib/packing-parser";

describe("parseBulkPacking", () => {
  it("空文字列で items=[]", () => {
    const r = parseBulkPacking("");
    expect(r.items).toEqual([]);
    expect(r.errors).toEqual([]);
  });

  it("基本的な複数カテゴリ入力", () => {
    const text = [
      "# 衣類",
      "Tシャツ x3",
      "パーカー",
      "",
      "# 電子機器",
      "モバイルバッテリー",
      "スマホ充電器 x2 @太郎",
    ].join("\n");
    const r = parseBulkPacking(text);
    expect(r.errors).toEqual([]);
    expect(r.items).toEqual([
      { category: "衣類", name: "Tシャツ", quantity: 3, owner: undefined },
      { category: "衣類", name: "パーカー", quantity: 1, owner: undefined },
      { category: "電子機器", name: "モバイルバッテリー", quantity: 1, owner: undefined },
      { category: "電子機器", name: "スマホ充電器", quantity: 2, owner: "太郎" },
    ]);
  });

  it("カテゴリ未指定で始まると category=undefined", () => {
    const r = parseBulkPacking("歯ブラシ");
    expect(r.errors).toEqual([]);
    expect(r.items[0]).toEqual({
      category: undefined,
      name: "歯ブラシ",
      quantity: 1,
      owner: undefined,
    });
  });

  it("× (全角) も数量として認識される", () => {
    const r = parseBulkPacking("Tシャツ ×4");
    expect(r.errors).toEqual([]);
    expect(r.items[0].quantity).toBe(4);
    expect(r.items[0].name).toBe("Tシャツ");
  });

  it("X (大文字) も数量として認識される", () => {
    const r = parseBulkPacking("Tシャツ X5");
    expect(r.items[0].quantity).toBe(5);
  });

  it("名前内の x は数量と誤認しない", () => {
    // "box" は最後が数字ではないので qty マッチしない
    const r = parseBulkPacking("box");
    expect(r.items[0].name).toBe("box");
    expect(r.items[0].quantity).toBe(1);
  });

  it("数量と担当者の両方を含む（推奨順序）", () => {
    const r = parseBulkPacking("Tシャツ x3 @太郎");
    expect(r.items[0]).toMatchObject({
      name: "Tシャツ",
      quantity: 3,
      owner: "太郎",
    });
  });

  it("@ から始まる行はエラー", () => {
    const r = parseBulkPacking("@太郎");
    expect(r.items).toEqual([]);
    expect(r.errors[0].message).toMatch(/名前/);
  });

  it("# だけのカテゴリ行はエラー", () => {
    const r = parseBulkPacking("# ");
    expect(r.errors[0].message).toMatch(/カテゴリ/);
  });

  it("CRLF 改行も正しく行分割される", () => {
    const r = parseBulkPacking("# 衣類\r\nTシャツ\r\nパーカー");
    expect(r.errors).toEqual([]);
    expect(r.items.length).toBe(2);
  });

  it("カテゴリ行が複数あれば直近の値が以降に適用される", () => {
    const text = [
      "# A",
      "アイテム1",
      "# B",
      "アイテム2",
      "# C",
      "アイテム3",
    ].join("\n");
    const r = parseBulkPacking(text);
    expect(r.items.map((i) => i.category)).toEqual(["A", "B", "C"]);
  });

  it("不正な行と正常な行が混在する場合は正常分だけ採用しエラーも返す", () => {
    const text = [
      "Tシャツ",
      "@誰か",
      "パーカー",
    ].join("\n");
    const r = parseBulkPacking(text);
    expect(r.items.length).toBe(2);
    expect(r.errors.length).toBe(1);
    expect(r.errors[0].line).toBe(2);
  });

  it("数量が 0 はエラー（パターンに一致するが範囲外）", () => {
    const r = parseBulkPacking("Tシャツ x0");
    expect(r.items).toEqual([]);
    expect(r.errors[0].message).toMatch(/数量/);
  });

  it("数量が 10000 以上はエラー（上限超え）", () => {
    const r = parseBulkPacking("Tシャツ x10000");
    expect(r.items).toEqual([]);
    expect(r.errors[0].message).toMatch(/数量/);
  });

  it("@担当者 が 2 つ以上ある行はエラー", () => {
    const r = parseBulkPacking("荷物 @owner1 @owner2");
    expect(r.items).toEqual([]);
    expect(r.errors[0].message).toMatch(/@担当者/);
  });

  it("名前にスペースなしの @ を含むメアド等は名前として保持される", () => {
    // \s+@ ではないので OWNER_RE と複数 @ チェックの両方をスルーする
    const r = parseBulkPacking("メール@gmail.com");
    expect(r.errors).toEqual([]);
    expect(r.items[0]).toMatchObject({
      name: "メール@gmail.com",
      owner: undefined,
    });
  });

  it("担当者の前後空白は trim される", () => {
    const r = parseBulkPacking("傘 @山田太郎");
    expect(r.items[0].owner).toBe("山田太郎");
  });

  it("担当者に空白を含む値も受け付ける", () => {
    const r = parseBulkPacking("傘 @山田 太郎");
    expect(r.items[0]).toMatchObject({ name: "傘", owner: "山田 太郎" });
  });

  it("名前に空白を含む（数量・担当者なし）", () => {
    const r = parseBulkPacking("ノート PC");
    expect(r.items[0].name).toBe("ノート PC");
    expect(r.items[0].quantity).toBe(1);
  });

  it("# 行はカテゴリヘッダだが、本体は名前として無視されない", () => {
    // # の後に空白がないと、ただの名前として扱われる（HEADER_RE は \s+ を要求）
    const r = parseBulkPacking("#noheader");
    expect(r.errors).toEqual([]);
    expect(r.items[0].name).toBe("#noheader");
  });
});
