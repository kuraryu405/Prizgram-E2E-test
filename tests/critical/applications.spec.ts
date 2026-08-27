import { test } from "../../src/support/test.js";
import {
  applyToCurrentJob,
  updateApplicationToInterview,
  verifyApplicationTimeline,
  verifyInterviewFilter,
} from "../../src/support/applications.js";
import { newTestAccount, register } from "../../src/support/account.js";
import { evidenceStep } from "../../src/support/evidence.js";
import { assertMutationAllowed } from "../../src/support/env.js";
import { importSyntheticJob, openSyntheticJob } from "../../src/support/jobs.js";
import { createPersonaFromFixture } from "../../src/support/persona.js";

test.describe("S05 application lifecycle", () => {
  test("apply to a job, update selection state and verify timeline", async ({ page }, testInfo) => {
    assertMutationAllowed();
    const account = newTestAccount("s05-application");
    await register(page, account);
    await createPersonaFromFixture(page);
    await importSyntheticJob(page);
    await openSyntheticJob(page);

    await evidenceStep(page, testInfo, "求人から応募を作成", async () => {
      await applyToCurrentJob(page);
    });

    await evidenceStep(page, testInfo, "応募を一次面接フェーズへ更新", async () => {
      await updateApplicationToInterview(page);
    });

    await evidenceStep(page, testInfo, "選考履歴に作成と面接遷移を確認", async () => {
      await verifyApplicationTimeline(page);
    });

    await evidenceStep(page, testInfo, "面接ステータス絞り込みで応募を確認", async () => {
      await verifyInterviewFilter(page);
    });
  });
});
