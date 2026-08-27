# HANDOFF

Updated: 2026-08-28 05:10 JST

## Repository state

- Repository: `kuraryu405/Prizgram-E2E-test`
- Branch: `main`
- Main/head before this HANDOFF commit: `4f9785929d72cc95eebe570346d8c5f46192671d`
- Latest E2E code commit: `c34c740589a70f8652e09b5c114a676eb61d7e9a` (`test: retry transient Cloudflare failure in persona proposal`)
- Latest production-Golden trigger commit tested: `dd56fa99f7cde6e2fe8081c4c6fcd168cfc6badf`
- Latest Actions run: `33111116744`, job `98653884224`
- Golden target: `https://prizgram.kuraryu.jp`

## Golden Journey current step

Latest Playwright retry completed Steps **01 through 07** and failed at **Step 08: 面接想定質問から回答骨子と深掘りを生成**.

The retry progressed through expected-question generation and answer-outline generation. The current Step 08 blocker is **interview follow-up generation**.

The first Playwright attempt of the same run failed earlier at **Step 02 Persona generation** due the same Cloudflare HTML 502 class. This is infra evidence, not a regression of the Step 02 E2E flow: Playwright retry subsequently passed Steps 01-07.

## Latest error summary

Actions run `33111116744` checked out `dd56fa99f7cde6e2fe8081c4c6fcd168cfc6badf` and `pnpm typecheck` passed.

### Attempt 1 — Step 02

`POST /api/persona/generate` returned a Cloudflare-generated HTML 502 page.

- HTTP: `502 Bad gateway`
- HTML title: `kuraryu.jp | 502: Bad gateway`
- Cloudflare error-page timestamp: `2026-08-27 20:02:42 UTC` / `2026-08-28 05:02:42 JST`
- Stack: `createPersonaFromFixture -> runAndRequireAiResponse -> requireSuccessfulResponse`
- Step 01 evidence was created before failure.

Do not add an immediate blind retry here. Prizgram's Persona generation is idempotent by intake, but a process crash after claiming the intake can leave a non-stale `completed` claim that intentionally returns 409 until `personaGenerationStaleMs()` elapses.

### Playwright retry #1 — Step 08

Steps 01-07 passed. Interview follow-up generation exhausted the bounded safe-AI Cloudflare retry policy:

`Interview follow-up generation failed after 3 attempts because Cloudflare repeatedly returned an HTML 502 Bad Gateway.`

Final diagnostics:

- `content-type=text/html; charset=UTF-8`
- `server=cloudflare`
- `cf-ray=a31db1eb1de2ba52-SEA`
- HTML title: `kuraryu.jp | 502: Bad gateway`
- Final Cloudflare error-page timestamp: `2026-08-27 20:06:14 UTC` / `2026-08-28 05:06:14 JST`

Evidence/debug artifacts from run `33111116744`:

- production-golden-evidence artifact ID: `9662773852`
- production-golden-debug artifact ID: `9662776332`

## Classification

- E2E-origin: **No** for the observed failure. `pnpm typecheck` is green and the retry helper behaved as designed.
- Prizgram-body-origin: **Not proven**. No application JSON error/schema error was observed in this run.
- Production infra-origin: **Yes / strongest classification**. Multiple LLM routes are returning Cloudflare-generated HTML 502 pages.
- Existing infra issue: **Prizgram #301**.

The same failure class has now been observed on job scoring, interview question/follow-up generation, and Persona generation. Do not raise retry counts merely to force Golden green.

## Deploy-overlap check

GitHub Actions CD does **not** explain the latest 502 window:

- Golden failures: `20:02:42 UTC` and `20:06:14 UTC`.
- Latest main `CD / Deploy LXC` run visible before those failures: run `33102075196`, `18:09:38-18:09:41 UTC`, conclusion `skipped`.
- Querying Actions by current Prizgram main merge SHA `d1948a1083ed19d2b7c69cde9575d566f970ba85` returned zero runs.

Therefore this run did not overlap the normal GitHub Actions deployment restart window. Runtime process/tunnel instability remains the leading hypothesis.

## Files changed in the E2E hardening phase

- `src/support/api-waits.ts` — bounded Cloudflare HTML 502 retry helper for safe/pure AI calls.
- `src/support/interview.ts` — safe retry for interview generation calls.
- `src/support/es-ai.ts` — safe retry for pure ES AI generation calls.
- `src/support/persona-update.ts` — safe retry for Persona update proposal generation only.
- `.github/workflows/production-golden-once.yml` — temporary production Golden runner used because the chat container cannot reach production/GitHub directly.
- `HANDOFF.md` — persistent checkpoint.

## Commit SHAs

E2E hardening:

- `6d94415ee6800fee367e454f44200bbdae38f186`
- `3c9dc21363a69d27acae0c53e3c8f7935c45a25e`
- `a6578e136ab924de7361403e77bd2abaa7be9d45`
- `ea32d74ec176efe1238c21c9fe8865747eaedf42`
- `c34c740589a70f8652e09b5c114a676eb61d7e9a`

Execution/checkpoints:

- `dd56fa99f7cde6e2fe8081c4c6fcd168cfc6badf` — latest tested Golden trigger commit.
- `4f9785929d72cc95eebe570346d8c5f46192671d` — head before this HANDOFF update.
- This HANDOFF update commit: **use the commit containing this file as the new head**.

## Prizgram issues

- #300 — production LLM scoring schema validation failure; fix history/closed.
- #301 — Cloudflare HTML 502 runtime infra investigation; **open and updated** with run `33111116744`, Step 02 + Step 08 evidence, final `cf-ray`, and the no-CD-overlap finding.
- #302 — ES answer onBlur save vs submit race; fix history/closed.
- #303 — application update success message lost after refresh; fix history/closed.

## Unresolved items

1. #301 remains the current production blocker.
2. Server-side logs around `2026-08-27 20:02:42 UTC` and `20:06:14 UTC` are still needed to distinguish `prizgram-web.service` crash/OOM from cloudflared-origin connection loss.
3. Run another production Golden cycle now that no deploy is active; if transient infra stays stable, continue first-failure triage beyond Step 08.
4. If the same safe AI operation returns Cloudflare HTML 502 three times again, keep it as #301 infra failure; do not increase retries indefinitely.
5. If the next failure is application JSON 5xx/schema/functional behavior, classify separately and create/update a Prizgram issue without changing Prizgram body code.
6. When all 14 steps pass, remove `.github/workflows/production-golden-once.yml`, update this HANDOFF with final passing run/SHA/evidence, commit/push.

## Next command

Canonical local command:

```bash
git pull --ff-only
git rev-parse --short HEAD
pnpm typecheck
E2E_BASE_URL=https://prizgram.kuraryu.jp \
E2E_ALLOW_MUTATION=true \
E2E_ALLOW_PRODUCTION=true \
pnpm test:golden
```

In this chat environment, trigger the temporary production workflow by changing only its rerun marker; the workflow itself runs `pnpm typecheck` then `pnpm test:golden` against the exact checked-out head.

## If the next run fails, inspect these first

- Step 02: `src/support/persona.ts`; Prizgram `apps/web/src/app/api/persona/generate/route.ts`, `apps/web/src/server/persona/service.ts` for contract classification only.
- Step 08 / 09: `src/support/interview.ts`, `src/support/api-waits.ts`.
- Step 10: `src/support/applications.ts`.
- Step 11 / 12: `src/support/persona-update.ts`.
- Step 13: `src/support/dashboard.ts`.
- Step 14: `tests/acceptance/golden-journey.spec.ts`, account/session helpers.
- Cross-cutting Cloudflare 502: #301 plus production `prizgram-web.service` / `cloudflared-prizgram.service` logs.

## Required cycle

`run -> diagnose first failure -> smallest safe fix -> typecheck -> commit/push -> update HANDOFF.md -> rerun`

Do not leave uncommitted E2E changes. Do not modify Prizgram body code from this loop. Do not hide real product/infra failures with unlimited retries.