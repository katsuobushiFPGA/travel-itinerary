// 旅程 ItineraryItem の集合を RFC 4180 風 CSV テキストに変換する純関数。
//
// - レコード区切りは CRLF。
// - 引用符 / カンマ / 改行のいずれかを含むフィールドは "..." で囲み、内部の " は ""
//   にエスケープする。
// - フィールド内の改行は入力のまま保持する（LF を CRLF に正規化しない）。
//   Excel/Numbers/Google Sheets はいずれも quote 内の LF を許容するため、ここでは
//   「ユーザー入力の改行を改変しない」を優先する。
// - null は空文字。

const CRLF = "\r\n";
const HEADER = ["Day", "開始時刻", "終了時刻", "タイトル", "場所", "URL", "メモ"];

export type CsvItineraryItem = {
  dayIndex: number;
  startTime: string;
  endTime: string | null;
  title: string;
  location: string | null;
  url: string | null;
  note: string | null;
};

export function formatItineraryCsv(items: CsvItineraryItem[]): string {
  const rows: string[] = [HEADER.join(",")];
  for (const it of items) {
    rows.push(
      [
        String(it.dayIndex),
        it.startTime,
        it.endTime ?? "",
        it.title,
        it.location ?? "",
        it.url ?? "",
        it.note ?? "",
      ]
        .map(escapeField)
        .join(","),
    );
  }
  return rows.join(CRLF) + CRLF;
}

function escapeField(value: string): string {
  if (value === "") return "";
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
