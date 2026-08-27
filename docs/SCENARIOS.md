# E2E Scenario Catalog

この文書は `kuraryu405/Prizgram` の `main` をコードベースで追跡して作成した E2E シナリオ仕様です。

基準 commit: `49e4c4fce27507773a8e872bb4fdb63b04b781b7`

Prizgram 本体には E2E 都合の変更を加えません。画面操作は原則として role / label / visible text を使います。

## 共通テストユーザー

各 mutable scenario は衝突しない一意な login ID を作成します。

- login ID: `e2e-<scenario>-<timestamp/random>`
- password: E2E fixture 内で生成する12文字以上のテスト専用値
- ペルソナ回答: `src/fixtures/persona.ts`
- 手動求人: `src/fixtures/job.ts`

実在人物・実在企業への応募操作は行いません。

## 証跡ルール

各 scenario は次を残します。

- 全操作動画: MP4
- Playwright trace: `trace.zip`
- 主要 checkpoint: PNG screenshot
- Playwright HTML report
- failure 時は追加 screenshot / console / request failure の情報

### checkpoint の基準

単なるクリック直後ではなく、**ユーザーが成功を認識できる状態**を撮影します。

例:

- ペルソナ生成ボタン押下後 → ペルソナ詳細が表示された時点
- 求人取り込みボタン押下後 → 取り込み済み求人一覧に表示された時点
- 応募更新 → 成功メッセージと更新後の状態が見える時点
- ES生成 → AI生成結果 textarea が表示された時点
- ペルソナ更新 → version 増加と再評価結果が見える時点

---

## S00 Public Smoke

層: `smoke`

目的: 状態を変更せず、公開導線が生きていることを確認する。

### 操作

1. `/` を開く
2. キャッチコピーと「Prizgramをはじめる」を確認
3. `/register` を開き、登録フォームを確認
4. `/login` を開き、ログインフォームを確認

### 完了条件

- 主要ページが 5xx にならない
- CTA の destination が正しい
- 登録・ログインに必要な入力欄が表示される

---

## S01 Authentication & Account Lifecycle

層: `critical`

目的: アカウント作成からログアウト、再ログイン、パスワード変更までを確認する。

### 操作

1. 新規登録
2. `/app` へ遷移
3. AppShell に login ID が表示される
4. プロフィールを開く
5. パスワード変更
6. ログアウト
7. 旧パスワードでログイン失敗
8. 新パスワードでログイン成功
9. 未認証状態で `/app` へ直接アクセスし `/login?next=...` へ誘導されることを確認

### checkpoint

- 登録後ダッシュボード
- プロフィール画面
- パスワード変更成功
- ログアウト後公開画面
- 新パスワードで再ログイン後

---

## S02 Persona Intake & Generation

層: `critical`

目的: 6問ヒアリングから説明可能なペルソナが生成されることを確認する。

### 操作

1. ペルソナ画面へ移動
2. 「ヒアリングをはじめる」
3. スキル
4. 経験
5. 強み
6. 弱み
7. 価値観
8. 志向
9. 「ペルソナを生成する」
10. ペルソナ詳細を確認

### 検証

- 質問 `1 / 6` から `6 / 6` へ進む
- 各回答保存後に次の質問へ遷移する
- 生成後 `/app/persona` に戻る
- version が表示される
- スキル / 経験 / 強み / 弱み / 価値観 / 志向 / 根拠 / version履歴が表示される

### checkpoint

- ヒアリング開始
- 6問目入力済み
- 生成後ペルソナ全体

---

## S03 Manual Job Import, Detail, Scoring, Versioning & Archive

層: `critical`

目的: 外部求人 provider に依存せず、求人機能の主要ライフサイクルを確認する。

### 操作

1. `/app/jobs`
2. synthetic 求人票を手動取り込み
3. 一覧から求人詳細へ
4. 求人本文 / 要件 / 歓迎スキル / 文化・価値観 / 難易度 / 出典を確認
5. 3軸評価を実行
6. スキル適合 / 文化・価値観フィット / 難易度ギャップと根拠を確認
7. 求人を更新内容で再取り込み
8. version履歴が増えることを確認
9. 評価 freshness の変化を確認
10. 再評価
11. アーカイブ
12. アーカイブ済み一覧へ移動したことを確認
13. 復元

### checkpoint

- 取り込み済み求人一覧
- 求人詳細
- 3軸評価結果
- version履歴
- アーカイブ状態
- 復元後

---

## S04 External Job Discovery

層: `integration`

目的: ペルソナを起点とした外部求人探索を確認する。

### 操作

1. 求人探索フォームを開く
2. キーワード / 勤務地 / 雇用形態を指定
3. 探索
4. provider status と候補件数を確認
5. 単一候補を取り込み
6. 候補から評価
7. 複数候補を選択
8. 一括取り込み
9. filter reset

### 注意

- provider の候補0件は障害とは限らない
- provider outage / rate limit / partial success を通常の assertion failure と区別する
- fixture に固定できない値（候補タイトル等）を exact match しない

---

## S05 Application Lifecycle

層: `critical`

目的: 求人から応募を作成し、選考状態を進め、履歴が保持されることを確認する。

### 操作

1. synthetic 求人詳細から応募を作成
2. `/app/applications` 一覧に表示
3. 応募詳細へ
4. 段階を「書類選考」に設定
5. 次アクションを設定
6. メモ保存
7. status を許可された次状態へ更新
8. 複数段階を進めて `interview` まで到達
9. status filter を確認
10. 選考履歴の sequence と内容を確認

### 検証

- 同一求人から重複応募を作らない
- update 後に「更新しました。」が表示される
- timeline が追加される
- snapshot として応募時求人情報が保持される

---

## S06 Deadline Lifecycle & Dashboard Reflection

層: `critical`

目的: 応募に締切を紐付け、ダッシュボードまで反映されることを確認する。

### 操作

1. 応募詳細から締切管理へ
2. ES締切を登録
3. 面接予定を登録
4. 今後の締切に表示
5. 応募詳細の「次の締切」に表示
6. ダッシュボード「直近の締切」に表示
7. 締切を編集
8. 完了 toggle
9. 完了済みに移動
10. 必要な edit/delete UI も確認

### 時刻ルール

- fixture の日時は実行時刻から相対生成する
- Asia/Tokyo を基準とする
- midnight 境界に依存する exact 表示文字列は避け、`datetime` と section 所属を検証する

---

## S07 Application Documents / ES Manual Flow

層: `critical`

目的: LLMを使わなくても応募書類を作成・編集・提出できることを確認する。

### 操作

1. 応募詳細の「応募書類 / ES」
2. ES書類を作成
3. title変更
4. 設問と回答を手動追加
5. 回答編集
6. provenance がユーザー編集として扱われることを確認
7. 提出
8. 提出済み書類へ追加保存できない境界を確認

### checkpoint

- 書類作成直後
- 設問追加後
- 編集後
- 提出済み状態

---

## S08 ES AI Assistance

層: `integration`

目的: ペルソナ・応募先情報を材料に、ES候補探索から下書き・添削まで動くことを確認する。

### 操作

1. ES AI支援に設問を入力
2. 文字数制限を入力
3. 「使えそうな経験を探す」
4. 候補を1件選択
5. 「この経験で下書きを作る」
6. AI生成結果を確認
7. 人間が textarea を編集
8. target document を選び保存
9. AI添削を実行
10. revised answer / feedback / warnings を確認

### 検証

- AI出力本文の完全一致はしない
- 空ではないこと、文字数境界、根拠 refs、警告表示など構造を検証する
- 人間が編集できることを明示的に検証する

---

## S09 Interview Preparation & Reflection

層: `integration`

目的: 面接前支援から面接後振り返り保存までを一つの流れで確認する。

### 操作

1. 現在の選考段階を入力
2. 「想定質問を生成」
3. 1問選択
4. 「回答を組み立てる」
5. 回答骨子を確認
6. 「深掘りを見る」
7. 深掘り候補を確認
8. 実際に聞かれた質問を入力
9. 回答要点
10. 感触
11. フィードバック / メモ
12. 「振り返りを保存」
13. reload 後も振り返りが残ることを確認

---

## S10 Persona Feedback Loop

層: `critical` + LLMを使う部分は `integration`

目的: Prizgram のコアループそのものを証明する。

### 前提

- Persona v1 が存在
- 評価済み求人が存在
- 応募と選考履歴が存在
- 面接振り返りが存在

### 操作

1. `/app/persona/update`
2. 対象応募を選択
3. 選考結果を踏まえた振り返りメモを入力
4. 「更新案を作成」
5. 提案内容を確認
6. この時点では Persona v1 のままであることを確認
7. 「承認して新バージョンを作成」
8. Persona v2 が生成される
9. 保存求人の再評価が走る
10. 残件があれば続きを実行
11. `/app/persona` で version履歴を確認
12. 求人詳細で新 persona version に基づく score を確認

### 重要なプロダクト境界

- proposal の生成だけでは persona を変更しない
- **ユーザー承認後のみ** version を作る
- 更新後の求人評価が最新 persona と紐づく

### checkpoint

- 更新案
- 承認直前
- Persona v2 / 再評価結果
- 求人の再評価結果

---

## S11 Reminders

層: `integration`

目的: deadline 由来の reminder 表示と dismiss を確認する。

### 操作

1. reminder 発火条件を満たす deadline を用意
2. reminder generation が行われる test environment で実行
3. `/app/reminders`
4. priority / message / timestamp を確認
5. dismiss
6. active list から消える

### 注意

定期処理を外から起動できない環境では、この scenario を unavailable として明示し、critical suite を巻き込まない。

---

## S12 Dashboard Cross-feature Consistency

層: `critical`

目的: 個別機能で作った状態がダッシュボードに一貫して反映されることを確認する。

### 検証

- 選考中件数
- 7日以内の締切件数
- 保存求人件数
- 今日やること
- 直近の締切
- 応募 compact list
- 求人 compact list
- score / 未評価表示
- Persona version summary

---

## S13 Mobile AppShell & Responsive Critical Paths

層: `mobile`

viewport候補:

- 320x568
- 375x812
- 390x844

### 操作

1. 登録 / ログイン
2. bottom navigation のホーム / 求人 / 応募 / ペルソナ
3. 「その他」を開く
4. 締切 / 通知 / プロフィール
5. header bell
6. account menu
7. logout
8. 求人入力フォーム
9. 応募更新フォーム
10. ES / interview の主要操作領域

### 検証

- 横スクロールが発生しない
- primary tap target が操作可能
- More disclosure が開閉できる
- modal / popover / menu が viewport 外に消えない
- fixed navigation がコンテンツ操作を阻害しない

---

## S14 Golden Journey — Full Product Story

層: `critical` / AI箇所を有効にすると `integration`

これは Prizgram のデモ兼最終受入シナリオです。

### ストーリー

> Webエンジニア志望の学生が Prizgram に登録し、自分の経験を6問ヒアリングで整理する。求人を取り込み、自分との相性を根拠付きで確認して応募する。ESを準備し、面接対策を行い、面接後の振り返りと選考結果を記録する。その結果からペルソナ更新案が生成され、本人が承認すると次の求人評価へ反映される。

### sequence

1. register
2. Persona v1
3. job import
4. score
5. application
6. deadline
7. ES document
8. ES AI assistance（integration時）
9. application status → interview
10. interview preparation（integration時）
11. reflection
12. selection result
13. persona update proposal
14. explicit approve
15. Persona v2
16. re-score
17. dashboard consistency
18. logout / re-login
19. persisted state confirmation

### デモ動画の基準

- 1本のMP4として最初から最後まで見られる
- checkpoint 間に不要な待機時間を極力入れない
- synthetic test data だと分かる命名にする
- LLM待機中は button pending state が見える
- 最後は Persona v2 と更新後 score / dashboard を見せて終了

---

## 非機能チェック（各シナリオ共通）

### Browser errors

- uncaught page error を記録
- console `error` を記録
- failed request を記録
- 既知の third-party noise と product failure を分ける

### Accessibility-oriented selectors

優先順位:

1. `getByRole`
2. `getByLabel`
3. `getByText` / semantic locator
4. CSS locator は最終手段

本体に E2E 専用 selector を追加することは原則しない。

### Determinism

- user ID は毎回一意
- synthetic company / job を使う
- 日時は相対生成
- AI文面の exact match をしない
- provider候補の順番を固定しない
- suite は最初は1 worker

## 将来追加

- Chromium以外（WebKit / Firefox）のcompatibility suite
- visual regression
- network degradation
- multi-user isolation
- long-session / session expiry
- browser back/forward 操作
- production read-only synthetic monitoring
