# HANDOFF

Updated: 2026-08-28 10:59 JST

## Repository state

- Repository: `kuraryu405/Prizgram-E2E-test`, branch `main`.
- E2E code HEAD before this HANDOFF commit: `e36c15aaa5368516bfd61a22215217f814679082` (`fix(persona-update): unwrap reevaluation API result`).
- Prizgram Git main and deployed production release: `c3ece3c7419404f1622f8faa69a016fc05141143`.
- Deployment was verified: SQLite backup + `integrity_check`, migration, release switch, loopback/public health 200, active web/tunnel services, `NRestarts=0`.

## Golden Journey current step

- Steps **01--11 passed** in the latest continuous production run. Their evidence PNGs and an MP4 exist under `artifacts/test-results/acceptance-golden-journey--d2a0b-story-as-one-evidence-video/`.
- Step **12: 明示承認でPersona v2を作り求人を再評価** reached a visible successful re-evaluation (`再評価済み`, `全ての求人の再評価が完了しました。`) but the E2E helper then crashed.
- The next run must restart at Step 01 to preserve one continuous final evidence video.

## Latest error summary

The latest `pnpm test:golden` ran about 3.9 minutes against deployed `c3ece3c` and failed after the first `/api/persona/update/re-evaluate` success:

```text
TypeError: Cannot read properties of undefined (reading 'filter')
at requireSuccessfulReevaluation (src/support/persona-update.ts:31)
```

Cause: the route returns `apiResult({ audit, remainingJobs })`, i.e. `{ ok, data: { audit, remainingJobs }, requestId }`, but E2E read `audit` as a top-level field. This was not a product/UI failure; the page snapshot proves the UI showed a successful re-evaluation.

## Classification

- E2E-origin: **Yes.** API result envelope was decoded incorrectly.
- Prizgram-body-origin: **No for this failure.** #305 interview structured-output fix is deployed and Step 08 passed.
- Infra-origin: **No.** Production services/health stayed healthy.

## Fix committed in this phase

- `src/support/persona-update.ts`
  - Unwraps `apiResult.data` before checking `audit` and `remainingJobs`.
  - Validates the envelope at runtime, producing a descriptive E2E error instead of a TypeError if the contract changes again.
- Commit `e36c15aaa5368516bfd61a22215217f814679082` — `fix(persona-update): unwrap reevaluation API result`; pushed to `origin/main`.
- `pnpm typecheck` passed. The E2E package does not include Prettier; the attempted format command therefore reported `Command "prettier" not found` before no formatting was applied.

## Prizgram issues

- #305 — interview AI structured-output error; fixed by deployed PR #306.
- #307 — safe deployment backup without `sqlite3` CLI; fixed by deployed PR #308.
- #301 — only for a future Cloudflare HTML 502 without a matching origin application error.

## Unresolved items

1. Run production Golden from Step 01 on E2E HEAD `e36c15a`.
2. Inspect the final MP4/screenshots if all 14 steps pass; this is the UI regression evidence.
3. If a new failure occurs, diagnose only that first failure, then make the smallest E2E or Prizgram change, typecheck, commit/push, update HANDOFF, and rerun.
4. Remove `.github/workflows/production-golden-once.yml` only after full Golden success.

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

- Step 12: `src/support/persona-update.ts`, API envelope from `apps/web/src/app/api/persona/update/re-evaluate/route.ts`.
- Step 13: `src/support/dashboard.ts`.
- Step 14: `tests/acceptance/golden-journey.spec.ts` and account/session helpers.
- Cloudflare HTML 502: #301 plus timestamp-correlated `prizgram-web.service` / `cloudflared-prizgram.service` logs.

## Required cycle

`run -> diagnose first failure -> smallest safe fix -> typecheck -> commit/push -> update HANDOFF.md -> rerun`

Keep no uncommitted E2E files. Do not hide real product failures with E2E retries.
