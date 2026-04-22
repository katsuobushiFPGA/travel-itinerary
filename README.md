# 旅のしおり (departure)

ローカルで動く「旅のしおり」アプリ。複数の旅行を管理でき、各旅行ごとに参加メンバー・旅程スケジュール・持ち物リストを扱える。

認証なし・単一ユーザ前提のローカルアプリ。

## 機能

- **しおり (Trip) 管理**: 複数のしおりを作成・編集・削除。タイトル・目的地・期間・メモを保持。
- **参加メンバー**: メンバーの氏名・役割 (運転担当など)・連絡先を登録。
- **旅程スケジュール**: 日別タイムライン。開始/終了時刻 (HH:mm) ・タイトル・場所・メモ。
- **持ち物リスト**: カテゴリ別グルーピング、担当者、数量、チェックボックスで荷造り状況を管理。
- **サマリー**: しおり概要タブで参加メンバー/旅程/持ち物の件数を一望。

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
│   ├── layout.tsx                         # 共通ヘッダ + Toaster
│   ├── page.tsx                           # しおり一覧
│   └── trips/[tripId]/
│       ├── layout.tsx                     # Trip ヘッダ + タブナビ
│       ├── page.tsx                       # 概要 (サマリー + メモ)
│       ├── itinerary/page.tsx             # 日別タイムライン
│       ├── packing/page.tsx               # 持ち物チェックリスト
│       └── members/page.tsx               # メンバー一覧
├── components/
│   ├── ui/                                # shadcn/ui (Base UI)
│   ├── trip-*.tsx                         # Trip 用フォーム/カード
│   ├── itinerary/                         # 旅程 UI
│   ├── packing/                           # 持ち物 UI
│   └── members/                           # メンバー UI
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

- `Trip`: title / destination / startDate / endDate / memo
- `Member`: name / role / contact
- `ItineraryItem`: dayIndex (1-origin) / startTime ("HH:mm") / endTime / title / location / note / sortOrder
- `PackingItem`: name / category / owner / quantity / checked / sortOrder

## 実装上のメモ

- **Prisma 7 + driver adapter**: `better-sqlite3` を adapter 経由で渡す必要がある (`new PrismaClient({ adapter })`)。`lib/db.ts` 参照。
- **Server Actions**: `"use server"` 指定されたファイル内の export は**すべて async 関数**でなければならない (Next.js 16)。フォーム値のパースヘルパ `parseXxxForm` も例外ではなく、呼び出し側で `await` が必須。
- **Base UI の checkbox**: `@base-ui/react` の Checkbox は表示用要素と hidden input の 2 層構造。Playwright で操作する際は表示側 (`[checked]` を持つロール要素) をクリックする。
- **日付扱い**: SQLite の `DateTime` は内部的に文字列なので、UI では `toISOString().slice(0,10)` で `yyyy-MM-dd` 部分のみ扱う。

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

DB に触れる部分 (Prisma 呼び出し) は単体テスト対象外。`npm run dev` + ブラウザ、または Prisma Studio で検証する。
