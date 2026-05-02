"use server";

import { TtlLruCache } from "@/lib/places-cache";

// Nominatim (OpenStreetMap) を呼んで場所候補を返す Server Action。
//
// Nominatim Usage Policy (https://operations.osmfoundation.org/policies/nominatim/):
// - 1 リクエスト/秒の上限。クライアント側で debounce すること。
// - User-Agent に連絡先 or アプリ識別子を含める。

export type PlaceCandidate = {
  name: string;
  address: string;
};

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const USER_AGENT =
  "travel-itinerary/0.1 (https://github.com/katsuobushiFPGA/travel-itinerary)";

// プロセスローカルのキャッシュ。最大 256 クエリ、TTL 10 分。
// 同一クエリの再呼び出しを抑制し、Nominatim の 1 req/s 制限へのプレッシャーを下げる。
//
// ⚠️ Vercel Functions / Fluid Compute のような serverless 環境では、インスタンス間で
// メモリ共有されないためキャッシュ効果はウォームインスタンス内に閉じる。レート制限の
// 主防衛はクライアント側の debounce + UI 側のキー連打抑制であり、本層は追加の保険。
// プロセス越境のキャッシュが必要になったら Vercel Runtime Cache や `use cache: remote`
// を検討する。
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 256;
const placesCache = new TtlLruCache<PlaceCandidate[]>(
  CACHE_MAX_ENTRIES,
  CACHE_TTL_MS,
);

// 同一キーの並行リクエストを 1 本に集約するためのスタンピード抑制。
// fetch 中の Promise を共有して、同じクエリを多重に Nominatim へ届かせない。
const inflight = new Map<string, Promise<PlaceCandidate[] | null>>();

function cacheKey(trimmedQuery: string): string {
  // NFKC で全角→半角を統一、toLowerCase で大小差異を吸収、内部空白を 1 つに畳む。
  // 日本語の表記ゆれ（ひらがな⇔カタカナ⇔漢字）はキャッシュ対象外として割り切る。
  return trimmedQuery.normalize("NFKC").toLowerCase().replace(/\s+/g, " ");
}

// fetch 部分。fetch / parse の失敗（一過性エラー）は null、
// 正常応答（空配列含む）は配列を返す。null のときはキャッシュしない。
async function fetchPlaces(
  trimmedQuery: string,
): Promise<PlaceCandidate[] | null> {
  const url = new URL(NOMINATIM_ENDPOINT);
  url.searchParams.set("q", trimmedQuery);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");
  url.searchParams.set("accept-language", "ja");

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store",
      // 5 秒タイムアウト
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    console.warn("[searchPlaces] fetch failed:", err);
    return null;
  }
  if (!res.ok) {
    console.warn(
      "[searchPlaces] HTTP error:",
      res.status,
      res.statusText,
    );
    return null;
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch (err) {
    console.warn("[searchPlaces] JSON parse failed:", err);
    return null;
  }
  if (!Array.isArray(data)) {
    console.warn("[searchPlaces] unexpected response shape");
    return null;
  }

  const out: PlaceCandidate[] = [];
  for (const raw of data) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const display = typeof r.display_name === "string" ? r.display_name : null;
    if (!display) continue;
    const primaryName = display.split(",")[0]?.trim() || display;
    out.push({ name: primaryName, address: display });
  }
  return out;
}

export async function searchPlaces(query: string): Promise<PlaceCandidate[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const key = cacheKey(trimmed);
  const cached = placesCache.get(key);
  if (cached !== undefined) return cached;

  let promise = inflight.get(key);
  if (!promise) {
    promise = fetchPlaces(trimmed).finally(() => {
      inflight.delete(key);
    });
    inflight.set(key, promise);
  }

  const result = await promise;
  if (result === null) {
    // 一過性エラー: キャッシュせず空を返す。次回呼び出しで再試行できる。
    return [];
  }

  placesCache.set(key, result);
  return result;
}
