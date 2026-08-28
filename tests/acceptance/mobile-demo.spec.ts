import { newTestAccount, register } from "../../src/support/account.js";
import {
  applyToCurrentJob,
  recordRejectedSelectionResult,
  updateApplicationToInterview,
} from "../../src/support/applications.js";
import { evidenceStep } from "../../src/support/evidence.js";
import { assertMutationAllowed } from "../../src/support/env.js";
import { importSyntheticJob, openSyntheticJob, evaluateCurrentJob } from "../../src/support/jobs.js";
import {
  approvePersonaUpdateAndFinishReevaluation,
  proposePersonaUpdate,
  verifyPersonaV2AndFreshScore,
} from "../../src/support/persona-update.js";
import { createPersonaFromFixture } from "../../src/support/persona.js";
import { expect, test as baseTest } from "../../src/support/test.js";

// Keep the CSS viewport mobile-sized. The runner upscales the finished portrait
// recording to 1080x2340 so the mobile layout fills the video frame.
baseTest.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  hasTouch: true,
  isMobile: true,
  video: {
    mode: "on",
    size: { width: 390, height: 844 },
  },
});

baseTest.describe("Mobile demo — Persona / 求人評価 / Persona更新", () => {
  baseTest(
    "records the three mobile demo scenes as one continuous story",
    async ({ page }, testInfo) => {
      baseTest.setTimeout(0);
      assertMutationAllowed();

      const account = newTestAccount("mobile-demo");

      await register(page, account);
      await evidenceStep(page, testInfo, "01 Persona生成", async () => {
        await createPersonaFromFixture(page);
        await expect(page.locator(".page-lead")).toContainText("バージョン1");
      });

      await evidenceStep(page, testInfo, "02 求人取り込みと3軸評価", async () => {
        await importSyntheticJob(page);
        await openSyntheticJob(page);
        await evaluateCurrentJob(page);
      });

      await evidenceStep(page, testInfo, "03 落選結果からPersona更新", async () => {
        await applyToCurrentJob(page);
        await updateApplicationToInterview(page);
        await recordRejectedSelectionResult(page);
        await proposePersonaUpdate(page);
        await approvePersonaUpdateAndFinishReevaluation(page);
        await verifyPersonaV2AndFreshScore(page);
      });

      // Make the final mobile state explicit for the editor and the viewer.
      await page.goto("/app/persona");
      await expect(page.locator(".page-lead")).toContainText("バージョン2");
    },
  );
});
