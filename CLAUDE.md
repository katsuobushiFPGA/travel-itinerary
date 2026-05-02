@AGENTS.md

## プロジェクト規約

### バリデータ（Zod）のメッセージ

`lib/validators.ts` の Zod スキーマでは、ユーザーに見える可能性のある制約（`min` / `max` / `regex` / `refine`）には**必ず日本語メッセージを付与**する。

- 一括追加系の Server Action はパース結果を再検証してエラー文をそのまま toast に表示するため、メッセージ未指定だと英語のデフォルト文（例: `Too big: expected string to have <=50 characters`）が画面に出る。
- 既存メッセージのトーンは「○○してください」「N 文字以内で入力してください」「N 以上を指定してください」で揃える。

### 一括テキスト追加（bulk paste）パターン

旅程と持ち物に同形のテキスト一括追加機能がある。新しいドメインで同等の機能を追加する場合は次の構成を踏襲する。

| 役割 | 例 |
| --- | --- |
| パーサ（純関数） | `lib/itinerary-parser.ts`, `lib/packing-parser.ts` |
| パーサのテスト | `lib/__tests__/{domain}-parser.test.ts` |
| Server Action | `lib/actions/{domain}.ts` の `create{Domain}ItemsBulk` |
| ダイアログ UI | `components/{domain}/{domain}-bulk-add-dialog.tsx` |

実装上の決まりごと:

- 上限件数は `MAX_BULK_{DOMAIN}_ITEMS` という定数でパーサモジュールから export し、UI と Server Action の両方で参照する（マジックナンバーの二重管理禁止）。
- パーサは `{ items, errors }` を返す純関数にして、`useMemo` でリアルタイムプレビュー → 件数とエラー行を描画する。
- Server Action 側ではパース結果を必ず Zod スキーマで再検証し、最初のエラーを `failedLine` 付きで返す（クライアントのパーサをバイパスした直接呼び出しに備える）。
- `createMany` の前に既存件数を `count()` してから `sortOrder = base + index` で連番を振る（ローカル単一ユーザー前提のため race は許容）。
- フォーマットの曖昧さは「行内に同じセパレータが 2 回出たらエラー」の形でプリチェックして無音のデータ破壊を避ける（例: `packing-parser.ts` の `\s+@` 多重チェック）。

## 開発時のお作法

- 実装後は `npm run typecheck` と `npm test` を回してから code-reviewer を起動する（グローバル CLAUDE.md のループに従う）。
- UI 機能を変更したら `npm run dev` + Playwright MCP で代表ユースケースを 1 度通す。テストデータを差し込んだ場合はコミット前に `dev.db` から削除する。
- コミットは機能単位・作業単位で分割する（parser → action+UI → 横断的な fix → docs の順が現状の慣習）。コミットメッセージは `feat(domain): ...` / `fix(domain): ...` / `docs(readme): ...` のスタイル。
