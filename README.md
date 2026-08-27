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
- AI/LLM生成結果は処理時間だけを理由に失敗させない。通常の画面操作・navigation・非AI assertion は有限timeoutのまま、AI結果待ちだけ無期限とする。
- browser console warning/error、page error、failed request は各テストの `browser-diagnostics.json` に残す。

## テスト層

| 層 | 目的 | 状態変更 | 外部依存 |
| --- | --- | --- | --- |
| `smoke` | 公開画面・主要導線の死活確認 | なし | 最小 |
| `critical` | 登録・Persona・求人・応募・締切・ES等の決定論的な主要機能 | あり | 可能な限り抑制 |
| `integration` | 求人探索・AI生成・Persona feedback・reminder等 | あり | あり |
| `mobile` | 320〜390pxのAppShell / ナビ / 求人 / 応募 / ES / 面接workspace | あり | 求人構造化等 |
| `acceptance` | 全製品ストーリーを1本の動画で通すGolden Journey | あり | AI/LLMあり |

## Golden Journey

`tests/acceptance/golden-journey.spec.ts` は次を **1テスト / 1録画** で通します。

1. 新規登録
2. 6問ヒアリングから Persona v1
3. synthetic求人の手動取り込み
4. 根拠付き3軸評価
5. 求人から応募作成・面接フェーズ更新
6. ES締切登録
7. 手動ES作成・編集・提出
8. ES AI: 経験候補 → 下書き → 人間編集 → 保存 → AI添削
9. 面接AI: 想定質問 → 回答骨子 → 深掘り
10. 面接後振り返り保存・reload永続化
11. 選考結果（落選）登録
12. Persona更新案生成
13. 承認前は Persona v1 のままを別タブ確認
14. 明示承認後 Persona v2 作成
15. 保存求人を再評価
16. dashboardへ結果反映
17. logout / re-login後の永続化確認

正式成果物は H.264 MP4、checkpoint PNG、trace、browser diagnostics です。

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

mutable E2E は localhost / disposable / staging / preview 環境を使用してください。`prizgram.kuraryu.jp` はproduction hostnameとしてデフォルト拒否されます。

Reminder生成まで確認する場合だけ、Prizgram本体のローカルcheckoutと同じdisposable DBを指定します。本体コードは変更せず既存の `apps/web/scripts/run-reminders.ts` を呼びます。

```dotenv
E2E_PRIZGRAM_REPO=/absolute/path/to/Prizgram
E2E_DATABASE_URL=...
```

## 実行

```bash
pnpm test:smoke
pnpm test:critical
pnpm test:integration
pnpm test:mobile
pnpm test:golden
pnpm test:e2e
```

UI を見ながら確認する場合:

```bash
pnpm test:ui
```

## AI待ちのtimeout方針

`src/support/timeouts.ts` の `AI_RESULT_TIMEOUT = 0` をAI結果待ちに使用しています。またPlaywrightのtest全体のduration capも外しています。

一方で次は有限のままです。

- browser action: 20秒
- navigation: 30秒
- 通常のexpect: 15秒

そのため、普通のselector破綻やnavigation failureは検知しつつ、LLMが数分以上かかってもtimeout failureにはしません。

## 証跡

通常の `pnpm test:*` は Playwright 実行後に WebM を H.264 MP4 へ自動変換します。録画が0本のskip-only runではffmpegを要求せず正常に終了します。

- `artifacts/test-results/**/*.mp4` — 正式なレビュー/デモ動画
- `artifacts/test-results/**/evidence/*.png` — 主要 checkpoint
- `artifacts/test-results/**/trace.zip` — Playwright trace
- `artifacts/test-results/**/browser-diagnostics.json` — console/pageerror/requestfailed診断
- `artifacts/test-results/**/*.webm` — HTML report互換用 raw video
- `playwright-report/` — HTML report

運用ルールは [`docs/EVIDENCE.md`](docs/EVIDENCE.md) を参照してください。

## GitHub Actions

Actions利用枠が使えない期間にpushごとの失敗runを増やさないため、現在は **自動実行しません**。

- `E2E Smoke Evidence` — `workflow_dispatch` のみ。read-only smoke。
- `Manual Mutable E2E` — `workflow_dispatch` のみ。disposable / staging / preview URLを指定して `critical` / `integration` / `mobile` / `golden` / `all` を選択。

Actionsが使えない間もローカル実行は完全に独立しており、上記 `pnpm test:*` で同じMP4/trace/diagnosticsを生成できます。

## 開発方針

このリポジトリは Issue 駆動で進めます。1 Issue = 1 独立シナリオまたは共通基盤を基本とし、各 Issue の完了条件に「MP4・trace・重要ステップの screenshot が取得できること」を含めます。

コード実装が終わっていても、実際の対象環境でテストを通して証跡が生成されるまではIssueを完了扱いにしません。

シナリオ一覧と Issue 分割方針は [`docs/ISSUE-PLAN.md`](docs/ISSUE-PLAN.md) を参照してください。
