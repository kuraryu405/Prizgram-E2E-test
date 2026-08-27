import { expect, test } from "@playwright/test";
import { newTestAccount, register } from "../../src/support/account.js";
import { evidenceStep } from "../../src/support/evidence.js";
import { assertMutationAllowed } from "../../src/support/env.js";
import {
  addSyntheticJobVersion,
  archiveAndRestoreSyntheticJob,
  evaluateCurrentJob,
  importSyntheticJob,
  openSyntheticJob,
} from "../../src/support/jobs.js";
import { createPersonaFromFixture } from "../../src/support/persona.js";
import { testJob } from "../../src/fixtures/job.js";

test.describe("S03 manual job lifecycle", () => {
  test("import, inspect, score, version, archive and restore a synthetic job", async ({ page }, testInfo) => {
    assertMutationAllowed();
    const account = newTestAccount("s03-job");
    await register(page, account);
    await createPersonaFromFixture(page);

    await evidenceStep(page, testInfo, "synthetic求人票を手動取り込み", async () => {
      await importSyntheticJob(page);
    });

    await evidenceStep(page, testInfo, "求人詳細と構造化結果を確認", async () => {
      await openSyntheticJob(page);
      await expect(page.getByRole("heading", { name: "本文" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "要件" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "歓迎スキル" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "文化・価値観" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "難易度" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "出典" })).toBeVisible();
      await expect(page.getByText(testJob.sourceName)).toBeVisible();
    });

    await evidenceStep(page, testInfo, "求人を3軸評価", async () => {
      await evaluateCurrentJob(page);
    });

    await evidenceStep(page, testInfo, "更新求人を新バージョンとして追加", async () => {
      await addSyntheticJobVersion(page);
      await expect(
        page.getByText(/評価が古くなっています|まだ評価されていません/),
      ).toBeVisible();
    });

    await evidenceStep(page, testInfo, "最新バージョンで再評価", async () => {
      await evaluateCurrentJob(page);
    });

    await evidenceStep(page, testInfo, "求人をアーカイブして復元", async () => {
      await archiveAndRestoreSyntheticJob(page);
    });
  });
});
