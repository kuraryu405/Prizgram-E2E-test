import { test } from "@playwright/test";
import { applyToCurrentJob } from "../../src/support/applications.js";
import { newTestAccount, register } from "../../src/support/account.js";
import { evidenceStep } from "../../src/support/evidence.js";
import { assertMutationAllowed } from "../../src/support/env.js";
import {
  createAiDocument,
  findEsEpisodes,
  generateAndHumanEditDraft,
  saveAiDraftAndRevise,
} from "../../src/support/es-ai.js";
import { importSyntheticJob, openSyntheticJob } from "../../src/support/jobs.js";
import { createPersonaFromFixture } from "../../src/support/persona.js";

test.describe("S08 ES AI assistance", () => {
  test("find episode candidates, draft, human-edit, save and revise an ES answer", async ({ page }, testInfo) => {
    assertMutationAllowed();
    const account = newTestAccount("s08-es-ai");
    await register(page, account);
    await createPersonaFromFixture(page);
    await importSyntheticJob(page);
    await openSyntheticJob(page);
    await applyToCurrentJob(page);
    await createAiDocument(page);

    await evidenceStep(page, testInfo, "ES設問から使えそうな経験を探索して選択", async () => {
      await findEsEpisodes(page);
    });

    let draft = "";
    await evidenceStep(page, testInfo, "AI下書きを生成して人間が編集", async () => {
      draft = await generateAndHumanEditDraft(page);
    });

    await evidenceStep(page, testInfo, "AI生成として保存しユーザー編集後にAI添削", async () => {
      await saveAiDraftAndRevise(page, draft);
    });
  });
});
