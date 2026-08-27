import { newTestAccount, register } from "../../src/support/account.js";
import {
  applyToCurrentJob,
  updateApplicationToInterview,
} from "../../src/support/applications.js";
import {
  addAndEditManualEntry,
  createManualDocument,
  renameManualDocument,
} from "../../src/support/documents.js";
import { evidenceStep } from "../../src/support/evidence.js";
import { assertMutationAllowed } from "../../src/support/env.js";
import { importSyntheticJob, openSyntheticJob } from "../../src/support/jobs.js";
import {
  expectControlAboveBottomNav,
  expectNoHorizontalOverflow,
  mobileViewports,
  verifyMobileAccountMenu,
  verifyMobileShellAtCurrentViewport,
} from "../../src/support/mobile.js";
import { expect, test } from "../../src/support/test.js";

test.describe("S13 mobile AppShell and responsive critical paths", () => {
  test("keeps navigation, menus and primary workflows usable from 320px to 390px", async ({ page }, testInfo) => {
    assertMutationAllowed();
    await page.setViewportSize(mobileViewports[0]);
    const account = newTestAccount("s13-mobile");
    await register(page, account);

    for (const viewport of mobileViewports) {
      await page.setViewportSize(viewport);
      await evidenceStep(
        page,
        testInfo,
        `${viewport.width}x${viewport.height} AppShell導線とオーバーフロー確認`,
        async () => {
          await verifyMobileShellAtCurrentViewport(page);
        },
      );
    }

    await evidenceStep(page, testInfo, "モバイルaccount menuがviewport内で操作可能", async () => {
      await verifyMobileAccountMenu(page, account.loginId);
    });

    await page.setViewportSize({ width: 375, height: 812 });
    await evidenceStep(page, testInfo, "375pxで求人取り込みから応募作成まで操作", async () => {
      await importSyntheticJob(page);
      await openSyntheticJob(page);
      await expectNoHorizontalOverflow(page);
      await expectControlAboveBottomNav(
        page,
        page.getByRole("button", { name: "応募する" }),
      );
      await applyToCurrentJob(page);
      await expectNoHorizontalOverflow(page);
    });

    await evidenceStep(page, testInfo, "375pxで応募更新フォームを操作", async () => {
      await updateApplicationToInterview(page);
      await expectNoHorizontalOverflow(page);
      await expectControlAboveBottomNav(
        page,
        page.getByRole("button", { name: "更新する" }),
      );
    });

    await evidenceStep(page, testInfo, "375pxでES作成・回答編集を操作", async () => {
      await createManualDocument(page);
      await renameManualDocument(page);
      await addAndEditManualEntry(page);
      await expectNoHorizontalOverflow(page);
      await expect(page.getByRole("heading", { name: "ES AI支援" })).toBeVisible();
      await expectControlAboveBottomNav(
        page,
        page.getByRole("button", { name: "設問を追加" }),
      );
    });

    await evidenceStep(page, testInfo, "375pxで面接準備と振り返り領域を確認", async () => {
      await expect(page.getByRole("heading", { name: "面接準備" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "面接後振り返り" })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await expectControlAboveBottomNav(
        page,
        page.getByLabel("実際に聞かれた質問（1行1問）"),
      );
    });
  });
});
