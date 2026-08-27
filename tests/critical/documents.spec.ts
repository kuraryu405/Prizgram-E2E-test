import { test } from "@playwright/test";
import { applyToCurrentJob } from "../../src/support/applications.js";
import { newTestAccount, register } from "../../src/support/account.js";
import {
  addAndEditManualEntry,
  createManualDocument,
  renameManualDocument,
  submitManualDocument,
} from "../../src/support/documents.js";
import { evidenceStep } from "../../src/support/evidence.js";
import { assertMutationAllowed } from "../../src/support/env.js";
import { importSyntheticJob, openSyntheticJob } from "../../src/support/jobs.js";

test.describe("S07 application documents manual flow", () => {
  test("create, rename, edit and submit an ES document", async ({ page }, testInfo) => {
    assertMutationAllowed();
    const account = newTestAccount("s07-documents");
    await register(page, account);
    await importSyntheticJob(page);
    await openSyntheticJob(page);
    await applyToCurrentJob(page);

    await evidenceStep(page, testInfo, "ES書類を新規作成", async () => {
      await createManualDocument(page);
    });

    await evidenceStep(page, testInfo, "ES書類タイトルを編集", async () => {
      await renameManualDocument(page);
    });

    await evidenceStep(page, testInfo, "設問と回答を追加して回答を編集", async () => {
      await addAndEditManualEntry(page);
    });

    await evidenceStep(page, testInfo, "ES書類を提出済みにする", async () => {
      await submitManualDocument(page);
    });
  });
});
