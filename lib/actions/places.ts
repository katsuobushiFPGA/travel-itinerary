"use server";

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

export async function searchPlaces(query: string): Promise<PlaceCandidate[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = new URL(NOMINATIM_ENDPOINT);
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");
  url.searchParams.set("accept-language", "ja");

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store",
      // 5 秒タイムアウト相当
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return [];
  }
  if (!res.ok) return [];

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];

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
