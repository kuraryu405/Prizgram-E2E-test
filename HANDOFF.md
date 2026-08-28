# HANDOFF

Updated: 2026-08-28 10:48 JST

## Repository state

- Repository: `kuraryu405/Prizgram-E2E-test`
- E2E branch: `main`
- E2E code HEAD before this HANDOFF commit: `ea3617a15a052e3db249d4f38d5e619f296d2d9a` (`docs: confirm Golden followup origin correlation`)
- Prizgram Git main HEAD: `0c292c7bff55c17adfcc29d381cef6109b119ea3` (merged PR #306 / closes #305).
- Deployed production release remains: `d1948a1083ed19d2b7c69cde9575d566f970ba85`.
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
- Previous correlation for `interview-questions` at `2026-08-27 23:38:36/56/39 UTC` (`a31ee9b09c9ce3de-NRT`) proved origin logged `UPSTREAM_INVALID_RESPONSE` caused by `LlmClientError SCHEMA_VALIDATION_FAILED: The normalized content did not match its domain schema`. The followup correlation is now also complete: all retries at `00:03:21/28/33/41/48 UTC` and `00:08:40/48/56 UTC` logged the same origin error for `interview-followup`.
- `pnpm typecheck` passed before both runs; `pnpm install` used frozen lockfile.

Full Playwright output cf. `artifacts/test-results/acceptance-golden-journey--d2a0b-story-as-one-evidence-video/error-context.md` and `trace.zip`.

## Classification

- E2E-origin: **No.** Locators/typecheck stable; 2 consecutive identical failures confirm product-side deterministic schema bug, not E2E flakiness. Retry correctly limited to HTML 502; JSON schema failures still fail-fast.
- Prizgram-body-origin: **Yes, confirmed extended.** Interview AI followup provider schema `z.array(z.string())` unconstrained vs domain `array min1 max10 each trimmed min1 max500`. Same pattern as #300 scoring (`evidenceRefs`) and #305 expected-questions (`materialRefs`). All interview AI outputs (`expectedQuestions`, `answerOutline`, `followup`) need provider→domain constraint/normalization + trimming/filtering for empty/whitespace. Do not fix in E2E.
- Infra-origin: **No for this reproduction.** Web/tunnel `NRestarts=0` since `2026-08-27 19:38:47 UTC`, cgroup `oom=0`, `oom_kill=0`, and every correlated retry logged the application schema error. Re-open #301 only if a future HTML 502 has no matching origin application error.

## Changes and commits in this phase

- No E2E source change (product bug, not masked).
- Prizgram #306 merged `0c292c7bff55c17adfcc29d381cef6109b119ea3`; the schema fix passed typecheck, 542 tests, lint, and production build before merge.
- A manual deploy was attempted once using the canonical `remote-release.sh` and stopped safely during the pre-deploy backup:
  - `sqlite3: command not found`
  - `Backup failed; aborting deploy before migration`
  - `Restarting previous service after backup failure...`
- Safety verification immediately after abort: `current` stayed `d1948a1`; web service was `active/running`; loopback `/api/health` returned 200; no migration or symlink switch occurred.
- Added three correlation comments to Prizgram **#305**:
  - https://github.com/kuraryu405/Prizgram/issues/305#issuecomment-5446678155 – first followup failure `a31f0df15a8fd5ce-NRT` at `2026-08-28 00:03:48 UTC`, extends scope beyond expected-questions.
  - https://github.com/kuraryu405/Prizgram/issues/305#issuecomment-5446709388 – second consecutive reproduction `a31f15745cf2ae80-NRT` at `2026-08-28 00:08:56 UTC`, confirms deterministic.
  - https://github.com/kuraryu405/Prizgram/issues/305#issuecomment-5447128601 – confirms origin-log correlation for both followup retry sequences and rules out restart/OOM.
- This HANDOFF update documents the completed correlation and must be committed/pushed before another run.

## Prizgram issue

- **#305** -- fixed by merged PR #306, but not yet deployed: https://github.com/kuraryu405/Prizgram/issues/305
- **#307** -- manual deploy prerequisite failure (`sqlite3` CLI missing); do not bypass backup or retry production deploy before resolving it: https://github.com/kuraryu405/Prizgram/issues/307
- **#301** -- retains infra fallback only if future correlation shows no matching application error: https://github.com/kuraryu405/Prizgram/issues/301
- #300 / PR #304 remain closed; they fixed scoring but not interview AI.

## Unresolved items

1. Resolve #307 safely: provision/verify the canonical backup prerequisite or change the deploy backup implementation through review. Do not bypass backup, manually switch `current`, run migrations, or retry the deployment until then.
2. Do not raise E2E retry limit to hide schema failures; retry stays at 3 and only for Cloudflare HTML 502 on safe generation.
3. After #307 is resolved, deploy merged main `0c292c7...`, verify `current` points to that release and `/api/health` is 200, then rerun complete 14-step Golden Journey.
4. Remove the temporary `.github/workflows/production-golden-once.yml` only after a fully passing 14-step run is recorded.

## Next command

```bash
git pull --ff-only
git rev-parse --short HEAD
# wait for and resolve #307, then verify deployed release:
ssh -i /Users/tsutsumin/.ssh/prizgram_deploy prizgram-deploy@prizgram.tail0d4c05.ts.net 'readlink -f "$HOME/prizgram/current"; curl --fail http://127.0.0.1:3000/api/health'
pnpm typecheck
E2E_BASE_URL=https://prizgram.kuraryu.jp \
E2E_ALLOW_MUTATION=true \
E2E_ALLOW_PRODUCTION=true \
pnpm test:golden
```

## If the next run fails, inspect these first

- Deploy failure: #307 and `scripts/deploy/remote-release.sh` backup prerequisites. Confirm backup succeeds before any migration/release switch.
- Step 08 after deploy: Prizgram #305 / merged #306; `apps/web/src/server/interview-ai/schemas.ts`, `apps/web/src/server/interview-ai/service.ts`, and `apps/web/src/server/llm/client.ts`. Use `src/support/interview.ts` and `src/support/api-waits.ts` only to classify response; do not hide.
- Cloudflare HTML 502 without matching application error at correlated timestamp: #301, then production `prizgram-web.service` and `cloudflared-prizgram.service` logs around error timestamp (check `NRestarts`, `oom_kill`, `journalctl -u prizgram-web.service --since "..."`).
- Step 10: `src/support/applications.ts`.
- Step 11--12: `src/support/persona-update.ts` (propose/reevaluate also uses LLM, same schema class).
- Step 13: `src/support/dashboard.ts`.
- Step 14: `tests/acceptance/golden-journey.spec.ts` and account/session helpers.

## Required cycle

`run -> diagnose first failure -> smallest safe fix -> typecheck -> commit/push -> update HANDOFF.md -> rerun`

Keep no uncommitted E2E files. Do not modify Prizgram body code from this E2E loop; record product or infra defects in the appropriate Prizgram issue instead.
