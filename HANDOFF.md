# HANDOFF

Updated: 2026-08-28 05:04 JST

## Repository state

- Repository: `kuraryu405/Prizgram-E2E-test`
- Branch: `main`
- E2E code head before this HANDOFF-only commit: `49e96fe2206c92a34ea2fedbfe4067bee8544096`
- Golden target: `https://prizgram.kuraryu.jp`
- Final evidence remains one continuous Golden Journey with MP4 conversion.

## Golden Journey current step

- Steps **01 through 07 completed successfully** in the latest production run.
- Current first failing step: **08 面接想定質問から回答骨子と深掘りを生成**.
- Latest completed evidence step: **07 ES AI支援で経験選択から下書き添削まで実行**.
- Step 08 progressed beyond expected-question generation and answer-outline generation; the current failure is **interview follow-up generation**.

## Latest error summary

`POST /api/applications/:id/interview-followup` returned a Cloudflare-generated HTML 502 on all 3 safe retry attempts.

Final retry diagnostics:

- HTTP: `502 Bad gateway`
- `content-type=text/html; charset=UTF-8`
- `server=cloudflare`
- `cf-ray=a31dab9ebd53a0b5-NRT`
- HTML title: `kuraryu.jp | 502: Bad gateway`
- Cloudflare error page timestamp: **2026-08-27 20:02:00 UTC / 2026-08-28 05:02:00 JST**
- Golden duration before failure: about **4.2 minutes**

The E2E retry helper already distinguishes Cloudflare HTML 502 from application JSON 5xx. This failure satisfied the Cloudflare HTML condition three consecutive times.

## Classification

- E2E-origin: **No** for the observed failure. The E2E behaved as designed and exhausted the bounded safe retry policy.
- Prizgram-body-origin: **Not proven by this failure**.
- Production infra-origin: **Yes / strongest current classification**.
- Existing infra issue: **Prizgram #301**.

Do **not** increase retry count merely to make Golden pass. A 3x repeated Cloudflare HTML 502 is treated as an actual production blocker.

## E2E hardening already present

Safe/pure AI generation calls retry only Cloudflare-generated HTML 502 up to 3 attempts:

- ES episode search / draft generation / revision generation
- Interview expected questions / answer outline / follow-up generation
- Persona update proposal generation

Application JSON errors, schema failures, and mutating operations are not blindly retried.

## Current E2E commits

- `6d94415ee6800fee367e454f44200bbdae38f186` — add safe-AI Cloudflare retry helper
- `3c9dc21363a69d27acae0c53e3c8f7935c45a25e` — apply helper to interview AI
- `a6578e136ab924de7361403e77bd2abaa7be9d45` — simplify diagnostic header collection
- `ea32d74ec176efe1238c21c9fe8865747eaedf42` — apply helper to ES AI
- `c34c740589a70f8652e09b5c114a676eb61d7e9a` — apply helper to persona proposal
- `49e96fe2206c92a34ea2fedbfe4067bee8544096` — previous HANDOFF checkpoint

## Prizgram issues

- #300 — LLM scoring schema validation failure; existing/fix history.
- #301 — Cloudflare HTML 502 / infra investigation. **Updated again** with the Step 08 follow-up failure, error-page timestamp `2026-08-27 20:02:00 UTC`, and `cf-ray=a31dab9ebd53a0b5-NRT`.
- #302 — ES answer onBlur save vs submit race; existing/fix history.
- #303 — application update success message lost after refresh; existing/fix history.

## Unresolved blocker

Before spending more time on repeated full Golden runs, investigate #301 at the exact failing time.

Read-only production checks around **2026-08-27 20:01:00–20:03:00 UTC**:

```bash
journalctl --user -u prizgram-web.service \
  --since "2026-08-27 20:01:00" \
  --until "2026-08-27 20:03:00" --no-pager

journalctl --user -u cloudflared-prizgram.service \
  --since "2026-08-27 20:01:00" \
  --until "2026-08-27 20:03:00" --no-pager

systemctl --user show prizgram-web.service \
  -p ActiveState -p SubState -p ExecMainStartTimestamp \
  -p ExecMainExitTimestamp -p ExecMainCode -p ExecMainStatus -p NRestarts
```

Correlate with `cf-ray=a31dab9ebd53a0b5-NRT` if Cloudflare analytics are available.

## Next Golden command after infra is stable / investigated

```bash
git pull --ff-only
git rev-parse --short HEAD
pnpm typecheck

E2E_BASE_URL=https://prizgram.kuraryu.jp \
E2E_ALLOW_MUTATION=true \
E2E_ALLOW_PRODUCTION=true \
pnpm test:golden
```

## If the next Golden passes Step 08

Continue first-failure triage:

- Step 09: `src/support/interview.ts`
- Step 10: `src/support/applications.ts`
- Step 11 / 12: `src/support/persona-update.ts`
- Step 13: `src/support/dashboard.ts`
- Step 14: final session/persistence assertions

## Required cycle

`run -> diagnose first failure -> smallest safe fix -> typecheck -> commit/push -> update HANDOFF.md -> rerun`

Do not modify Prizgram body code from this E2E loop. Product/infra defects belong in Prizgram issues. Do not hide actual production failures with unlimited retries.