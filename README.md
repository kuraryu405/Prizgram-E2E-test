# Prizgram E2E Test

Prizgram の本体リポジトリを変更せず、外部からユーザー操作を再現して品質を確認する Playwright E2E リポジトリです。

## 原則

- `kuraryu405/Prizgram` は **読み取り専用の仕様参照先** とする。
- E2E 実装・fixture・証跡・CI はこのリポジトリだけで管理する。
- テスト都合の `data-testid` 追加などを理由に Prizgram 本体へ変更を要求しない。原則として `getByRole` / `getByLabel` / 可視テキストで操作する。
- 本番環境に対する破壊的・状態変更を伴う E2E はデフォルトで禁止する。
- すべての主要シナリオで Playwright の video / trace を保存し、重要ステップはスクリーンショットも証跡として添付する。
- 外部求人 API / LLM など非決定的な依存は、決定論的な critical journey と分離する。

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
15. 求人評価が stale になり、再評価で最新ペルソナが反映されることを確認
16. ダッシュボード・締切・通知・応募一覧に結果が反映されることを確認

詳細は [`docs/SCENARIOS.md`](docs/SCENARIOS.md) を参照してください。

## セットアップ

```bash
corepack enable
pnpm install
pnpm exec playwright install --with-deps chromium
cp .env.example .env
```

`.env` にテスト対象を設定します。

```dotenv
E2E_BASE_URL=http://localhost:3000
E2E_ALLOW_MUTATION=true
```

本番ホスト `prizgram.kuraryu.jp` に対して状態変更シナリオを実行する場合は、さらに明示的な解除が必要です。ただし通常は本番で実行しないでください。

```dotenv
E2E_ALLOW_PRODUCTION=true
```

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

全テストで Playwright trace と video を保存します。重要な操作は `evidenceStep()` を使い、ステップ完了時のスクリーンショットを `testInfo` attachment として残します。

- `artifacts/test-results/` — raw test results / videos / traces
- `playwright-report/` — HTML report
- GitHub Actions — 実行ごとに evidence artifact を upload

運用ルールは [`docs/EVIDENCE.md`](docs/EVIDENCE.md) を参照してください。

## 開発方針

このリポジトリは Issue 駆動で進めます。1 Issue = 1 独立シナリオまたは共通基盤を基本とし、各 Issue の完了条件に「動画・trace・重要ステップの screenshot が取得できること」を含めます。

シナリオ一覧と Issue 分割方針は [`docs/ISSUE-PLAN.md`](docs/ISSUE-PLAN.md) を参照してください。
