import { test } from "../../src/support/test.js";
import { applyToCurrentJob } from "../../src/support/applications.js";
import { newTestAccount, register } from "../../src/support/account.js";
import {
  completeRestoreAndDeleteDeadline,
  createDeadlineForCurrentApplication,
  editDeadline,
  verifyDeadlineInApplicationAndDashboard,
} from "../../src/support/deadlines.js";
import { evidenceStep } from "../../src/support/evidence.js";
import { assertMutationAllowed } from "../../src/support/env.js";
import { importSyntheticJob, openSyntheticJob } from "../../src/support/jobs.js";

test.describe("S06 deadline lifecycle", () => {
  test("create, surface, edit, complete, restore and delete a deadline", async ({ page }, testInfo) => {
    assertMutationAllowed();
    const account = newTestAccount("s06-deadline");
    await register(page, account);
    await importSyntheticJob(page);
    await openSyntheticJob(page);
    await applyToCurrentJob(page);

    await evidenceStep(page, testInfo, "応募にES締切を登録", async () => {
      await createDeadlineForCurrentApplication(page);
    });

    await evidenceStep(page, testInfo, "応募詳細とダッシュボードへの締切反映を確認", async () => {
      await verifyDeadlineInApplicationAndDashboard(page);
    });

    await evidenceStep(page, testInfo, "締切タイトルと期限を編集", async () => {
      await editDeadline(page);
    });

    await evidenceStep(page, testInfo, "締切を完了・復元して削除", async () => {
      await completeRestoreAndDeleteDeadline(page);
    });
  });
});
