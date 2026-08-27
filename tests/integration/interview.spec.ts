import { test } from "@playwright/test";
import {
  applyToCurrentJob,
  updateApplicationToInterview,
} from "../../src/support/applications.js";
import { newTestAccount, register } from "../../src/support/account.js";
import {
  addAndEditManualEntry,
  createManualDocument,
  renameManualDocument,
} from "../../src/support/documents.js";
import { evidenceStep } from "../../src/support/evidence.js";
import { assertMutationAllowed } from "../../src/support/env.js";
import {
  generateInterviewOutlineAndFollowup,
  generateInterviewQuestions,
  saveInterviewReflection,
  verifyInterviewReflectionPersists,
} from "../../src/support/interview.js";
import { importSyntheticJob, openSyntheticJob } from "../../src/support/jobs.js";
import { createPersonaFromFixture } from "../../src/support/persona.js";

test.describe("S09 interview preparation and reflection", () => {
  test("generate questions, outline, followups and persist reflection", async ({ page }, testInfo) => {
    assertMutationAllowed();
    const account = newTestAccount("s09-interview");
    await register(page, account);
    await createPersonaFromFixture(page);
    await importSyntheticJob(page);
    await openSyntheticJob(page);
    await applyToCurrentJob(page);
    await updateApplicationToInterview(page);
    await createManualDocument(page);
    await renameManualDocument(page);
    await addAndEditManualEntry(page);

    await evidenceStep(page, testInfo, "一次面接の想定質問を生成", async () => {
      await generateInterviewQuestions(page);
    });

    await evidenceStep(page, testInfo, "回答骨子と深掘り候補を生成", async () => {
      await generateInterviewOutlineAndFollowup(page);
    });

    await evidenceStep(page, testInfo, "面接後振り返りを保存", async () => {
      await saveInterviewReflection(page);
    });

    await evidenceStep(page, testInfo, "reload後も振り返りが保持される", async () => {
      await verifyInterviewReflectionPersists(page);
    });
  });
});
