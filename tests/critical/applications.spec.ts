import { test } from "../../src/support/test.js";
import {
  applyToCurrentJob,
  createMinimalApplicationWithoutJob,
  updateApplicationToInterview,
  verifyApplicationTimeline,
  verifyInterviewFilter,
  verifyPinnedSnapshotAndDuplicateGuard,
} from "../../src/support/applications.js";
import { newTestAccount, register } from "../../src/support/account.js";
import { evidenceStep } from "../../src/support/evidence.js";
import { assertMutationAllowed } from "../../src/support/env.js";
import { importSyntheticJob, openSyntheticJob } from "../../src/support/jobs.js";
import { createPersonaFromFixture } from "../../src/support/persona.js";

test.describe("S05 application lifecycle", () => {
  test("register an active selection without a job posting", async ({ page }, testInfo) => {
    assertMutationAllowed();
    const account = newTestAccount("s05-minimal-application");
    await register(page, account);

    await evidenceStep(page, testInfo, "求人票なしで選考中企業を直接登録", async () => {
      await createMinimalApplicationWithoutJob(page);
    });
  });

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

    await evidenceStep(page, testInfo, "応募時求人snapshotと二重応募防止を確認", async () => {
      await verifyPinnedSnapshotAndDuplicateGuard(page);
    });

    await evidenceStep(page, testInfo, "書類選考を経て一次面接フェーズへ更新", async () => {
      await updateApplicationToInterview(page);
    });

    await evidenceStep(page, testInfo, "選考履歴に作成・書類選考・面接遷移を確認", async () => {
      await verifyApplicationTimeline(page);
    });

    await evidenceStep(page, testInfo, "面接ステータス絞り込みで応募を確認", async () => {
      await verifyInterviewFilter(page);
    });
  });
});
