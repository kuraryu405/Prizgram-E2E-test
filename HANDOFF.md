# HANDOFF

Updated: 2026-08-28 08:48 JST

## Repository state

- Repository: `kuraryu405/Prizgram-E2E-test`
- E2E branch: `main`
- E2E code HEAD before this HANDOFF commit: `d4377ffa439085da4d55e3d739c4fc825c374670` (`docs: record latest Golden infra blocker`)
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

failed after about three minutes. The browser received a Cloudflare HTML 502 page, but a subsequent read-only origin-log correlation established the application root cause:

- `Interview question generation failed after 3 attempts because Cloudflare repeatedly returned an HTML 502 Bad Gateway.`
- HTTP: `502 Bad gateway`; title: `kuraryu.jp | 502: Bad gateway`.
- Cloudflare error-page time: `2026-08-27 23:39:15 UTC` / `2026-08-28 08:39:15 JST`.
- Diagnostics: `content-type=text/html; charset=UTF-8`, `server=cloudflare`, `cf-ray=a31ee9b09c9ce3de-NRT`.
- At the corresponding origin timestamps `23:38:36`, `23:38:56`, and `23:39:15 UTC`, `prizgram-web.service` logged `UPSTREAM_INVALID_RESPONSE` caused by `LlmClientError SCHEMA_VALIDATION_FAILED: The normalized content did not match its domain schema` for the same endpoint.
- The bounded retry applies only to side-effect-free AI generation and all three attempts received the Cloudflare HTML representation. The edge response masks/replaces the origin's 502 body in this case, so the E2E could not see the application JSON error directly.
- `pnpm typecheck` passed before the Golden run.

## Classification

- E2E-origin: **No.** The locator and typecheck problems were fixed earlier; the retry produced the evidence needed to diagnose the production failure.
- Prizgram-body-origin: **Yes.** Interview expected-question structured output fails the domain schema in the deployed application.
- Infra-origin: **No for this reproduction.** Web/tunnel `NRestarts=0`, no cloudflared journal event, and cgroup `oom=0`, `oom_kill=0` rule out the earlier leading hypothesis.

## Changes and commits in this phase

- `pnpm-lock.yaml` -- committed the deterministic lockfile generated for the already pinned E2E dependencies, so the worktree is clean and subsequent runs use a reproducible dependency graph.
- `61a1bc3507295fa435087dbf032dab665df4d291` -- `chore: lock E2E dependencies`; pushed to `origin/main`.
- `d4377ffa439085da4d55e3d739c4fc825c374670` -- prior Golden checkpoint; pushed to `origin/main`.
- This HANDOFF update records the root-cause correction and must be committed/pushed as the next commit before another run.

## Prizgram issue

- **#305** -- newly created Prizgram-body issue for interview expected-question `SCHEMA_VALIDATION_FAILED`: https://github.com/kuraryu405/Prizgram/issues/305
- **#301** -- corrected: this timestamp-correlated reproduction is not an infra outage; it has a matching application schema error: https://github.com/kuraryu405/Prizgram/issues/301#issuecomment-5446566876
- #300 is closed after the analogous scoring fix in merged/deployed PR #304. This run proves the same class remains in interview AI, now tracked separately as #305.

## Unresolved items

1. #305 needs a Prizgram-body fix: identify the exact failing expected-question domain field, constrain/normalize the provider schema safely, and add regression coverage. Do not make that code change in this E2E repository.
2. Do not raise the E2E retry limit to hide the schema failure.
3. Once #305 is fixed and deployed, rerun the complete 14-step Golden Journey; do first-failure triage only if it reaches a new failure.
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

- Step 08: Prizgram #305; `apps/web/src/server/interview-ai/schemas.ts` and `apps/web/src/server/interview-ai/service.ts`. Use `src/support/interview.ts` and `src/support/api-waits.ts` only to classify the response; do not hide application failures.
- Cloudflare HTML 502 without matching application error: #301, then the production `prizgram-web.service` and `cloudflared-prizgram.service` logs around the error timestamp.
- Step 10: `src/support/applications.ts`.
- Step 11--12: `src/support/persona-update.ts`.
- Step 13: `src/support/dashboard.ts`.
- Step 14: `tests/acceptance/golden-journey.spec.ts` and account/session helpers.

## Required cycle

`run -> diagnose first failure -> smallest safe fix -> typecheck -> commit/push -> update HANDOFF.md -> rerun`

Keep no uncommitted E2E files. Do not modify Prizgram body code from this E2E loop; record product or infra defects in the appropriate Prizgram issue instead.
