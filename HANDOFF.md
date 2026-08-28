# HANDOFF

Updated: 2026-08-28 11:18 JST

## Repository state

- Repository: `kuraryu405/Prizgram-E2E-test`, branch `main`.
- E2E code HEAD before this HANDOFF commit: `ffd04f4bc115a7a1c6f8ab2a6642541d6f984c9b` (`chore: remove one-shot production Golden workflow`).
- Prizgram Git main and deployed production release: `c3ece3c7419404f1622f8faa69a016fc05141143`.
- Deployed release verification: SQLite backup + `integrity_check`, migration, release switch, loopback/public health 200, active web/tunnel services, `NRestarts=0`.

## Golden Journey current step

- **Complete: Steps 01--14 passed** in one continuous production run against deployed `c3ece3c`.
- Step 14 confirmed logout/re-login persistence: Persona v2 and the `落選` application card remain visible.
- Evidence: `artifacts/test-results/acceptance-golden-journey--d2a0b-story-as-one-evidence-video/video.mp4` (218.32 s), with no `error-context.md` and `.last-run.json` status `passed`.
- UI review: final journey frames (including Persona and applications) show no layout breakage.

## Latest error summary

The previous Step 14 failure, now fixed and verified, was:

```text
expect(locator).toHaveAttribute failed
Locator: getByRole('link', {name:'落選', exact:true})
Expected "true"
element(s) not found
```

The application list only exposes workflow filters through `offer`; `rejected` is correctly rendered on the application card, not as a filter navigation link. The failure screenshot shows the E2E application card and its `落選` state. The corrected assertion scopes to the `応募一覧` region, checks that app's card is visible, and checks its text for `落選`.

## Classification

- E2E-origin: **Yes; resolved.** `tests/acceptance/golden-journey.spec.ts` expected a nonexistent rejected-filter link instead of the visible rejected card state.
- Prizgram-body-origin: **No.** The observed URL is the application contract.
- Infra-origin: **No.** No service/health error occurred.

## Fix committed in this phase

- `tests/acceptance/golden-journey.spec.ts`
  - Verifies the rejected application card in `応募一覧`, rather than a nonexistent filter link.
- Commit `40d9c11bc6b8552a29118cd4e99631e3b8f1e960` — `fix(golden): assert rejected application status`; pushed to `origin/main`.
- `pnpm typecheck` and `git diff --check` passed.
- `.github/workflows/production-golden-once.yml`
  - Removed after the fully passing production run; it was a temporary one-shot workflow.
- Commit `ffd04f4bc115a7a1c6f8ab2a6642541d6f984c9b` — `chore: remove one-shot production Golden workflow`; pushed to `origin/main`.

## Prizgram issues

- #305 — interview AI structured-output error; fixed by deployed PR #306.
- #307 — safe deployment backup without `sqlite3` CLI; fixed by deployed PR #308.
- #301 — only for a future Cloudflare HTML 502 without matching origin application error.

## Unresolved items

- None. Golden Journey is complete and the workspace must remain clean.

## Next command

```bash
git pull --ff-only
pnpm typecheck
E2E_BASE_URL=https://prizgram.kuraryu.jp \
E2E_ALLOW_MUTATION=true \
E2E_ALLOW_PRODUCTION=true \
pnpm test:golden
```

## If the next run fails, inspect these first

- Step 14: `tests/acceptance/golden-journey.spec.ts`, `apps/web/src/app/applications/page.tsx`, `src/support/account.ts`, then session persistence.
- Cloudflare HTML 502: #301 plus timestamp-correlated `prizgram-web.service` / `cloudflared-prizgram.service` logs.
- Step 08: deployed #306 / `apps/web/src/server/interview-ai/schemas.ts` and service.
- Step 10--13: corresponding E2E support helpers and visible evidence screenshot.

## Required cycle

`run -> diagnose first failure -> smallest safe fix -> typecheck -> commit/push -> update HANDOFF.md -> rerun`

Keep no uncommitted E2E files. Do not hide real product failures with E2E retries.
