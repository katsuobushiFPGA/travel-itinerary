import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parsePackingForm } from "@/lib/actions/packing";

function makeFormData(fields: Record<string, string | undefined>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      fd.append(key, value);
    }
  }
  return fd;
}

describe("parsePackingForm", () => {
  it("正常系: name のみで quantity が 1 になる", () => {
    const fd = makeFormData({ name: "歯ブラシ" });
    const result = parsePackingForm(fd);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("歯ブラシ");
      expect(result.data.quantity).toBe(1);
      expect(result.data.category).toBeUndefined();
      expect(result.data.owner).toBeUndefined();
    }
  });

  it("name が空ならエラー", () => {
    const fd = makeFormData({ name: "" });
    const result = parsePackingForm(fd);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.name?.length).toBeGreaterThan(0);
    }
  });

  it("quantity が 0 ならエラー", () => {
    const fd = makeFormData({ name: "充電器", quantity: "0" });
    const result = parsePackingForm(fd);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.quantity?.length).toBeGreaterThan(0);
    }
  });

  it("category が空文字なら undefined に正規化される", () => {
    const fd = makeFormData({ name: "スーツケース", category: "" });
    const result = parsePackingForm(fd);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBeUndefined();
    }
  });

  it("quantity の文字列 '3' は数値 3 に coerce される", () => {
    const fd = makeFormData({ name: "シャツ", quantity: "3" });
    const result = parsePackingForm(fd);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe(3);
    }
  });

  it("owner が空文字なら undefined に正規化される", () => {
    const fd = makeFormData({ name: "傘", owner: "" });
    const result = parsePackingForm(fd);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.owner).toBeUndefined();
    }
  });

  it("name が空白のみならエラー（trim 後に空）", () => {
    const fd = makeFormData({ name: "   " });
    const result = parsePackingForm(fd);
    expect(result.success).toBe(false);
  });

  it("quantity が負数ならエラー", () => {
    const fd = makeFormData({ name: "タオル", quantity: "-1" });
    const result = parsePackingForm(fd);
    expect(result.success).toBe(false);
  });

  it("すべてのフィールドを正しく受け付ける", () => {
    const fd = makeFormData({
      name: "パスポート",
      category: "書類",
      owner: "山田太郎",
      quantity: "2",
    });
    const result = parsePackingForm(fd);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("パスポート");
      expect(result.data.category).toBe("書類");
      expect(result.data.owner).toBe("山田太郎");
      expect(result.data.quantity).toBe(2);
    }
  });
});
