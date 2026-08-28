# HANDOFF

Updated: 2026-08-28 17:03 JST

## Repository state

- Repository: `kuraryu405/Prizgram-E2E-test`, branch `main`.
- E2E code HEAD before this HANDOFF commit: `ab799d8c01e65d478476b686aef22a3f0fd23afc` (`docs: hand off full mobile golden run`).
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

The first mobile demo run passed functionally, but visual QA found the first recording had a 1080x2340 canvas with the 390px CSS viewport left at the top-left and gray padding for the remainder. This was caused by Playwright not upscaling a smaller viewport to a larger `video.size`.

The next mobile demo design was intentionally too narrow: it ran only Persona generation, job evaluation, and Persona update instead of the desktop S14 Golden Journey's complete 14 steps. This was an E2E scenario omission, not a runtime failure.

## Classification

- E2E-origin: **Yes; resolved.** `tests/acceptance/golden-journey.spec.ts` expected a nonexistent rejected-filter link instead of the visible rejected card state.
- Prizgram-body-origin: **No.** The observed URL is the application contract.
- Infra-origin: **No.** No service/health error occurred.
- Mobile demo phase: **Complete: full S14 step 01--14 passed in one continuous production run.**
- The gray-padding issue is **E2E-origin** (`tests/acceptance/mobile-demo.spec.ts` / `scripts/run-playwright.mjs`), not a Prizgram UI or infrastructure failure.
- The first corrected video ended on the求人検索 screen because the test performed a redundant final verification navigation; this is also **E2E-origin** and does not indicate a Prizgram UI failure.
- Final rerun passed with no `error-context.md`; the final frame shows Persona バージョン2.
- Evidence: `artifacts/test-results/acceptance-mobile-demo-Mob-007cb-nes-as-one-continuous-story/video.mp4` — H.264, 1080x2340, 25 fps, 95.84 s.
- The three-scene omission is **E2E-origin** and is corrected by making the mobile demo use the same 14-step sequence as `tests/acceptance/golden-journey.spec.ts`.
- Full mobile rerun passed: `.last-run.json` is `passed`, 14 evidence PNGs were produced, and the main portrait video is 237.80 s. The auxiliary 1.20 s recording is from the helper's temporary verification page; `video.mp4` is the demo deliverable.

## Mobile demo current step

- Dedicated mobile demo scenario is implemented and complete against production for all 14 Golden Journey steps.
- Target recording: 390x844 CSS px, DPR 3, portrait 1080x2340 MP4.
- Scenes: the complete Golden Journey step 01--14 sequence, including registration, Persona, job evaluation, application, deadline, manual ES, ES AI, interview, reflection, rejection, Persona update, dashboard, and re-login persistence.
- Evidence: `artifacts/test-results/acceptance-mobile-demo-Mob-89d84-one-portrait-evidence-video/video.mp4` — H.264, 1080x2340, 25 fps, 237.80 s; 14 step evidence images; final screen is the persisted rejected application state after re-login.

## Fix committed in this phase

- `tests/acceptance/golden-journey.spec.ts`
  - Verifies the rejected application card in `応募一覧`, rather than a nonexistent filter link.
- Commit `40d9c11bc6b8552a29118cd4e99631e3b8f1e960` — `fix(golden): assert rejected application status`; pushed to `origin/main`.
- `pnpm typecheck` and `git diff --check` passed.
- `.github/workflows/production-golden-once.yml`
  - Removed after the fully passing production run; it was a temporary one-shot workflow.
- Commit `ffd04f4bc115a7a1c6f8ab2a6642541d6f984c9b` — `chore: remove one-shot production Golden workflow`; pushed to `origin/main`.
- `tests/acceptance/mobile-demo.spec.ts`
  - Adds the continuous mobile demo story using synthetic E2E fixtures.
- `package.json`
  - Adds `pnpm test:mobile-demo`.
- `scripts/run-playwright.mjs`
  - Enables human-readable pacing for the mobile demo.
- Commit `2a87943a8fde8a3243a3d6a2a0c37338418a4348` — `feat(e2e): add high-resolution mobile demo flow`; pushed to `origin/main`.
- `pnpm typecheck` and `git diff --check` passed.
- `tests/acceptance/mobile-demo.spec.ts` now records at the actual 390x844 mobile viewport.
- `scripts/run-playwright.mjs` upscales only the mobile demo MP4 to 1080x2340 with Lanczos scaling and CRF 18.
- Commit `fe01560` — `fix(e2e): fill mobile demo video frame`; pushed to `origin/main`.
- `pnpm typecheck` and `git diff --check` passed.
- `tests/acceptance/mobile-demo.spec.ts` now ends on the updated Persona v2 screen after the three demo scenes.
- Commit `a1452ae` — `fix(e2e): end mobile demo on updated persona`; pushed to `origin/main`.
- `pnpm typecheck` and `git diff --check` passed.
- `tests/acceptance/mobile-demo.spec.ts` now mirrors the desktop Golden Journey's full 14-step sequence.
- Commit `fc558a7` — `feat(e2e): run full golden journey in mobile demo`; pushed to `origin/main`.
- `pnpm typecheck` and `git diff --check` passed.

## Prizgram issues

- #305 — interview AI structured-output error; fixed by deployed PR #306.
- #307 — safe deployment backup without `sqlite3` CLI; fixed by deployed PR #308.
- #301 — only for a future Cloudflare HTML 502 without matching origin application error.

## Unresolved items

- None for the requested E2E mobile demo. Golden Journey and full mobile Golden Journey are complete; the workspace is clean.

## Next command (再現する場合)

```bash
git pull --ff-only
pnpm typecheck
E2E_BASE_URL=https://prizgram.kuraryu.jp \
E2E_ALLOW_MUTATION=true \
E2E_ALLOW_PRODUCTION=true \
pnpm test:mobile-demo
```

## If the next run fails, inspect these first

- Step 14: `tests/acceptance/golden-journey.spec.ts`, `apps/web/src/app/applications/page.tsx`, `src/support/account.ts`, then session persistence.
- Cloudflare HTML 502: #301 plus timestamp-correlated `prizgram-web.service` / `cloudflared-prizgram.service` logs.
- Step 08: deployed #306 / `apps/web/src/server/interview-ai/schemas.ts` and service.
- Step 10--13: corresponding E2E support helpers and visible evidence screenshot.
- Mobile demo: `tests/acceptance/mobile-demo.spec.ts`, `tests/acceptance/golden-journey.spec.ts`, `scripts/run-playwright.mjs`, and the support helpers used by steps 01--14.
- Video quality: `playwright.config.ts`, `scripts/run-playwright.mjs`, then generated MP4 `ffprobe` metadata.

## Required cycle

`run -> diagnose first failure -> smallest safe fix -> typecheck -> commit/push -> update HANDOFF.md -> rerun`

Keep no uncommitted E2E files. Do not hide real product failures with E2E retries.
