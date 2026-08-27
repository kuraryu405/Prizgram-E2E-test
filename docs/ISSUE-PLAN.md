# Issue-driven Implementation Plan

`Prizgram-E2E-test` は、共通基盤を先に固め、その後シナリオ単位で Issue を消化する。

## Dependency order

```text
Foundation
  ├─ test account / fixture helpers
  ├─ browser diagnostics
  ├─ MP4 evidence pipeline
  └─ CI artifact pipeline
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

External Job Discovery / AI / Reminder は外部依存のため、critical path とは別系列で実装する。

## Issue list

### Foundation

- F01: Test identity / fixture helper
- F02: Browser diagnostics and failure evidence
- F03: MP4 evidence + GitHub Actions artifact pipeline
- F04: Mutable-environment safety guard test

### Critical deterministic flows

- C01: Authentication & account lifecycle — S01
- C02: Persona intake & generation — S02
- C03: Manual job import / scoring / versioning / archive — S03
- C04: Application lifecycle — S05
- C05: Deadline lifecycle — S06
- C06: Application documents manual flow — S07
- C07: Dashboard cross-feature consistency — S12
- C08: Mobile AppShell & responsive critical paths — S13

### Integration flows

- I01: External job discovery / single import / bulk import — S04
- I02: ES AI assistance — S08
- I03: Interview preparation & reflection — S09
- I04: Persona feedback loop / approval / re-evaluation — S10
- I05: Reminder generation / display / dismiss — S11

### Acceptance

- A01: Full Golden Journey MP4 — S14

## Definition of Done for every scenario Issue

- [ ] only `Prizgram-E2E-test` is modified
- [ ] selectors prefer role / label / semantic text
- [ ] test data is synthetic and uniquely namespaced
- [ ] state-changing tests call `assertMutationAllowed()` before mutation
- [ ] assertions check user-visible outcome, not implementation detail
- [ ] important checkpoints use `evidenceStep()`
- [ ] MP4 is generated successfully
- [ ] trace is generated
- [ ] failure path leaves enough information to diagnose
- [ ] `pnpm typecheck` passes
- [ ] target test passes at least once against the intended E2E environment
- [ ] README / scenario docs are updated when behavior differs from current spec

## PR rule

1 Issue = 1 PR を基本とする。

PR本文には以下を含める。

```text
Closes #<issue>

Scenario: Sxx
Target: <base url / environment class>

Evidence:
- MP4: <artifact/path>
- Trace: <artifact/path>
- Screenshots: <checkpoint list>

Prizgram repository modified: NO
```

## Failure classification

E2E failure を次の4種類に分類する。

1. `PRODUCT_BUG` — Prizgram のユーザーフローが実際に壊れている
2. `E2E_BUG` — selector / timing / fixture / expectation の問題
3. `ENVIRONMENT` — deploy / DB / network / unavailable dependency
4. `EXTERNAL_DEPENDENCY` — LLM /求人 provider / third-party outage

外部依存 failure で critical suite を赤くしない。

## Source update policy

Prizgram の `main` が進んだら、実装担当は Issue 着手時に以下を確認する。

1. `Prizgram/main` 最新 SHA
2. 対象ページ
3. 対象 component
4. 対応 Route Handler / API
5. UI label / allowed state transition

仕様差分があれば `docs/SCENARIOS.md` を先に更新してから test を変更する。
