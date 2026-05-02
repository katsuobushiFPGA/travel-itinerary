import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// 各テストでモジュールキャッシュをリセットして
// places.ts のモジュールスコープ (placesCache / inflight) を初期化する。

function makeNominatimResponse(displayNames: string[]): Response {
  return new Response(
    JSON.stringify(displayNames.map((d) => ({ display_name: d }))),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

describe("searchPlaces", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // vi.stubGlobal は restoreAllMocks では戻らないので明示的に解除する
    vi.unstubAllGlobals();
  });

  it("2 文字未満は fetch を呼ばずに空配列を返す", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { searchPlaces } = await import("@/lib/actions/places");
    const result = await searchPlaces("a");
    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("キャッシュヒット時は fetch を再呼び出ししない", async () => {
    const fetchMock = vi.fn(async () =>
      makeNominatimResponse(["Tokyo Station, Chiyoda, Tokyo"]),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { searchPlaces } = await import("@/lib/actions/places");

    const r1 = await searchPlaces("tokyo");
    const r2 = await searchPlaces("tokyo");
    expect(r1).toEqual(r2);
    expect(r1).toEqual([
      { name: "Tokyo Station", address: "Tokyo Station, Chiyoda, Tokyo" },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("キャッシュキーは NFKC 正規化 + lowercase + 内部空白圧縮", async () => {
    const fetchMock = vi.fn(async () => makeNominatimResponse(["A, B"]));
    vi.stubGlobal("fetch", fetchMock);
    const { searchPlaces } = await import("@/lib/actions/places");

    await searchPlaces("Ｔｏｋｙｏ"); // 全角
    await searchPlaces("tokyo"); // 半角
    await searchPlaces("TOKYO"); // 大文字
    await searchPlaces("tokyo  station"); // 内部空白 2 つ
    await searchPlaces("tokyo station"); // 同上 1 つ

    // 全角/半角/大小は同一キーで 1 回、空白圧縮版で 1 回 → 計 2 回
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fetch が失敗した場合（一過性エラー）はキャッシュせず、次回再試行する", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(makeNominatimResponse(["A, B"]));
    vi.stubGlobal("fetch", fetchMock);
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { searchPlaces } = await import("@/lib/actions/places");

    const r1 = await searchPlaces("tokyo");
    expect(r1).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const r2 = await searchPlaces("tokyo");
    expect(r2).toEqual([{ name: "A", address: "A, B" }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("HTTP エラー (4xx/5xx) もキャッシュせず警告ログを残す", async () => {
    const fetchMock = vi.fn(
      async () => new Response("oops", { status: 503 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { searchPlaces } = await import("@/lib/actions/places");

    const r1 = await searchPlaces("tokyo");
    const r2 = await searchPlaces("tokyo");
    expect(r1).toEqual([]);
    expect(r2).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("正常な空応答 (検索ヒット 0 件) はキャッシュされる", async () => {
    const fetchMock = vi.fn(async () => makeNominatimResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    const { searchPlaces } = await import("@/lib/actions/places");

    const r1 = await searchPlaces("zzzznotexist");
    const r2 = await searchPlaces("zzzznotexist");
    expect(r1).toEqual([]);
    expect(r2).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("同一キーの並行リクエストは fetch を 1 回だけ呼ぶ (in-flight dedup)", async () => {
    let resolveFetch: (res: Response) => void;
    const pending = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    const fetchMock = vi.fn(async () => pending);
    vi.stubGlobal("fetch", fetchMock);
    const { searchPlaces } = await import("@/lib/actions/places");

    const p1 = searchPlaces("tokyo");
    const p2 = searchPlaces("tokyo");
    const p3 = searchPlaces("tokyo");
    // この時点ではまだ pending
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveFetch!(makeNominatimResponse(["A, B"]));

    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
    expect(r1).toEqual(r2);
    expect(r2).toEqual(r3);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
