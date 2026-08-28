# HANDOFF

Updated: 2026-08-28 11:13 JST

## Repository state

- Repository: `kuraryu405/Prizgram-E2E-test`, branch `main`.
- E2E code HEAD before this HANDOFF commit: `40d9c11bc6b8552a29118cd4e99631e3b8f1e960` (`fix(golden): assert rejected application status`).
- Prizgram Git main and deployed production release: `c3ece3c7419404f1622f8faa69a016fc05141143`.
- Deployed release verification: SQLite backup + `integrity_check`, migration, release switch, loopback/public health 200, active web/tunnel services, `NRestarts=0`.

## Golden Journey current step

- Steps **01--13 passed** in the latest continuous production run; their screenshots prove the UI through final dashboard and Persona v2 rendering.
- First failing step: **14 ログアウト再ログイン後も状態が永続化**.
- The logout redirect assertion was fixed and rerun reached the final rejected-application persistence assertion. Next run starts at Step 01 for one continuous evidence video.

## Latest error summary

The latest production Golden ran about four minutes against deployed `c3ece3c` and failed with:

```text
expect(locator).toHaveAttribute failed
Locator: getByRole('link', {name:'落選', exact:true})
Expected "true"
element(s) not found
```

The application list only exposes workflow filters through `offer`; `rejected` is correctly rendered on the application card, not as a filter navigation link. The failure screenshot shows the E2E application card and its `落選` state. The corrected assertion scopes to the `応募一覧` region, checks that app's card is visible, and checks its text for `落選`.

## Classification

- E2E-origin: **Yes.** `tests/acceptance/golden-journey.spec.ts` expected a nonexistent rejected-filter link instead of the visible rejected card state.
- Prizgram-body-origin: **No.** The observed URL is the application contract.
- Infra-origin: **No.** No service/health error occurred.

## Fix committed in this phase

- `tests/acceptance/golden-journey.spec.ts`
  - Verifies the rejected application card in `応募一覧`, rather than a nonexistent filter link.
- Commit `40d9c11bc6b8552a29118cd4e99631e3b8f1e960` — `fix(golden): assert rejected application status`; pushed to `origin/main`.
- `pnpm typecheck` and `git diff --check` passed.

## Prizgram issues

- #305 — interview AI structured-output error; fixed by deployed PR #306.
- #307 — safe deployment backup without `sqlite3` CLI; fixed by deployed PR #308.
- #301 — only for a future Cloudflare HTML 502 without matching origin application error.

## Unresolved items

1. Rerun the full production Golden on E2E HEAD `40d9c11`.
2. If all 14 steps pass, inspect the final continuous MP4/screenshots for UI regression and record final status/SHA in this HANDOFF.
3. Remove `.github/workflows/production-golden-once.yml` only after full success.
4. If a new failure occurs, diagnose only it, make the smallest correct E2E/Prizgram fix, typecheck, commit/push, update HANDOFF, then rerun.

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

- Step 14: `tests/acceptance/golden-journey.spec.ts`, `apps/web/src/app/app/applications/page.tsx`, `src/support/account.ts`, then session persistence.
- Cloudflare HTML 502: #301 plus timestamp-correlated `prizgram-web.service` / `cloudflared-prizgram.service` logs.
- Step 08: deployed #306 / `apps/web/src/server/interview-ai/schemas.ts` and service.
- Step 10--13: corresponding E2E support helpers and visible evidence screenshot.

## Required cycle

`run -> diagnose first failure -> smallest safe fix -> typecheck -> commit/push -> update HANDOFF.md -> rerun`

Keep no uncommitted E2E files. Do not hide real product failures with E2E retries.
