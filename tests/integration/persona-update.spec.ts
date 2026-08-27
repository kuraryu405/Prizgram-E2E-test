import { test } from "../../src/support/test.js";
import {
  applyToCurrentJob,
  updateApplicationToInterview,
} from "../../src/support/applications.js";
import { newTestAccount, register } from "../../src/support/account.js";
import { evidenceStep } from "../../src/support/evidence.js";
import { assertMutationAllowed } from "../../src/support/env.js";
import { saveInterviewReflection } from "../../src/support/interview.js";
import {
  evaluateCurrentJob,
  importSyntheticJob,
  openSyntheticJob,
} from "../../src/support/jobs.js";
import { createPersonaFromFixture } from "../../src/support/persona.js";
import {
  approvePersonaUpdateAndFinishReevaluation,
  proposePersonaUpdate,
  verifyPersonaStillV1BeforeApproval,
  verifyPersonaV2AndFreshScore,
} from "../../src/support/persona-update.js";

test.describe("S10 persona feedback loop", () => {
  test("propose without mutation, explicitly approve Persona v2 and re-score jobs", async ({ page }, testInfo) => {
    assertMutationAllowed();
    const account = newTestAccount("s10-persona-update");
    await register(page, account);
    await createPersonaFromFixture(page);
    await importSyntheticJob(page);
    await openSyntheticJob(page);
    await evaluateCurrentJob(page);
    await applyToCurrentJob(page);
    await updateApplicationToInterview(page);
    await saveInterviewReflection(page);

    await evidenceStep(page, testInfo, "選考結果と振り返りからPersona更新案を作成", async () => {
      await proposePersonaUpdate(page);
    });

    await evidenceStep(page, testInfo, "承認前はPersona v1のままを確認", async () => {
      await verifyPersonaStillV1BeforeApproval(page);
    });

    await evidenceStep(page, testInfo, "明示承認してPersona v2を作成し求人を再評価", async () => {
      await approvePersonaUpdateAndFinishReevaluation(page);
    });

    await evidenceStep(page, testInfo, "Persona v2と最新求人スコアを確認", async () => {
      await verifyPersonaV2AndFreshScore(page);
    });
  });
});
