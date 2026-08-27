# Prizgram E2E Test

Prizgram の本体リポジトリを変更せず、外部からユーザー操作を再現して品質を確認する Playwright E2E リポジトリです。

## 原則

- `kuraryu405/Prizgram` は **読み取り専用の仕様参照先** とする。
- E2E 実装・fixture・証跡・CI はこのリポジトリだけで管理する。
- テスト都合の `data-testid` 追加などを理由に Prizgram 本体へ変更を要求しない。原則として `getByRole` / `getByLabel` / 可視テキストで操作する。
- 本番環境に対する破壊的・状態変更を伴う E2E はデフォルトで禁止する。
- すべての主要シナリオで **MP4 動画** / Playwright trace を保存し、重要ステップはスクリーンショットも証跡として添付する。
- Playwright内部の録画はWebMだが、正式なレビュー・デモ用成果物は ffmpeg で生成した H.264 MP4 とする。
- 外部求人 API / LLM など非決定的な依存は、critical journey と分離して障害原因を判別できるようにする。

## テスト層

| 層 | 目的 | 状態変更 | 外部依存 |
| --- | --- | --- | --- |
| `smoke` | 公開画面・主要導線の死活確認 | なし | 最小 |
| `critical` | 登録から選考フィードバックまでの主要ユーザージャーニー | あり | 可能な限り抑制 |
| `integration` | 求人探索・AI生成など外部依存を含む機能確認 | あり | あり |
| `mobile` | モバイル AppShell / ナビゲーション / 主要フォーム | 原則なし | 最小 |

## 想定する Golden Journey

1. 新規登録
2. ペルソナ6問ヒアリング
3. ペルソナ生成・表示
4. 求人票の手動取り込み
5. 求人詳細確認・3軸評価
6. 求人から応募作成
7. 応募ステータス・段階・次アクション更新
8. 締切登録
9. ES書類作成、設問追加、AI候補探索、下書き、編集、添削、提出
10. 面接想定質問、回答骨子、深掘り生成
11. 面接後振り返り保存
12. 選考結果の登録
13. 選考結果と振り返りからペルソナ更新案を生成
14. ユーザー承認後にペルソナ version が更新されることを確認
15. 求人を最新ペルソナで再評価
16. ダッシュボード・締切・通知・応募一覧に結果が反映されることを確認

最終受入では、この一連の操作を **1本の MP4** として残します。

詳細は [`docs/SCENARIOS.md`](docs/SCENARIOS.md) を参照してください。

## セットアップ

Node.js 22+、pnpm、ffmpeg が必要です。

```bash
corepack enable
pnpm install
pnpm exec playwright install --with-deps chromium
ffmpeg -version
cp .env.example .env
```

`.env` にテスト対象を設定します。

```dotenv
E2E_BASE_URL=http://localhost:3000
E2E_ALLOW_MUTATION=true
```

mutable E2E は localhost / disposable / staging / preview 環境を使用してください。GitHub Actions の mutable workflow は `prizgram.kuraryu.jp` を明示的に拒否します。

## 実行

```bash
pnpm test:smoke
pnpm test:critical
pnpm test:integration
pnpm test:mobile
pnpm test:e2e
```

UI を見ながら確認する場合:

```bash
pnpm test:ui
```

## 証跡

通常の `pnpm test:*` は Playwright 実行後に WebM を H.264 MP4 へ自動変換します。

- `artifacts/test-results/**/*.mp4` — 正式なレビュー/デモ動画
- `artifacts/test-results/**/evidence/*.png` — 主要 checkpoint
- `artifacts/test-results/**/trace.zip` — Playwright trace
- `artifacts/test-results/**/*.webm` — HTML report互換用 raw video
- `playwright-report/` — HTML report
- GitHub Actions `evidence-mp4-*` — MP4 + PNG のレビュー用 artifact
- GitHub Actions `playwright-debug-*` — trace / raw video / report の調査用 artifact

運用ルールは [`docs/EVIDENCE.md`](docs/EVIDENCE.md) を参照してください。

## CI

- `E2E Smoke Evidence` — push / PR で read-only smoke を実行。productionへの状態変更なし。
- `Manual Mutable E2E` — workflow_dispatch のみ。disposable / staging / preview URLを指定して `critical` / `integration` / `mobile` / `all` を選択。

## 開発方針

このリポジトリは Issue 駆動で進めます。1 Issue = 1 独立シナリオまたは共通基盤を基本とし、各 Issue の完了条件に「MP4・trace・重要ステップの screenshot が取得できること」を含めます。

シナリオ一覧と Issue 分割方針は [`docs/ISSUE-PLAN.md`](docs/ISSUE-PLAN.md) を参照してください。
