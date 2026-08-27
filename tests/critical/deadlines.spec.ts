import { test } from "../../src/support/test.js";
import { applyToCurrentJob } from "../../src/support/applications.js";
import { newTestAccount, register } from "../../src/support/account.js";
import {
  completeRestoreAndDeleteDeadline,
  createDeadlineForCurrentApplication,
  createInterviewDeadlineForCurrentApplication,
  editDeadline,
  verifyBothDeadlinesInApplicationAndDashboard,
} from "../../src/support/deadlines.js";
import { evidenceStep } from "../../src/support/evidence.js";
import { assertMutationAllowed } from "../../src/support/env.js";
import { importSyntheticJob, openSyntheticJob } from "../../src/support/jobs.js";

test.describe("S06 deadline lifecycle", () => {
  test("create ES/interview deadlines, surface, edit, complete, restore and delete", async ({ page }, testInfo) => {
    assertMutationAllowed();
    const account = newTestAccount("s06-deadline");
    await register(page, account);
    await importSyntheticJob(page);
    await openSyntheticJob(page);
    await applyToCurrentJob(page);

    await evidenceStep(page, testInfo, "応募にES締切と面接予定を登録", async () => {
      await createDeadlineForCurrentApplication(page);
      await createInterviewDeadlineForCurrentApplication(page);
    });

    await evidenceStep(page, testInfo, "応募詳細とダッシュボードへ両方の締切が反映", async () => {
      await verifyBothDeadlinesInApplicationAndDashboard(page);
    });

    await evidenceStep(page, testInfo, "ES締切タイトルと期限を編集", async () => {
      await editDeadline(page);
    });

    await evidenceStep(page, testInfo, "ES締切を完了・復元して削除", async () => {
      await completeRestoreAndDeleteDeadline(page);
    });
  });
});
