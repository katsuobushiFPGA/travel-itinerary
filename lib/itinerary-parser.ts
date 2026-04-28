// 一括入力テキストをパースして ItineraryItem の元データに変換するヘルパー。
//
// 想定フォーマット:
//   Day 1
//   09:00 東京駅集合 @東京駅
//   10:30-12:00 大涌谷観光 @大涌谷駅
//   12:30 ランチ
//
//   Day 2
//   09:00 ポーラ美術館 @ポーラ美術館
//
// - "Day N" 行はそれ以降の day を切り替える（先頭未指定なら 1）。
// - 各アイテム行は最初の空白で時刻と残りに分割する。
// - 時刻は "HH:MM" もしくは "HH:MM-HH:MM" / "HH:MM〜HH:MM"。
// - 残りの末尾に " @ロケーション" があれば location として抽出する。

export type ParsedItineraryLine = {
  day: number;
  startTime: string;
  endTime?: string;
  title: string;
  location?: string;
};

export type ParsedItineraryError = {
  line: number;
  raw: string;
  message: string;
};

export type ParsedItineraryResult = {
  items: ParsedItineraryLine[];
  errors: ParsedItineraryError[];
};

const DAY_RE = /^Day\s+(\d+)\s*$/i;
const TIME_RE = /^(\d{1,2}):(\d{2})(?:[-〜~](\d{1,2}):(\d{2}))?$/;
const TITLE_AT_LOCATION_RE = /^(.*?)\s+@(\S.*)$/;

function pad2(n: string): string {
  return n.length === 1 ? `0${n}` : n;
}

function isHHMM(h: string, m: string): boolean {
  const hh = Number(h);
  const mm = Number(m);
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

export function parseBulkItinerary(
  text: string,
  options: { defaultDay?: number } = {},
): ParsedItineraryResult {
  const items: ParsedItineraryLine[] = [];
  const errors: ParsedItineraryError[] = [];
  let day = options.defaultDay ?? 1;
  const lines = text.split(/\r?\n/);

  lines.forEach((raw, idx) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const lineNo = idx + 1;

    const dayMatch = DAY_RE.exec(trimmed);
    if (dayMatch) {
      day = Number(dayMatch[1]);
      return;
    }

    const head = /^(\S+)\s+(.+)$/.exec(trimmed);
    if (!head) {
      errors.push({
        line: lineNo,
        raw: trimmed,
        message: "「HH:MM タイトル」の形式で書いてください",
      });
      return;
    }
    const [, timeSpec, rest] = head;
    const tm = TIME_RE.exec(timeSpec);
    if (!tm) {
      errors.push({
        line: lineNo,
        raw: trimmed,
        message: "時刻が読めません (例: 09:00 / 09:00-10:30)",
      });
      return;
    }
    const [, sh, sm, eh, em] = tm;
    if (!isHHMM(sh, sm) || (eh && em && !isHHMM(eh, em))) {
      errors.push({
        line: lineNo,
        raw: trimmed,
        message: "時刻の値が不正です",
      });
      return;
    }
    const startTime = `${pad2(sh)}:${sm}`;
    const endTime = eh && em ? `${pad2(eh)}:${em}` : undefined;
    if (endTime && startTime > endTime) {
      errors.push({
        line: lineNo,
        raw: trimmed,
        message: "終了時刻は開始時刻以降にしてください",
      });
      return;
    }

    let title = rest.trim();
    let location: string | undefined;
    if (title.startsWith("@")) {
      errors.push({
        line: lineNo,
        raw: trimmed,
        message: "タイトルが空です",
      });
      return;
    }
    const at = TITLE_AT_LOCATION_RE.exec(title);
    if (at) {
      title = at[1].trim();
      location = at[2].trim();
    }
    if (!title) {
      errors.push({
        line: lineNo,
        raw: trimmed,
        message: "タイトルが空です",
      });
      return;
    }

    items.push({ day, startTime, endTime, title, location });
  });

  return { items, errors };
}
