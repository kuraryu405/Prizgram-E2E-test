# HANDOFF

Updated: 2026-08-28 08:43 JST

## Repository state

- Repository: `kuraryu405/Prizgram-E2E-test`
- E2E branch: `main`
- E2E code HEAD: `61a1bc3507295fa435087dbf032dab665df4d291` (`chore: lock E2E dependencies`)
- Prizgram production main HEAD: `d1948a1083ed19d2b7c69cde9575d566f970ba85`
- Target: `https://prizgram.kuraryu.jp` with explicit production and mutation opt-ins.

## Golden Journey current step

- Steps **01 through 07 passed** in the latest local production run.
- First failing step: **08 面接想定質問から回答骨子と深掘りを生成**.
- The failed operation was the first Step 08 call, **interview question generation** (`POST /api/applications/:id/interview-questions`).
- A final evidence MP4 and the Step 01--07 screenshots are at `artifacts/test-results/acceptance-golden-journey--d2a0b-story-as-one-evidence-video/` locally. The next execution intentionally starts again at Step 01 to preserve one continuous Golden Journey recording.

## Latest error summary

The local run of:

```bash
E2E_BASE_URL=https://prizgram.kuraryu.jp E2E_ALLOW_MUTATION=true E2E_ALLOW_PRODUCTION=true pnpm test:golden
```

failed after about three minutes. It was **not** an application JSON response:

- `Interview question generation failed after 3 attempts because Cloudflare repeatedly returned an HTML 502 Bad Gateway.`
- HTTP: `502 Bad gateway`; title: `kuraryu.jp | 502: Bad gateway`.
- Cloudflare error-page time: `2026-08-27 23:39:15 UTC` / `2026-08-28 08:39:15 JST`.
- Diagnostics: `content-type=text/html; charset=UTF-8`, `server=cloudflare`, `cf-ray=a31ee9b09c9ce3de-NRT`.
- The bounded retry applies only to side-effect-free AI generation and all three attempts received the same Cloudflare HTML 502. Application JSON 5xx and schema errors still fail without retry.
- `pnpm typecheck` passed before the Golden run.

## Classification

- E2E-origin: **No.** The locator and typecheck problems were fixed earlier; the current failure is an actual Cloudflare error page.
- Prizgram-body-origin: **Not proven.** No Prizgram JSON error or functional response was observed.
- Infra-origin: **Yes / leading classification.** This is a repeated Cloudflare HTML 502 across long-running AI routes.

## Changes and commits in this phase

- `pnpm-lock.yaml` -- committed the deterministic lockfile generated for the already pinned E2E dependencies, so the worktree is clean and subsequent runs use a reproducible dependency graph.
- `61a1bc3507295fa435087dbf032dab665df4d291` -- `chore: lock E2E dependencies`; pushed to `origin/main`.
- This HANDOFF update must be committed and pushed as the next commit before another investigation/run.

## Prizgram issue

- **#301** -- updated with this Step 08 `interview-questions` reproduction, timestamp, three-attempt limit, and `cf-ray=a31ee9b09c9ce3de-NRT`: https://github.com/kuraryu405/Prizgram/issues/301#issuecomment-5446510667
- #300, #302, and #303 are existing resolved/fix-history issues; no new evidence against them appeared in this run.

## Unresolved items

1. #301 needs production runtime evidence for `2026-08-27 23:38:30--23:40:30 UTC`: `prizgram-web.service`, `cloudflared-prizgram.service`, `NRestarts`, OOM events, and cloudflared origin-connect failures, correlated with the CF-Ray above.
2. Do not raise the E2E retry limit or modify Prizgram body code to hide this failure.
3. After the infra condition is addressed or proves transient, rerun the complete 14-step Golden Journey; do first-failure triage only if it reaches a new failure.
4. Remove the temporary `.github/workflows/production-golden-once.yml` only after a fully passing 14-step run is recorded.

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

- Cloudflare HTML 502: Prizgram #301, then the production `prizgram-web.service` and `cloudflared-prizgram.service` logs around the error timestamp.
- Step 08 behavior other than Cloudflare HTML 502: `src/support/interview.ts`, `src/support/api-waits.ts`, then the corresponding Prizgram route/service for issue classification only.
- Step 10: `src/support/applications.ts`.
- Step 11--12: `src/support/persona-update.ts`.
- Step 13: `src/support/dashboard.ts`.
- Step 14: `tests/acceptance/golden-journey.spec.ts` and account/session helpers.

## Required cycle

`run -> diagnose first failure -> smallest safe fix -> typecheck -> commit/push -> update HANDOFF.md -> rerun`

Keep no uncommitted E2E files. Do not modify Prizgram body code from this E2E loop; record product or infra defects in the appropriate Prizgram issue instead.
