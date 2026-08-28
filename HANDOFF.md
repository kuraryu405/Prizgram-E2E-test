# HANDOFF

Updated: 2026-08-28 11:05 JST

## Repository state

- Repository: `kuraryu405/Prizgram-E2E-test`, branch `main`.
- E2E code HEAD before this HANDOFF commit: `c9b7ef42f07af3560324cc9cfbb5257821e844cb` (`fix(account): assert logout login redirect`).
- Prizgram Git main and deployed production release: `c3ece3c7419404f1622f8faa69a016fc05141143`.
- Deployed release verification: SQLite backup + `integrity_check`, migration, release switch, loopback/public health 200, active web/tunnel services, `NRestarts=0`.

## Golden Journey current step

- Steps **01--13 passed** in the latest continuous production run; their screenshots prove the UI through final dashboard and Persona v2 rendering.
- First failing step: **14 ログアウト再ログイン後も状態が永続化**.
- The failure occurred immediately after logout, before the actual re-login/persistence checks. Next run starts at Step 01 for one continuous evidence video.

## Latest error summary

The latest production Golden ran about four minutes against deployed `c3ece3c` and failed with:

```text
Expected URL: /\/$/
Received: https://prizgram.kuraryu.jp/login?next=%2Fapp
```

This is the intended app-shell logout behavior: the protected `/app` route redirects an unauthenticated user to `/login?next=%2Fapp`. The app's own `app-shell.test.tsx` asserts the same destination. The final dashboard screenshot and previous Step 13 evidence show no UI regression before this assertion.

## Classification

- E2E-origin: **Yes.** `src/support/account.ts` expected the wrong logout URL.
- Prizgram-body-origin: **No.** The observed URL is the application contract.
- Infra-origin: **No.** No service/health error occurred.

## Fix committed in this phase

- `src/support/account.ts`
  - Expects `/login?next=%2Fapp` after logout and confirms the login heading is visible.
- Commit `c9b7ef42f07af3560324cc9cfbb5257821e844cb` — `fix(account): assert logout login redirect`; pushed to `origin/main`.
- `pnpm typecheck` passed. The E2E package does not include Prettier; its attempted format command previously reported `Command "prettier" not found` without changing files.

## Prizgram issues

- #305 — interview AI structured-output error; fixed by deployed PR #306.
- #307 — safe deployment backup without `sqlite3` CLI; fixed by deployed PR #308.
- #301 — only for a future Cloudflare HTML 502 without matching origin application error.

## Unresolved items

1. Rerun the full production Golden on E2E HEAD `c9b7ef4`.
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

- Step 14: `src/support/account.ts`, `src/support/auth` helpers, `apps/web/src/components/app/app-shell.tsx`, then session persistence.
- Cloudflare HTML 502: #301 plus timestamp-correlated `prizgram-web.service` / `cloudflared-prizgram.service` logs.
- Step 08: deployed #306 / `apps/web/src/server/interview-ai/schemas.ts` and service.
- Step 10--13: corresponding E2E support helpers and visible evidence screenshot.

## Required cycle

`run -> diagnose first failure -> smallest safe fix -> typecheck -> commit/push -> update HANDOFF.md -> rerun`

Keep no uncommitted E2E files. Do not hide real product failures with E2E retries.
