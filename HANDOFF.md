# HANDOFF

Updated: 2026-08-28 04:47 JST

## Repository state

- Repository: `kuraryu405/Prizgram-E2E-test`
- Branch: `main`
- Main/head SHA before this bootstrap phase: `eae6683a06825da1050e2c45659ababf3141bcf7`
- Last E2E code commit: `eae6683a06825da1050e2c45659ababf3141bcf7` (`test: keep document card scoped during title edit`)

## Golden Journey current step

- Current reached step in this session: **not started yet**.
- Next execution starts at step 01 and must stop at the first failure.
- Golden Journey contains 14 evidence steps in `tests/acceptance/golden-journey.spec.ts`.

## Error summary from this phase

The assistant execution container could not run the requested local command because outbound DNS/network access is blocked:

`fatal: unable to access 'https://github.com/kuraryu405/Prizgram-E2E-test.git/': Could not resolve host: github.com`

This happened before the Golden Journey itself ran. It is not evidence of a Prizgram production failure.

## Classification

- E2E-origin: **No product/test failure observed yet**.
- Prizgram-body-origin: **No new body bug observed in this phase**.
- Production infra-origin: **No new production infra failure observed in this phase**.
- Execution-tool infra-origin: **Yes** — this chat container cannot reach GitHub/production directly.

To reproduce the requested production run despite that restriction, this phase adds a temporary one-shot GitHub Actions workflow that runs the exact production Golden suite with mutation and production explicitly enabled. Remove the workflow after the run is diagnosed.

## Files changed in this phase

- `.github/workflows/production-golden-once.yml` — temporary path-scoped push workflow for the requested production Golden run.
- `HANDOFF.md` — this handoff record.

## Commit SHA

- Code/head entering phase: `eae6683a06825da1050e2c45659ababf3141bcf7`
- Bootstrap commit SHA: **record after commit is created**.

## Existing Prizgram issues relevant to prior Golden failures

- #300 `SCHEMA_VALIDATION_FAILED` during production job scoring — closed/completed.
- #301 repeated Cloudflare 502 Host Error during job scoring — open.
- #302 ES answer `onBlur` save vs submit race — closed/completed.
- #303 application update success message lost after `router.refresh()` remount — closed/completed.

## Unresolved items

1. Run the production Golden Journey at current `main`.
2. Record the first failing step and complete error/log evidence.
3. Classify it as E2E / Prizgram body / production infra.
4. If E2E-origin, make the smallest E2E fix, run `pnpm typecheck`, commit/push, update this file, and rerun.
5. If Prizgram-body-origin, do not modify Prizgram from this repository; create or update a Prizgram issue and record the number here.
6. If infra-origin, record the evidence and update/create the corresponding infra issue; do not hide it in E2E.
7. When Golden passes all 14 steps, delete `.github/workflows/production-golden-once.yml`, update this file with the final passing SHA/run, and leave no uncommitted state.

## Next command

Local canonical command:

```bash
git pull --ff-only
E2E_BASE_URL=https://prizgram.kuraryu.jp E2E_ALLOW_MUTATION=true E2E_ALLOW_PRODUCTION=true pnpm test:golden
```

In this chat session, inspect the GitHub Actions run triggered by the commit that adds `.github/workflows/production-golden-once.yml`.

## If the next run fails, inspect these first

- Always: `tests/acceptance/golden-journey.spec.ts`
- Step 01: `src/support/account.ts`
- Step 02: `src/support/persona.ts`
- Step 03: `src/support/jobs.ts`
- Step 04 / 10: `src/support/applications.ts`
- Step 05: `src/support/deadlines.ts`
- Step 06: `src/support/documents.ts`
- Step 07: `src/support/es-ai.ts`
- Step 08 / 09: `src/support/interview.ts`
- Step 11 / 12: `src/support/persona-update.ts`
- Step 13: `src/support/dashboard.ts`
- Cross-cutting API diagnostics: `src/support/api.ts`, `src/support/evidence.ts`, `src/support/env.ts`, `scripts/run-playwright.mjs`, `playwright.config.ts`

## Required cycle for every subsequent phase

`run -> diagnose first failure -> smallest fix -> typecheck -> commit/push -> update HANDOFF.md -> rerun`

Do not continue long investigations with uncommitted E2E changes. Do not make Prizgram body changes from this E2E session.