# 旅のしおり (departure)

ローカルで動く「旅のしおり」アプリ。複数の旅行を管理でき、各旅行ごとに参加メンバー・旅程スケジュール・持ち物リストを扱える。

認証なし・単一ユーザ前提のローカルアプリ。

## 機能

- **しおり (Trip) 管理**: 複数のしおりを作成・編集・削除。タイトル・目的地・期間・メモ・カバー画像・日別カバー画像を保持。
- **参加メンバー**: メンバーの氏名・役割 (運転担当など)・連絡先を登録。
- **旅程スケジュール**: 日別タイムライン。開始/終了時刻 (HH:mm) ・タイトル・場所・URL・メモ・マップ座標 (mapX/mapY)。各行のグリップハンドルから dnd-kit のドラッグで同一日内・他の日への移動に対応（並び順は `sortOrder`、所属日は `dayIndex` に保存）。空の日のセクションへもドロップできる。
- **持ち物リスト**: カテゴリ別グルーピング、担当者、数量、チェックボックスで荷造り状況を管理。各カテゴリ内のアイテムは dnd-kit のドラッグで並び替え可能（カテゴリ移動は編集ダイアログで）。
- **サマリー**: しおり概要タブと一覧カードで参加メンバー/旅程/持ち物の件数を一望。持ち物は「X / Y 完了 (Z%)」と進捗バーを表示し、100% で緑になる。
- **共有しおり (`/s/<token>`)**: トークン発行で第三者と共有可能。フルブリードのカバー画像ヒーロー（カバー未設定時はアクセントグラデにフォールバック）+ タイムライン型アコーディオン + 日色分けの sticky マップ + NOW/NEXT 案内チップを備えたモバイル最適化ビュー。持ち物セクションは閲覧専用で `☑/□` のチェック状態と「X / Y 完了」進捗を表示する。共有リンクは `公開停止 / 公開再開` トグルで URL を維持したまま閲覧を遮断でき、`URLを削除` で完全に無効化（再発行は別 URL）。`@media print` で全セクション展開＋マップ非表示の印刷スタイルに切り替わる。
- **マップ座標エディタ**: 旅程アイテムごとに SVG プレビュー上をクリックしてピンを配置。共有しおり側のマップに反映され、ピンタップで対応する行へスクロールする。
- **テキストで一括追加**: 旅程画面の「テキストで一括追加」ダイアログに `Day N` ヘッダ + `HH:MM[-HH:MM] タイトル @場所` 形式の複数行を貼り付けて、1 リクエストで最大 500 件まで作成。プレビューで件数とエラー行が見える。持ち物画面でも同様に `# カテゴリ名` ヘッダ + `名前 [xN|×N] [@担当者]` の複数行を貼り付け、最大 500 件まで一括追加できる。
- **ロケーション autocomplete**: 旅程アイテムの「場所」入力で 2 文字以上タイプすると Nominatim (OpenStreetMap) を引いて候補を 5 件まで表示。↑↓ + Enter で選択。
- **エクスポート**: 旅程画面のヘッダから `.ics` (iCalendar) と `.csv` の 2 形式で旅程をダウンロード。iCal は floating time + 1 イベント=1 旅程アイテム、CSV は UTF-8 BOM 付き（Excel 互換）。`/api/trips/<tripId>/export?format=ical|csv` の Route Handler 経由。

## 技術スタック

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui (Base UI ベース) + sonner
- Prisma 7 + better-sqlite3 (driver adapter)
- Server Actions によるミューテーション
- Zod によるフォーム/Server Action バリデーション
- Vitest + @testing-library/react による単体テスト

## セットアップ

### 必要なもの

- Node.js 24 LTS (`.nvmrc` に従う場合は推奨)
- npm 10 以上

### インストールと初期化

```bash
npm install
npx prisma migrate dev    # SQLite DB (prisma/dev.db) を作成
```

Prisma Client は `postinstall` で自動生成される (`lib/generated/prisma/`)。

### 開発サーバ起動

```bash
npm run dev
```

`http://localhost:3000` を開く。

## スクリプト

| コマンド | 用途 |
| --- | --- |
| `npm run dev` | 開発サーバ (Turbopack) |
| `npm run build` | 本番ビルド |
| `npm run start` | 本番サーバ起動 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest で単体テスト実行 |
| `npm run test:watch` | Vitest watch モード |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:studio` | Prisma Studio を開く |
| `npm run db:generate` | Prisma Client 再生成 |

## ディレクトリ構成

```
departure/
├── app/
│   ├── (app)/                             # 編集向けルートグループ
│   │   ├── layout.tsx                     # 共通ヘッダ + Toaster
│   │   ├── page.tsx                       # しおり一覧
│   │   └── trips/[tripId]/
│   │       ├── layout.tsx                 # Trip ヘッダ + タブナビ
│   │       ├── page.tsx                   # 概要 (サマリー + メモ)
│   │       ├── itinerary/page.tsx         # 日別タイムライン
│   │       ├── packing/page.tsx           # 持ち物チェックリスト
│   │       └── members/page.tsx           # メンバー一覧
│   ├── (share)/                           # 共有向けルートグループ
│   │   ├── layout.tsx                     # Yomogi / Kaisei Decol フォント読み込み
│   │   └── s/[token]/page.tsx             # 共有しおり (BookletV4)
│   └── globals.css                        # Tailwind v4 + V4 用キーフレーム/print 制御
├── components/
│   ├── ui/                                # shadcn/ui (Base UI)
│   ├── trip-*.tsx                         # Trip 用フォーム/カード/共有リンク
│   ├── itinerary/                         # 旅程 UI (MapCoordPicker を含む)
│   ├── packing/                           # 持ち物 UI
│   ├── members/                           # メンバー UI
│   └── booklet/                           # 共有しおり (BookletV4 / BookletMap / 印刷ボタン)
├── lib/
│   ├── db.ts                              # PrismaClient シングルトン (adapter)
│   ├── validators.ts                      # Zod スキーマ (全ドメイン)
│   ├── date-utils.ts                      # 期間・日数計算
│   ├── actions/                           # Server Actions (trip/itinerary/packing/members)
│   ├── generated/prisma/                  # Prisma Client (自動生成)
│   └── __tests__/                         # Vitest テスト
├── prisma/
│   ├── schema.prisma                      # Trip/Member/ItineraryItem/PackingItem
│   └── migrations/                        # マイグレーション履歴
└── AGENTS.md                              # 参照すべき Next.js 内部ドキュメント注意
```

## データモデル

`prisma/schema.prisma` に 4 モデルを定義。`Trip` を親に `Member` / `ItineraryItem` / `PackingItem` が `onDelete: Cascade` で紐づく。

- `Trip`: title / destination / startDate / endDate / memo / coverImage / dayCoverImages (JSON 文字列) / shareToken / shareEnabled (公開停止フラグ)
- `Member`: name / role / contact
- `ItineraryItem`: dayIndex (1-origin) / startTime ("HH:mm") / endTime / title / location / url / note / mapX / mapY / sortOrder
- `PackingItem`: name / category / owner / quantity / checked / sortOrder

`mapX` / `mapY` は SVG ユーザー座標 (viewBox `0 0 100 75`) で保存する。両方指定されていない場合はマップ非表示。

## 実装上のメモ

- **Prisma 7 + driver adapter**: `better-sqlite3` を adapter 経由で渡す必要がある (`new PrismaClient({ adapter })`)。`lib/db.ts` 参照。
- **Server Actions**: `"use server"` 指定されたファイル内の export は**すべて async 関数**でなければならない (Next.js 16)。フォーム値のパースヘルパ `parseXxxForm` も例外ではなく、呼び出し側で `await` が必須。
- **Base UI の checkbox**: `@base-ui/react` の Checkbox は表示用要素と hidden input の 2 層構造。Playwright で操作する際は表示側 (`[checked]` を持つロール要素) をクリックする。
- **日付扱い**: SQLite の `DateTime` は内部的に文字列なので、UI では `toISOString().slice(0,10)` で `yyyy-MM-dd` 部分のみ扱う。
- **共有しおり (BookletV4)**: `app/(share)` 配下は専用ルートグループで、Yomogi / Kaisei Decol を Google Fonts CSS 経由で読み込む。`CoverHero` は `<img>` 背景 + 暗グラデオーバーレイで構成し、`@media print` 時にも `print-color-adjust: exact` でグラデを残す。アコーディオンは `max-height` 遷移 (0.36s)。ピンクリックでセクションを開いてから 380ms 待ってスクロール (transition 完了後)。`prefers-reduced-motion` は遅延 0ms に短絡。
- **マップ座標系**: `mapX` ∈ [0, 100], `mapY` ∈ [0, 75]。`MapCoordPicker` は `preserveAspectRatio="xMidYMid meet"` のレターボックスを補正してクリック位置を SVG ユーザー座標に変換する。
- **Nominatim 利用ポリシー**: `searchPlaces` Server Action は OSM Nominatim (1 req/s, User-Agent 必須) を呼ぶ。`LocationCombobox` は 350ms debounce + stale 応答破棄でクライアント側のリクエストを抑制している。さらにサーバ側で `TtlLruCache`（プロセスローカル、最大 256 クエリ・TTL 10 分）を持ち、同一クエリの再呼び出しを Nominatim まで届かせない。一過性のネットワークエラー応答はキャッシュせず次回再試行する。本番運用で同時利用者が増える場合は Vercel Runtime Cache などプロセス越境のキャッシュかセルフホスト Nominatim への切替を検討する。
- **旅程の並び替え**: `app/(app)/trips/[tripId]/itinerary/page.tsx` の取得は `dayIndex → sortOrder → startTime → id` で並べる。新規追加時は `nextDaySortOrder` で同日の末尾値+1 を採番し、ドラッグ後はその日のアイテム全てを 0..N で再採番する Server Action `reorderItineraryItems` を呼ぶ。`ItineraryDayList` は楽観的更新 + 失敗時ロールバック、`useTransition` で pending 中の二重操作を抑制する。

## Agent Teams 実装ログ

本プロジェクトは Claude Code の Agent Teams 機能 (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) を使い、機能ドメイン別に 3 つの子エージェントで並列実装した。

1. 親エージェントが scaffold・Prisma schema・共通 validators・Trip CRUD・layouts を先に整備。
2. Itinerary / Packing / Members の 3 チームを並列起動し、各自が担当ドメインのみ編集。
3. 親がすべての worktree をマージし、型チェック・テスト・ビルド・Playwright による統合動作確認を実施。

各機能のコミットは `git log --oneline` で機能単位に分割されている。

## テスト

```bash
npm test
```

- `lib/__tests__/validators.test.ts` : Zod スキーマの網羅テスト
- `lib/__tests__/date-utils.test.ts` : 日付ヘルパ
- `lib/__tests__/members-actions.test.ts` : `parseMemberForm`
- `lib/__tests__/packing-actions.test.ts` : `parsePackingForm`
- `lib/__tests__/itinerary-actions.test.ts` : `parseItineraryForm`
- `lib/__tests__/itinerary-parser.test.ts` : 旅程の一括入力テキストパーサ
- `lib/__tests__/packing-parser.test.ts` : 持ち物の一括入力テキストパーサ
- `lib/__tests__/places-cache.test.ts` : Nominatim 結果キャッシュ (TTL + LRU)
- `lib/__tests__/places-actions.test.ts` : `searchPlaces` のキャッシュ・並行 dedup・エラー時挙動
- `lib/__tests__/itinerary-reorder-cross-day.test.ts` : 旅程の day 跨ぎ並び替え `reorderItineraryItemsCrossDay` の集合一致・dayIndex 範囲・$transaction フォールバック
- `lib/__tests__/packing-reorder.test.ts` : `reorderPackingItems` の同等チェック（カテゴリ単位）
- `lib/__tests__/itinerary-ical.test.ts` : iCal エクスポートの整形・URL インジェクション防止
- `lib/__tests__/itinerary-csv.test.ts` : CSV エクスポートの quote/escape
- `lib/__tests__/export-route.test.ts` : `/api/trips/[tripId]/export` の Route Handler
- `lib/__tests__/trip-filter.test.ts` : Trip 一覧の検索・status 絞り込みヘルパ
- `lib/__tests__/share-toggle.test.ts` : `pauseShare` / `resumeShare` の正常系・例外系
- `lib/__tests__/packing-progress.test.ts` : 進捗計算の純関数（クランプ・四捨五入・完了判定）
- `components/__tests__/packing-progress-bar.test.tsx` : `PackingProgressBar` の a11y / クラス挙動

DB に触れる部分 (Prisma 呼び出し) は単体テスト対象外。`npm run dev` + ブラウザ、または Prisma Studio で検証する。
