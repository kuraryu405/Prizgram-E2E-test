# HANDOFF

Updated: 2026-08-28 04:56 JST

## Repository state

- Repository: `kuraryu405/Prizgram-E2E-test`
- Branch: `main`
- E2E code head before this HANDOFF-only commit: `c34c740589a70f8652e09b5c114a676eb61d7e9a`
- Latest E2E code commit: `c34c740589a70f8652e09b5c114a676eb61d7e9a` (`test: retry transient Cloudflare failure in persona proposal`)
- Golden uses production target `https://prizgram.kuraryu.jp` with explicit mutation + production opt-ins.

## Golden Journey current step

- Steps **01 through 07 completed successfully** in the latest production run.
- Current first failing step: **08 面接想定質問から回答骨子と深掘りを生成**.
- Latest completed evidence step: **07 ES AI支援で経験選択から下書き添削まで実行**.
- The next run starts from step 01 because the final evidence video is intentionally one continuous Golden Journey.

## Latest error summary

At Step 08, `POST /api/applications/:id/interview-questions` returned a Cloudflare-generated HTML 502 page:

- HTTP status: `502 Bad gateway`
- HTML title: `kuraryu.jp | 502: Bad gateway`
- Body contains Cloudflare 5xx landing page markup (`cf-wrapper`, `cf-error-details`).
- Error page timestamp: **2026-08-27 19:52:09 UTC** / **2026-08-28 04:52:09 JST**.
- This was not an application JSON `UPSTREAM_INVALID_RESPONSE` response.

Relevant stack:

`generateInterviewQuestions -> runAndRequireAiResponse -> requireSuccessfulResponse`

The run lasted about 2.5 minutes and produced evidence screenshots for Steps 01-07 plus failed-run WebM/MP4/trace.

## Classification

- E2E-origin: **No for the observed 502**. The E2E correctly surfaced an actual Cloudflare HTML 502.
- Prizgram-body-origin: **No new product-body defect proven by this failure**.
- Production infra-origin: **Yes / currently most likely**. The response itself was a Cloudflare-generated HTML 502.
- E2E hardening applied: **Yes**. Safe/pure AI generation calls now retry only Cloudflare-generated HTML 502 up to 3 attempts. App JSON errors and schema failures still fail immediately.

## E2E changes made in this phase

1. `src/support/api-waits.ts`
   - Added `runAndRequireRetryableAiResponse`.
   - Retries only Cloudflare HTML 502 for AI operations explicitly known to be safe to repeat.
   - Maximum 3 attempts.
   - Non-Cloudflare errors fail immediately.
   - Final repeated Cloudflare failure includes non-secret diagnostic headers: `content-type`, `server`, `cf-ray`, `cf-error-type`, `cf-error-origin` when present.

2. `src/support/interview.ts`
   - Interview expected-question generation, answer-outline generation, and follow-up generation use the safe retry helper.
   - These server operations are pure generation and do not persist DB mutations.

3. `src/support/es-ai.ts`
   - ES episode search, draft generation, and revision generation use the safe retry helper.
   - Document creation/save/edit remain on non-retrying mutation paths.

4. `src/support/persona-update.ts`
   - Persona update **proposal generation only** uses the safe retry helper.
   - Approval and re-evaluation remain on the existing mutation-aware paths and are not blindly retried.

## Commits in this phase

- `6d94415ee6800fee367e454f44200bbdae38f186` — add retryable safe-AI Cloudflare handling.
- `3c9dc21363a69d27acae0c53e3c8f7935c45a25e` — apply it to interview AI.
- `a6578e136ab924de7361403e77bd2abaa7be9d45` — simplify diagnostic-header collection for TypeScript safety.
- `ea32d74ec176efe1238c21c9fe8865747eaedf42` — apply it to ES AI pure generation.
- `c34c740589a70f8652e09b5c114a676eb61d7e9a` — apply it to persona update proposal generation.

## Prizgram issues

- #300 — production LLM scoring schema validation failure. Existing issue; do not duplicate.
- #301 — Cloudflare HTML 502 / infra investigation. **Open and updated with the Step 08 reproduction at 2026-08-27 19:52:09 UTC.** The new reproduction proves the HTML 502 can occur on interview AI as well as job scoring, so it may be cross-cutting for long LLM requests rather than score-specific.
- #302 — ES answer onBlur save vs submit race. Existing issue/fix history.
- #303 — application update success message lost after refresh. Existing issue/fix history.

## Unresolved items

1. Run `pnpm typecheck` on the new E2E head.
2. Re-run the production Golden Journey.
3. If a single/transient Cloudflare HTML 502 occurs in a pure-generation AI step, the E2E should retry and continue.
4. If Cloudflare HTML 502 occurs 3 times for the same safe AI operation, keep it as a #301 infra failure; do not increase retries indefinitely.
5. If an application JSON 5xx or schema failure occurs, fail immediately and classify as Prizgram body/product unless existing issue coverage applies.
6. Continue the first-failure loop until all 14 steps pass and final MP4 evidence is produced.

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

- Step 08 / 09: `src/support/interview.ts`, `src/support/api-waits.ts`
- Step 10: `src/support/applications.ts`
- Step 11 / 12: `src/support/persona-update.ts`, corresponding Prizgram persona-update routes/service
- Step 13: `src/support/dashboard.ts`
- Step 14: `tests/acceptance/golden-journey.spec.ts`, account/session helpers; scope any persona-version assertion to the intended section if strict-mode text collisions appear
- Cross-cutting Cloudflare failures: capture the final retry diagnostics and update #301

## Required cycle

`run -> diagnose first failure -> smallest safe fix -> typecheck -> commit/push -> update HANDOFF.md -> rerun`

Do not modify Prizgram body code from the E2E debugging loop. For Prizgram body/infra defects, update or create an issue instead. Do not hide real product errors with E2E retries.