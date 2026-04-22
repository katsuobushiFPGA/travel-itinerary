import { describe, expect, it, vi } from "vitest";

// server-only と DB 依存をテスト環境でモック
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: {} }));

// モックを設定した後でインポートする
const { parseMemberForm } = await import("@/lib/actions/members");

function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.append(key, value);
  }
  return fd;
}

describe("parseMemberForm", () => {
  it("名前・役割・連絡先がすべて揃った場合に成功する", () => {
    const fd = makeFormData({
      name: "山田太郎",
      role: "運転担当",
      contact: "090-1234-5678",
    });
    const result = parseMemberForm(fd);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("山田太郎");
      expect(result.data.role).toBe("運転担当");
      expect(result.data.contact).toBe("090-1234-5678");
    }
  });

  it("名前のみでも成功し、role と contact は undefined になる", () => {
    const fd = makeFormData({ name: "鈴木花子", role: "", contact: "" });
    const result = parseMemberForm(fd);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("鈴木花子");
      expect(result.data.role).toBeUndefined();
      expect(result.data.contact).toBeUndefined();
    }
  });

  it("name が空文字の場合はエラーになる", () => {
    const fd = makeFormData({ name: "", role: "会計", contact: "" });
    const result = parseMemberForm(fd);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.name?.length).toBeGreaterThan(0);
    }
  });

  it("name がスペースのみの場合もエラーになる（trim 後に空）", () => {
    const fd = makeFormData({ name: "   ", role: "", contact: "" });
    const result = parseMemberForm(fd);
    expect(result.success).toBe(false);
  });

  it("role のみ空文字の場合は undefined に正規化される", () => {
    const fd = makeFormData({ name: "田中一郎", role: "", contact: "test@example.com" });
    const result = parseMemberForm(fd);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBeUndefined();
      expect(result.data.contact).toBe("test@example.com");
    }
  });

  it("contact のみ空文字の場合は undefined に正規化される", () => {
    const fd = makeFormData({ name: "佐藤次郎", role: "幹事", contact: "" });
    const result = parseMemberForm(fd);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contact).toBeUndefined();
      expect(result.data.role).toBe("幹事");
    }
  });

  it("name が FormData に存在しない場合もエラーになる", () => {
    const fd = new FormData();
    const result = parseMemberForm(fd);
    expect(result.success).toBe(false);
  });
});
