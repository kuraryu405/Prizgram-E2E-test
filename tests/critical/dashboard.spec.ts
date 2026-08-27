import { newTestAccount, register } from "../../src/support/account.js";
import {
  applyToCurrentJob,
  updateApplicationToInterview,
} from "../../src/support/applications.js";
import { verifyDashboardConsistency } from "../../src/support/dashboard.js";
import { createDeadlineForCurrentApplication } from "../../src/support/deadlines.js";
import { evidenceStep } from "../../src/support/evidence.js";
import { assertMutationAllowed } from "../../src/support/env.js";
import {
  evaluateCurrentJob,
  importSyntheticJob,
  openSyntheticJob,
} from "../../src/support/jobs.js";
import { createPersonaFromFixture } from "../../src/support/persona.js";
import { test } from "../../src/support/test.js";

test.describe("S12 dashboard cross-feature consistency", () => {
  test("reflect persona, scored job, application and deadline in one dashboard", async ({ page }, testInfo) => {
    assertMutationAllowed();
    const account = newTestAccount("s12-dashboard");
    await register(page, account);
    await createPersonaFromFixture(page);
    await importSyntheticJob(page);
    await openSyntheticJob(page);
    await evaluateCurrentJob(page);
    await applyToCurrentJob(page);
    await updateApplicationToInterview(page);
    await createDeadlineForCurrentApplication(page);

    await evidenceStep(page, testInfo, "複数機能の状態がダッシュボードへ一貫して反映", async () => {
      await verifyDashboardConsistency(page);
    });
  });
});
