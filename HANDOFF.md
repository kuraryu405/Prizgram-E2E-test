# HANDOFF

Updated: 2026-08-28 09:15 JST

## Repository state

- Repository: `kuraryu405/Prizgram-E2E-test`
- E2E branch: `main`
- E2E code HEAD before this HANDOFF commit: `ecadb8c11d97258fc04a6e2a60c2b9fdcb6a15d8` (`docs: update HANDOFF for Golden followup failure at step 08c`)
- Prizgram production main HEAD: `d1948a1083ed19d2b7c69cde9575d566f970ba85` (unchanged since 2026-08-27 19:37 UTC, no new deploy)
- Target: `https://prizgram.kuraryu.jp` with explicit production and mutation opt-ins.

## Golden Journey current step

- Steps **01 through 07 passed** again in two consecutive local production runs (evidence PNGs 01-07 and MP4 generated, durations 2m35s and 3m18s).
- Within Step **08 面接想定質問から回答骨子と深掘りを生成**, the first two AI calls **consistently succeed** now: `POST /api/applications/:id/interview-questions` (想定質問) and `POST /api/applications/:id/interview-outline` (回答骨子).
- First failing sub-operation **remains 08c interview-followup** (`POST /api/applications/:id/interview-followup` → `Interview follow-up generation` in `src/support/interview.ts:75`).
- Second confirmation run at `2026-08-28 00:08:56 UTC` (cf-ray `a31f15745cf2ae80-NRT`) reproduces identical failure after 3 Cloudflare 502 retries, confirming deterministic provider→domain mismatch for followup, not a one-off LLM nondeterminism.
- A final evidence MP4 and Step 01-07 screenshots are at `artifacts/test-results/acceptance-golden-journey--d2a0b-story-as-one-evidence-video/` locally (latest run 3m18s, 800x450). The next execution intentionally starts again at Step 01 to preserve one continuous Golden Journey recording.

## Latest error summary

Two consecutive local runs of:

```bash
E2E_BASE_URL=https://prizgram.kuraryu.jp E2E_ALLOW_MUTATION=true E2E_ALLOW_PRODUCTION=true pnpm test:golden
```

both failed at Step 08c after ~2m36s and ~3m18s:

- Run 1 (2026-08-28 00:03:48 UTC, `a31f0df15a8fd5ce-NRT`): `Interview follow-up generation failed after 3 attempts because Cloudflare repeatedly returned an HTML 502 Bad Gateway.` diagnostics `content-type=text/html; charset=UTF-8, server=cloudflare, cf-ray=a31f0df15a8fd5ce-NRT`
- Run 2 (2026-08-28 00:08:56 UTC, `a31f15745cf2ae80-NRT`): same message, diagnostics `content-type=text/html; charset=UTF-8, server=cloudflare, cf-ray=a31f15745cf2ae80-NRT`
- HTTP: `502 Bad gateway`; title: `kuraryu.jp | 502: Bad gateway`; prior successes: `interview-questions` + `interview-outline`.
- Bounded retry applies only to side-effect-free AI generation; all 3 followup attempts per run returned Cloudflare HTML representation. Edge masks origin's 502 body, so E2E cannot see application JSON directly.
- Previous correlation for `interview-questions` at `2026-08-27 23:38:36/56/39 UTC` (`a31ee9b09c9ce3de-NRT`) proved origin logged `UPSTREAM_INVALID_RESPONSE` caused by `LlmClientError SCHEMA_VALIDATION_FAILED: The normalized content did not match its domain schema`. This followup window shows same class extended; expected origin log at `00:03:48` and `00:08:56 UTC ±30s` is `SCHEMA_VALIDATION_FAILED` for `interview-followup`. Correlation pending but 2 identical failures make infra transient unlikely. No E2E code changed between runs; Prizgram deploy remains `d1948a1` (PR #304).
- `pnpm typecheck` passed before both runs; `pnpm install` used frozen lockfile.

Full Playwright output cf. `artifacts/test-results/acceptance-golden-journey--d2a0b-story-as-one-evidence-video/error-context.md` and `trace.zip`.

## Classification

- E2E-origin: **No.** Locators/typecheck stable; 2 consecutive identical failures confirm product-side deterministic schema bug, not E2E flakiness. Retry correctly limited to HTML 502; JSON schema failures still fail-fast.
- Prizgram-body-origin: **Yes, confirmed extended.** Interview AI followup provider schema `z.array(z.string())` unconstrained vs domain `array min1 max10 each trimmed min1 max500`. Same pattern as #300 scoring (`evidenceRefs`) and #305 expected-questions (`materialRefs`). All interview AI outputs (`expectedQuestions`, `answerOutline`, `followup`) need provider→domain constraint/normalization + trimming/filtering for empty/whitespace. Do not fix in E2E.
- Infra-origin: **No for this reproduction.** No evidence of web/tunnel restart or OOM for prior window; 2 consecutive masking 502s at different timestamps with same behavior confirm application root cause. If future correlation shows no matching origin `SCHEMA_VALIDATION_FAILED`, then re-open #301 for infra.

## Changes and commits in this phase

- No E2E source change (product bug, not masked).
- Added two correlation comments to Prizgram **#305**:
  - https://github.com/kuraryu405/Prizgram/issues/305#issuecomment-5446678155 – first followup failure `a31f0df15a8fd5ce-NRT` at `2026-08-28 00:03:48 UTC`, extends scope beyond expected-questions.
  - https://github.com/kuraryu405/Prizgram/issues/305#issuecomment-5446709388 – second consecutive reproduction `a31f15745cf2ae80-NRT` at `2026-08-28 00:08:56 UTC`, confirms deterministic.
- This HANDOFF update documents the second confirmation and must be committed/pushed; pushed to `origin/main`.

## Prizgram issue

- **#305** -- now confirmed for interview followup `SCHEMA_VALIDATION_FAILED` (2 reproductions). Original issue plus both comments: https://github.com/kuraryu405/Prizgram/issues/305 and #5446678155 / #5446709388
- **#301** -- retains infra fallback only if future correlation shows no matching application error: https://github.com/kuraryu405/Prizgram/issues/301
- #300 / PR #304 remain closed; they fixed scoring but not interview AI.

## Unresolved items

1. #305 needs Prizgram-body fix for **all interview AI schemas** (`apps/web/src/server/interview-ai/schemas.ts` + `service.ts` normalization): expectedQuestions `materialRefs`, answerOutline `points/evidenceRefs/warnings/insufficientContext`, followup `questions`. Constrain provider schema to domain contract where safely possible, normalize trimmable fields (trim, filter empty/whitespace, cap length), keep hallucination guard (`assertPersonaGroundedEvidenceRefs`), add regression tests reproducing empty/whitespace/overlong/empty-array provider outputs. Do not edit this E2E repo for that.
2. Do not raise E2E retry limit to hide schema failures; retry stays at 3 and only for Cloudflare HTML 502 on safe generation.
3. Once #305 fix is deployed (check `gh api repos/kuraryu405/Prizgram/commits --jq '.[0].sha'` > `d1948a1`), rerun complete 14-step Golden Journey; do first-failure triage only at new failure. Deploy must be verified via `gh api` before rerun.
4. Remove the temporary `.github/workflows/production-golden-once.yml` only after a fully passing 14-step run is recorded.
5. Pending origin-log correlations for both followup windows `a31f0df15a8fd5ce-NRT` and `a31f15745cf2ae80-NRT`: verify `prizgram-web.service` logged `UPSTREAM_INVALID_RESPONSE / SCHEMA_VALIDATION_FAILED` for `interview-followup` at both timestamps ±30s. If not, update #301.

## Next command

```bash
git pull --ff-only
git rev-parse --short HEAD
# wait for Prizgram #305 fix deploy, verify:
gh api repos/kuraryu405/Prizgram/commits --jq '.[0] | "\(.sha[0:7]) \(.commit.message | split("\n")[0])"'
pnpm typecheck
E2E_BASE_URL=https://prizgram.kuraryu.jp \
E2E_ALLOW_MUTATION=true \
E2E_ALLOW_PRODUCTION=true \
pnpm test:golden
```

## If the next run fails, inspect these first

- Step 08: Prizgram #305; `apps/web/src/server/interview-ai/schemas.ts` and `apps/web/src/server/interview-ai/service.ts` (all three outputs) and `apps/web/src/server/llm/client.ts` generics. Use `src/support/interview.ts` and `src/support/api-waits.ts` only to classify response; do not hide.
- Cloudflare HTML 502 without matching application error at correlated timestamp: #301, then production `prizgram-web.service` and `cloudflared-prizgram.service` logs around error timestamp (check `NRestarts`, `oom_kill`, `journalctl -u prizgram-web.service --since "..."`).
- Step 10: `src/support/applications.ts`.
- Step 11--12: `src/support/persona-update.ts` (propose/reevaluate also uses LLM, same schema class).
- Step 13: `src/support/dashboard.ts`.
- Step 14: `tests/acceptance/golden-journey.spec.ts` and account/session helpers.

## Required cycle

`run -> diagnose first failure -> smallest safe fix -> typecheck -> commit/push -> update HANDOFF.md -> rerun`

Keep no uncommitted E2E files. Do not modify Prizgram body code from this E2E loop; record product or infra defects in the appropriate Prizgram issue instead.
