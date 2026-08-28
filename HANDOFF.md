# HANDOFF

Updated: 2026-08-28 09:10 JST

## Repository state

- Repository: `kuraryu405/Prizgram-E2E-test`
- E2E branch: `main`
- E2E code HEAD before this HANDOFF commit: `ed358fc69349ad2d27bf352c48dab2035181a37d` (`docs: correct Golden root cause classification`)
- Prizgram production main HEAD: `d1948a1083ed19d2b7c69cde9575d566f970ba85` (unchanged since 2026-08-27 19:37 UTC, no new deploy)
- Target: `https://prizgram.kuraryu.jp` with explicit production and mutation opt-ins.

## Golden Journey current step

- Steps **01 through 07 passed** again in this local production run (evidence PNGs 01-07 and MP4 generated, duration 2m35s).
- Within Step **08 面接想定質問から回答骨子と深掘りを生成**, the first two AI calls **succeeded** this run: `POST /api/applications/:id/interview-questions` (想定質問) and `POST /api/applications/:id/interview-outline` (回答骨子).
- First failing sub-operation: **08c interview-followup** (`POST /api/applications/:id/interview-followup` → `Interview follow-up generation` in `src/support/interview.ts:75`).
- A final evidence MP4 and Step 01-07 screenshots are at `artifacts/test-results/acceptance-golden-journey--d2a0b-story-as-one-evidence-video/` locally. The next execution intentionally starts again at Step 01 to preserve one continuous Golden Journey recording.

## Latest error summary

The local run of:

```bash
E2E_BASE_URL=https://prizgram.kuraryu.jp E2E_ALLOW_MUTATION=true E2E_ALLOW_PRODUCTION=true pnpm test:golden
```

failed after ~2m36s at Step 08c. Browser received Cloudflare HTML 502, retried 3 times for safe AI generation:

- `Interview follow-up generation failed after 3 attempts because Cloudflare repeatedly returned an HTML 502 Bad Gateway.`
- HTTP: `502 Bad gateway`; title: `kuraryu.jp | 502: Bad gateway`; `此前 2 successes: interview-questions + interview-outline`.
- Cloudflare error-page time: `2026-08-28 00:03:48 UTC` / `2026-08-28 09:03:48 JST`.
- Diagnostics: `content-type=text/html; charset=UTF-8`, `server=cloudflare`, `cf-ray=a31f0df15a8fd5ce-NRT`.
- Bounded retry applies only to side-effect-free AI generation; all 3 followup attempts returned Cloudflare HTML representation. Edge response masks/replaces origin's 502 body in this case, so E2E could not see application JSON error directly.
- Previous run's correlation (2026-08-27 23:38:36/56/39 UTC, cf-ray a31ee9b09c9ce3de-NRT) showed origin logged `UPSTREAM_INVALID_RESPONSE` caused by `LlmClientError SCHEMA_VALIDATION_FAILED: The normalized content did not match its domain schema` for `interview-questions`. This run's followup failure is the same class extended to `interview-followup`. Origin logs for window `00:03:... UTC` need correlation to confirm (expected same `SCHEMA_VALIDATION_FAILED` for followup provider vs domain mismatch). No E2E code changed between runs; Prizgram deploy remains `d1948a1` (PR #304).
- `pnpm typecheck` passed before the Golden run; `pnpm install` used frozen lockfile.

Full Playwright output truncated cf. `artifacts/test-results/acceptance-golden-journey--d2a0b-story-as-one-evidence-video/error-context.md` and trace.

## Classification

- E2E-origin: **No.** Locators/typecheck stable; step 08 progress (questions+outline now pass) proves nondeterministic LLM output but same product schema class. Retry correctly limited to HTML 502; JSON schema failures still fail-fast.
- Prizgram-body-origin: **Yes, extended.** Interview AI followup has permissive provider schema `z.array(z.string())` unconstrained vs domain `array min1 max10 each trimmed min1 max500`. Same pattern as #300 scoring (`evidenceRefs`) and #305 expected-questions (`materialRefs`). All interview AI outputs (`expectedQuestions`, `answerOutline`, `followup`) need provider→domain constraint/normalization. Do not fix in E2E.
- Infra-origin: **No for this reproduction.** No evidence of web/tunnel restart or OOM for prior window; new window's Cloudflare HTML is expected masking of application 502 as before. If new window correlation shows no matching origin SCHEMA_VALIDATION_FAILED, then re-open #301 for infra.

## Changes and commits in this phase

- No E2E source change (product bug, not masked).
- Added correlation comment to Prizgram **#305**: https://github.com/kuraryu405/Prizgram/issues/305#issuecomment-5446678155 – records that followup now fails at same step 08 with new cf-ray `a31f0df15a8fd5ce-NRT` at `2026-08-28 00:03:48 UTC`, extends scope beyond expected-questions to all interview AI schemas.
- This HANDOFF update commits as the next commit before rerun after fix deploy; pushed to `origin/main`.

## Prizgram issue

- **#305** -- now expanded: interview followup `SCHEMA_VALIDATION_FAILED` in addition to expected-questions. Original issue for expected-questions plus new followup evidence: https://github.com/kuraryu405/Prizgram/issues/305 and https://github.com/kuraryu405/Prizgram/issues/305#issuecomment-5446678155
- **#301** -- retains infra fallback only if future correlation shows no matching application error: https://github.com/kuraryu405/Prizgram/issues/301
- #300 / PR #304 remain closed; they fixed scoring but not interview AI.

## Unresolved items

1. #305 needs Prizgram-body fix for **all interview AI schemas** (`schemas.ts`): expectedQuestions `materialRefs`, answerOutline `points/evidenceRefs/warnings`, followup `questions`. Constrain provider schema to domain contract where safely possible, normalize trimmable fields, keep hallucination guard (`assertPersonaGroundedEvidenceRefs`), add regression tests reproducing empty/whitespace/overlong/empty-array provider outputs. Do not edit this E2E repo for that.
2. Do not raise E2E retry limit to hide schema failures; retry stays at 3 and only for Cloudflare HTML 502 on safe generation.
3. Once #305 fix is deployed (check `gh api repos/kuraryu405/Prizgram/commits --jq '.[0].sha'` > `d1948a1`), rerun complete 14-step Golden Journey; do first-failure triage only at new failure.
4. Remove the temporary `.github/workflows/production-golden-once.yml` only after a fully passing 14-step run is recorded.
5. Pending origin-log correlation for `a31f0df15a8fd5ce-NRT` window: verify `prizgram-web.service` logged `UPSTREAM_INVALID_RESPONSE / SCHEMA_VALIDATION_FAILED` for `interview-followup` at `00:03:48 UTC ±30s`. If not, update #301.

## Next command

```bash
git pull --ff-only
git rev-parse --short HEAD
pnpm typecheck
E2E_BASE_URL=https://prizgram.kuraryu.jp \
E2E_ALLOW_MUTATION=true \
E2E_ALLOW_PRODUCTION=true \
pnpm test:golden
```

## If the next run fails, inspect these first

- Step 08: Prizgram #305; `apps/web/src/server/interview-ai/schemas.ts` and `apps/web/src/server/interview-ai/service.ts` (all three outputs). Use `src/support/interview.ts` and `src/support/api-waits.ts` only to classify response; do not hide.
- Cloudflare HTML 502 without matching application error at correlated timestamp: #301, then production `prizgram-web.service` and `cloudflared-prizgram.service` logs around error timestamp (check `NRestarts`, `oom_kill`, `journalctl -u ...`).
- Step 10: `src/support/applications.ts`.
- Step 11--12: `src/support/persona-update.ts` (propose/reevaluate also uses LLM).
- Step 13: `src/support/dashboard.ts`.
- Step 14: `tests/acceptance/golden-journey.spec.ts` and account/session helpers.

## Required cycle

`run -> diagnose first failure -> smallest safe fix -> typecheck -> commit/push -> update HANDOFF.md -> rerun`

Keep no uncommitted E2E files. Do not modify Prizgram body code from this E2E loop; record product or infra defects in the appropriate Prizgram issue instead.
