import { test } from "@playwright/test";
import { newTestAccount, register } from "../../src/support/account.js";
import { evidenceStep } from "../../src/support/evidence.js";
import { assertMutationAllowed } from "../../src/support/env.js";
import {
  bulkImportRemainingCandidates,
  discoverJobs,
  importAndEvaluateFirstCandidate,
  verifyDiscoveryFiltersReset,
} from "../../src/support/job-discovery.js";
import { createPersonaFromFixture } from "../../src/support/persona.js";

test.describe("S04 external job discovery", () => {
  test("discover broadly, import, evaluate and bulk-import provider candidates", async ({ page }, testInfo) => {
    assertMutationAllowed();
    const account = newTestAccount("s04-discovery");
    await register(page, account);
    await createPersonaFromFixture(page);

    await evidenceStep(page, testInfo, "求人探索フィルタを設定してリセット", async () => {
      await verifyDiscoveryFiltersReset(page);
    });

    let candidateCount = 0;
    await evidenceStep(page, testInfo, "汎用Personaから求人候補を探索", async () => {
      candidateCount = await discoverJobs(page);
    });

    if (candidateCount === 0) return;

    await evidenceStep(page, testInfo, "最初の候補を取り込み3軸評価", async () => {
      await importAndEvaluateFirstCandidate(page);
    });

    await evidenceStep(page, testInfo, "残り候補を一括取り込み", async () => {
      await bulkImportRemainingCandidates(page);
    });
  });
});
