# Issue-driven Implementation Plan

`Prizgram-E2E-test` は、共通基盤を先に固め、その後シナリオ単位で Issue を消化する。

現在のPrizgram仕様追跡基準は `main@119c15edd9f8fe4ca241e70437e7e1089e16268c`。作業開始時の `49e4c4f` から進んだ2commitは求人探索系のみで、S04を最新provider summary UIへ追従済み。

## Dependency order

```text
Foundation
  ├─ test account / fixture helpers
  ├─ browser diagnostics
  ├─ MP4 evidence pipeline
  └─ mutation safety guard
       ↓
Auth
       ↓
Persona v1
       ↓
Manual Job → Scoring
       ↓
Application
       ├─ Deadline
       ├─ Documents / ES
       └─ Interview
             ↓
Persona Feedback Loop
             ↓
Dashboard consistency
             ↓
Golden Journey
```

External Job Discovery / AI / Reminder は外部依存のため、独立した integration scenario として原因分離する。ただし最終 Golden Journey では実製品ストーリーとしてAI機能も含める。

## GitHub Issue mapping

### Foundation

- #1 — reusable synthetic account/session helpers
- #2 — browser diagnostics / failure evidence
- #3 — MP4 pipeline / manual mutable workflow

### Critical / responsive flows

- #4 — S01 Authentication & Account Lifecycle
- #5 — S02 Persona Intake & Generation
- #6 — S03 Manual Job / Scoring / Version / Archive
- #7 — S05 Application Lifecycle
- #8 — S06 Deadline Lifecycle
- #9 — S07 Application Documents Manual Flow
- #10 — S12 Dashboard Cross-feature Consistency
- #11 — S13 Mobile AppShell & Responsive Critical Paths

### Integration flows

- #12 — S04 External Job Discovery
- #13 — S08 ES AI Assistance
- #14 — S09 Interview Preparation & Reflection
- #15 — S10 Persona Feedback Loop
- #16 — S11 Reminder Generation / Display / Dismiss

### Acceptance

- #17 — S14 Full Golden Journey / one MP4

## Current implementation status

コード上の土台と S01〜S14 は実装済み。主な構成:

- `tests/smoke/`
- `tests/critical/`
- `tests/integration/`
- `tests/mobile/`
- `tests/acceptance/golden-journey.spec.ts`
- `src/support/test.ts` — diagnostics auto fixture
- `src/support/timeouts.ts` — AI result timeout policy
- `scripts/run-playwright.mjs` — WebM → H.264 MP4

ただしIssueは、**実対象環境で成功実行しMP4/trace/diagnosticsを取得するまではcloseしない**。

## Definition of Done for every scenario Issue

- [ ] only `Prizgram-E2E-test` is modified
- [ ] selectors prefer role / label / semantic text
- [ ] test data is synthetic and uniquely namespaced
- [ ] state-changing tests call `assertMutationAllowed()` before mutation
- [ ] assertions check user-visible outcome, not hidden implementation detail
- [ ] important checkpoints use `evidenceStep()`
- [ ] `browser-diagnostics.json` is attached
- [ ] MP4 is generated successfully
- [ ] trace is generated
- [ ] failure path leaves enough information to diagnose
- [ ] `pnpm typecheck` passes
- [ ] target test passes at least once against the intended E2E environment
- [ ] README / scenario docs are updated when behavior differs from current spec

## AI / LLM timing rule

AI処理時間だけを理由にE2Eを落とさない。

- AI result wait: timeoutなし (`AI_RESULT_TIMEOUT = 0`)
- test全体duration cap: なし
- ordinary action/navigation/assertion: finite timeout

LLM/providerが遅い場合は待機し続ける。provider error / rate limit等が明示的に返った場合は diagnostics と `EXTERNAL_DEPENDENCY` classification で扱う。

## GitHub Actions policy

Actions利用枠が使えない期間はpush/PR自動実行を行わない。

- `E2E Smoke Evidence`: manual `workflow_dispatch` only
- `Manual Mutable E2E`: manual `workflow_dispatch` only

主実行経路はローカル `pnpm test:*`。Actions復旧後も自動化を戻すかは別判断とし、E2E設計自体はActionsに依存させない。

## Failure classification

E2E failure を次の4種類に分類する。

1. `PRODUCT_BUG` — Prizgram のユーザーフローが実際に壊れている
2. `E2E_BUG` — selector / timing / fixture / expectation の問題
3. `ENVIRONMENT` — deploy / DB / local runner / required script access の不足
4. `EXTERNAL_DEPENDENCY` — LLM / 求人 provider / third-party outage

求人候補0件などは自動的にPRODUCT_BUG扱いしない。Reminder generationを起動できない環境もskip理由を明示し、critical suiteへ波及させない。

## Source update policy

Prizgram の `main` が進んだら、実装担当は着手/実行前に以下を確認する。

1. `Prizgram/main` 最新 SHA
2. 前回基準SHAとの差分ファイル
3. 対象ページ/component
4. 対応 Route Handler / API
5. UI label / allowed state transition
6. provider/LLM response shape差分

仕様差分があればシナリオ契約とhelperを先に更新してから実行する。

## PR rule

今後複数人で変更する場合は 1 Issue = 1 PR を基本とする。今回の初期構築のように土台をまとめて直接作る場合でも、Prizgram本体には変更を入れない。

PR本文には以下を含める。

```text
Closes #<issue>

Scenario: Sxx
Target: <base url / environment class>
Prizgram baseline: <main SHA>

Evidence:
- MP4: <artifact/path>
- Trace: <artifact/path>
- Screenshots: <checkpoint list>
- Diagnostics: <browser-diagnostics.json>

Prizgram repository modified: NO
```
