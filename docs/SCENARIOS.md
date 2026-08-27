# E2E Scenario Catalog

この文書は `kuraryu405/Prizgram` の `main` をコードベースで追跡して作成した E2E シナリオ仕様です。

- 現在の基準 commit: `119c15edd9f8fe4ca241e70437e7e1089e16268c`
- 初期棚卸し commit: `49e4c4fce27507773a8e872bb4fdb63b04b781b7`
- その間の差分は求人探索系のみで、S04は最新provider件数/状態UIへ追従済み

Prizgram 本体には E2E 都合の変更を加えません。画面操作は原則として role / label / visible text を使います。

## 共通fixture

各 mutable scenario は衝突しない一意な synthetic user を作成します。

- login ID: `e2e-<scenario>-<timestamp/random>`
- password: E2E fixture 内で生成するテスト専用値
- Persona回答: `src/fixtures/persona.ts`
- 手動求人: `src/fixtures/job.ts`

Persona fixture は求人候補が狭くなりすぎない汎用 Web / Software Engineer 志望とし、実在人物のプロフィールを再現しません。実在企業への応募操作も行いません。

## 証跡ルール

各 scenario は可能な限り次を残します。

- 正式動画: H.264 MP4
- Playwright trace: `trace.zip`
- checkpoint: PNG screenshot
- `browser-diagnostics.json`
- Playwright HTML report

`evidenceStep()` はクリック直後ではなく、ユーザーが結果を認識できる状態で撮影します。

## AI / LLM wait policy

AI生成に時間がかかったこと自体をtimeout failureにしません。

- AI結果待ち: `AI_RESULT_TIMEOUT = 0`
- test全体duration cap: なし
- ordinary action: 20秒
- navigation: 30秒
- ordinary assertion: 15秒

AI本文のexact matchはしません。非空、構造、根拠、文字数、保存状態、Human-in-the-loop境界をassertします。

---

## S00 Public Smoke

層: `smoke`

目的: 状態を変更せず公開導線が生きていることを確認する。

操作:
1. `/`
2. キャッチコピー / `Prizgramをはじめる`
3. `/register` の登録フォーム
4. `/login` のログインフォーム

完了条件:
- 主要ページが5xxにならない
- CTA destinationが正しい
- 必須input/buttonが表示される

---

## S01 Authentication & Account Lifecycle

層: `critical`

操作:
1. synthetic user新規登録
2. `/app`
3. `/app/profile`
4. password変更
5. logout
6. 旧password login失敗
7. 新password login成功
8. logout後に保護ページへ直接アクセスしlogin redirect確認

主証跡: dashboard / profile / password変更 / logout / login / guard。

---

## S02 Persona Intake & Generation

層: `critical`（生成処理はAI待ちpolicy対象）

操作:
1. `/app/persona`
2. ヒアリング開始
3. スキル
4. 経験
5. 強み
6. 弱み
7. 価値観
8. 志向
9. Persona生成
10. Persona v1詳細

検証:
- `1 / 6` → `6 / 6`
- version 1 / v1
- スキル / 経験 / 強み / 弱み / 価値観 / 志向
- 根拠
- version履歴

---

## S03 Manual Job Import, Detail, Scoring, Versioning & Archive

層: `critical`（求人構造化・評価はAI待ちpolicy対象）

操作:
1. synthetic求人票を手動取り込み
2. 求人詳細
3. 本文 / 要件 / 歓迎スキル / 文化・価値観 / 難易度 / 出典
4. 3軸評価
5. 各軸の0–100 score / reason / evidence ID+text
6. 求人本文を更新し新version追加
7. stale表示
8. 再評価
9. archive
10. archived list
11. restore

3軸:
- スキル適合
- 文化・価値観フィット
- 難易度ギャップ

---

## S04 External Job Discovery

層: `integration`

操作:
1. Persona作成
2. 求人探索フォーム
3. filter設定 → reset
4. Personaのみで探索
5. `検索結果 N件`
6. `求人取得元` の provider summary を確認
7. 候補0件なら `software engineer` で再探索
8. 候補があれば単一取り込み
9. candidate 3軸評価
10. `根拠を見る`
11. 残り候補をbulk import

最新mainのprovider summary対象:
- Careerjet
- Himalayas
- Jobicy

注意:
- 0件はPRODUCT_BUGと断定しない
- partial outage / rate limit / provider failureはdiagnosticsで原因分離する
- 候補タイトルや順番を固定しない
- candidate UIの表示名は `カルチャー適合`

---

## S05 Application Lifecycle

層: `critical`

操作:
1. synthetic求人から応募作成
2. 応募時求人snapshot表示
3. 現在求人に戻り `応募済み — 詳細を見る` を確認
4. 二重応募作成導線がないことを確認
5. `保存済み → 書類選考`
6. stage / next action / note更新
7. `書類選考 → 面接`
8. selection timeline
9. interview status filter

検証:
- pinned snapshot説明
- duplicate guard
- `更新しました。`
- timeline sequence

---

## S06 Deadline Lifecycle & Dashboard Reflection

層: `critical`

操作:
1. 応募詳細から締切管理
2. ES締切を相対日時で登録
3. 一次面接予定を別deadlineとして登録
4. 今後の締切
5. 応募詳細に両方表示
6. dashboard `直近の締切` に両方表示
7. ES締切edit
8. complete
9. completed section
10. restore
11. delete

時刻は Asia/Tokyo 基準で実行時刻から相対生成します。

---

## S07 Application Documents / ES Manual Flow

層: `critical`

操作:
1. 応募詳細 `応募書類 / ES`
2. 書類作成
3. title変更
4. 設問 / 回答追加
5. 回答編集
6. `ユーザー編集` provenance
7. 提出済みにする
8. submitted状態ではtextarea disabled / 設問追加不可

---

## S08 ES AI Assistance

層: `integration`

操作:
1. AI用ES document作成
2. 設問 + 400文字制限
3. 経験候補探索
4. candidateの関連 / 根拠 / evidence表示
5. candidate選択
6. AI draft
7. 人間がtextarea編集
8. 400文字境界確認
9. documentへ `AI生成` として保存
10. 保存後にユーザー編集しprovenance変更
11. AI添削
12. 添削案表示

AI処理は無期限待機。本文の完全一致はしない。

---

## S09 Interview Preparation & Reflection

層: `integration`

操作:
1. current stage = 一次面接
2. 想定質問生成
3. 最初の質問で `意図 / 根拠 / 使えそうな材料` を確認
4. 回答骨子生成
5. outline points / evidence確認
6. 深掘り生成
7. follow-up最低1問確認
8. 実際の質問 / 回答要点 / 感触 / feedback入力
9. reflection保存
10. reload後も永続化

AI処理は無期限待機。質問文や回答本文のexact matchはしない。

---

## S10 Persona Feedback Loop

層: `integration`

前提:
- Persona v1
- 評価済み求人
- 応募 / selection timeline
- interview reflection

操作:
1. `/app/persona/update`
2. 対象応募選択
3. reflection memo
4. update proposal生成
5. `提案は自動確定されません` を確認
6. 別タブでPersona v1維持を確認
7. `承認して新バージョンを作成`
8. Persona v2
9. 保存求人re-evaluation
10. 残件があれば続行
11. 全件完了
12. 求人詳細でfresh score確認

重要境界: proposalだけではPersonaを書き換えず、ユーザー明示承認後のみversionが増える。

---

## S11 Reminders

層: `integration`

操作:
1. minimal application作成
2. 30時間後のdocument deadline作成
3. local Prizgram checkoutの既存 `apps/web/scripts/run-reminders.ts` を変更せず実行
4. `/app/reminders`
5. priority / message / 検知時刻
6. dismiss
7. reload後もactive listから消える

必要環境:
- `E2E_PRIZGRAM_REPO`
- `E2E_DATABASE_URL` または `DATABASE_URL`

環境がなければ明示skipし、critical suiteを巻き込まない。

---

## S12 Dashboard Cross-feature Consistency

層: `critical`

前提状態を共通helperで作成し、次をdashboardで一括確認する。

- 今日やること
- 直近の締切
- 選考中件数
- 7日以内締切件数
- 保存求人件数
- 応募compact list + status
- 求人compact list + score
- Persona version summary

Golden Journey終端では落選後 `選考中=0`、Persona v2、fresh scoreを確認する。

---

## S13 Mobile AppShell & Responsive Critical Paths

層: `mobile`

viewports:
- 320x568
- 375x812
- 390x844

操作:
1. register
2. bottom nav: ホーム / 求人 / 応募 / ペルソナ
3. `その他`: 締切 / 通知 / プロフィール
4. header bell
5. account menu
6. 各viewportでhorizontal overflow確認
7. 375pxで求人手動取り込み
8. 応募作成
9. `保存済み → 書類選考 → 面接` 更新
10. ES document作成 / title / entry編集
11. ES AI支援領域表示
12. 面接準備 / 面接後振り返り領域表示
13. input/buttonがfixed bottom navに隠れないことをbounding boxで確認

primary tap targetは44x44以上をassertする。

---

## S14 Golden Journey — Full Product Story

層: `acceptance`

これは Prizgram の最終受入兼デモシナリオ。**1 test / 1 Playwright recording / 1 MP4** とする。

sequence:
1. register
2. Persona v1
3. synthetic job import
4. evidence-backed score
5. application
6. screening → interview
7. ES deadline
8. manual ES作成・編集・提出
9. ES AI assistance
10. interview questions / outline / follow-up
11. reflection保存・reload
12. selection result = rejected
13. Persona update proposal
14. approval前はv1
15. explicit approve
16. Persona v2
17. re-score
18. final dashboard
19. logout / re-login
20. persisted v2 / rejected application確認

動画はAI待機が長くてもtimeout failureにしない。正式成果物はH.264 MP4。

---

## 非機能チェック（共通）

### Diagnostics

`src/support/test.ts` のauto fixtureで以下を常時記録する。

- console warning/error
- uncaught pageerror
- requestfailed URL / method / reason
- target / third_party / browser classification

### Selector priority

1. `getByRole`
2. `getByLabel`
3. semantic visible text
4. CSS locatorは構造/レイアウト検証など必要な場合のみ

本体にE2E専用selectorを追加しない。

### Determinism

- unique synthetic user
- synthetic company/job
- relative datetime
- AI exact text matchなし
- provider順番固定なし
- workers=1
- production mutation guard

## 将来追加候補

- WebKit / Firefox compatibility
- visual regression
- network degradation
- multi-user isolation
- session expiry / long-session
- browser back/forward
- production read-only monitoring
