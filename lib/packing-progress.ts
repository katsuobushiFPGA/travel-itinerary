// 持ち物のチェック状況をパーセンテージ込みで扱うための純関数。
// Trip 一覧のカード、概要ページ、共有しおりなど複数箇所から呼ばれる前提で
// UI には依存しない計算ロジックだけここに集める。

export type PackingProgress = {
  total: number;
  checked: number;
  percent: number; // 0..100
};

export function packingProgress(
  checked: number,
  total: number,
): PackingProgress {
  const safeTotal = Math.max(0, total);
  const safeChecked = Math.max(0, Math.min(checked, safeTotal));
  if (safeTotal === 0) {
    return { total: 0, checked: 0, percent: 0 };
  }
  return {
    total: safeTotal,
    checked: safeChecked,
    percent: Math.round((safeChecked / safeTotal) * 100),
  };
}

export function formatPackingProgress(p: PackingProgress): string {
  if (p.total === 0) return "持ち物なし";
  return `${p.checked} / ${p.total} 完了 (${p.percent}%)`;
}
