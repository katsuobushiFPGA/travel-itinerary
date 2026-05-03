import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const findUniqueMock = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    trip: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
  },
}));

import { GET } from "@/app/api/trips/[tripId]/export/route";

function makeReq(format?: string) {
  const url = format
    ? `http://localhost/api/trips/t1/export?format=${format}`
    : "http://localhost/api/trips/t1/export";
  return new Request(url);
}

const ctx = { params: Promise.resolve({ tripId: "t1" }) };

describe("GET /api/trips/[tripId]/export", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("不明な format は 400", async () => {
    const res = await GET(makeReq("xml"), ctx);
    expect(res.status).toBe(400);
  });

  it("trip が無ければ 404", async () => {
    findUniqueMock.mockResolvedValue(null);
    const res = await GET(makeReq("ical"), ctx);
    expect(res.status).toBe(404);
  });

  it("ical 形式は text/calendar を返す（BOM なし）", async () => {
    findUniqueMock.mockResolvedValue({
      id: "t1",
      title: "京都",
      startDate: new Date("2026-08-01T00:00:00.000Z"),
      itineraryItems: [],
    });
    const res = await GET(makeReq("ical"), ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/calendar/);
    const cd = res.headers.get("content-disposition") ?? "";
    expect(cd).toMatch(/filename="_+\.ics"/); // ASCII フォールバック（非 ASCII は _）
    expect(cd).toMatch(/filename\*=UTF-8''.+\.ics/); // RFC5987 形式が併記される
    expect(cd).toContain(encodeURIComponent("京都"));
    const body = await res.text();
    expect(body.startsWith("BEGIN:VCALENDAR")).toBe(true);
  });

  it("csv 形式は UTF-8 BOM 付きで text/csv を返す", async () => {
    findUniqueMock.mockResolvedValue({
      id: "t1",
      title: "京都",
      startDate: new Date("2026-08-01T00:00:00.000Z"),
      itineraryItems: [],
    });
    const res = await GET(makeReq("csv"), ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/csv/);
    const cd = res.headers.get("content-disposition") ?? "";
    expect(cd).toMatch(/filename\*=UTF-8''.+\.csv/);
    expect(cd).toContain(encodeURIComponent("京都"));
    // text() は BOM を自動で剥がすので生バイトを直接見る
    const buf = new Uint8Array(await res.arrayBuffer());
    expect([buf[0], buf[1], buf[2]]).toEqual([0xef, 0xbb, 0xbf]); // UTF-8 BOM
    const body = new TextDecoder("utf-8", { ignoreBOM: true }).decode(buf);
    expect(body.slice(1)).toMatch(/^Day,/);
  });

  it("format 未指定はデフォルトで ical 扱い", async () => {
    findUniqueMock.mockResolvedValue({
      id: "t1",
      title: "京都",
      startDate: new Date("2026-08-01T00:00:00.000Z"),
      itineraryItems: [],
    });
    const res = await GET(makeReq(), ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/calendar/);
  });

  it("ファイル名が sanitize される（OS 禁止文字 → _）", async () => {
    findUniqueMock.mockResolvedValue({
      id: "t1",
      title: 'a/b\\c:d*e?f"g<h>i|j',
      startDate: new Date("2026-08-01T00:00:00.000Z"),
      itineraryItems: [],
    });
    const res = await GET(makeReq("ical"), ctx);
    const cd = res.headers.get("content-disposition") ?? "";
    // ASCII フォールバックでは禁止文字が _ に置換される
    expect(cd).toMatch(/filename="a_b_c_d_e_f_g_h_i_j\.ics"/);
  });
});
