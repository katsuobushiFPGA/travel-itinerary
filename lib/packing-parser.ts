// 一括入力で 1 度に登録できる最大件数。Server Action と UI の両方で参照する。
export const MAX_BULK_PACKING_ITEMS = 500;

// 一括入力テキストをパースして PackingItem の元データに変換するヘルパー。
//
// 想定フォーマット:
//   # 衣類
//   Tシャツ x3
//   パーカー
//
//   # 電子機器
//   モバイルバッテリー
//   スマホ充電器 x2 @太郎
//
// - "# カテゴリ名" 行はそれ以降のアイテムのカテゴリを切り替える（先頭未指定なら未分類）。
// - 各アイテム行は「名前 [xN|×N] [@担当者]」の形式。順序は xN → @担当者 を推奨。
//   末尾から ` @owner` → ` xN` の順で剥がしていく実装なので、`名前 @owner xN` のように
//   逆順で書くと owner 側に xN が含まれてしまう。
// - 数量を省略した場合は 1。

export type ParsedPackingLine = {
  category?: string;
  name: string;
  quantity: number;
  owner?: string;
};

export type ParsedPackingError = {
  line: number;
  raw: string;
  message: string;
};

export type ParsedPackingResult = {
  items: ParsedPackingLine[];
  errors: ParsedPackingError[];
};

const HEADER_RE = /^#\s+(.+)$/;
const OWNER_RE = /^(.+)\s+@(\S.*)$/;
const QUANTITY_RE = /^(.+)\s+[xX×](\d+)$/;

export function parseBulkPacking(text: string): ParsedPackingResult {
  const items: ParsedPackingLine[] = [];
  const errors: ParsedPackingError[] = [];
  let category: string | undefined;
  const lines = text.split(/\r?\n/);

  lines.forEach((raw, idx) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const lineNo = idx + 1;

    if (trimmed === "#") {
      errors.push({
        line: lineNo,
        raw: trimmed,
        message: "カテゴリ名が空です",
      });
      return;
    }

    const headerMatch = HEADER_RE.exec(trimmed);
    if (headerMatch) {
      const headerName = headerMatch[1].trim();
      if (!headerName) {
        errors.push({
          line: lineNo,
          raw: trimmed,
          message: "カテゴリ名が空です",
        });
        return;
      }
      category = headerName;
      return;
    }

    if (trimmed.startsWith("@")) {
      errors.push({
        line: lineNo,
        raw: trimmed,
        message: "名前が空です",
      });
      return;
    }

    // OWNER_RE は greedy なため、` @` が複数ある行ではどちらを担当者として
    // 切り出すかが曖昧になり、名前と担当者の境界が崩れる。明示的にエラーで弾く。
    const ownerSeparators = trimmed.match(/\s+@/g);
    if (ownerSeparators && ownerSeparators.length > 1) {
      errors.push({
        line: lineNo,
        raw: trimmed,
        message: "@担当者 は 1 行に 1 つまでです",
      });
      return;
    }

    let rest = trimmed;
    let owner: string | undefined;
    const ownerMatch = OWNER_RE.exec(rest);
    if (ownerMatch) {
      rest = ownerMatch[1].trim();
      owner = ownerMatch[2].trim();
    }

    let quantity = 1;
    const qtyMatch = QUANTITY_RE.exec(rest);
    if (qtyMatch) {
      const n = Number(qtyMatch[2]);
      if (!Number.isFinite(n) || n < 1 || n > 9999) {
        errors.push({
          line: lineNo,
          raw: trimmed,
          message: "数量は 1〜9999 で指定してください",
        });
        return;
      }
      rest = qtyMatch[1].trim();
      quantity = n;
    }

    const name = rest;
    if (!name) {
      errors.push({
        line: lineNo,
        raw: trimmed,
        message: "名前が空です",
      });
      return;
    }

    items.push({ category, name, quantity, owner });
  });

  return { items, errors };
}
