import { newTestAccount, register } from "../../src/support/account.js";
import { evidenceStep } from "../../src/support/evidence.js";
import { assertMutationAllowed } from "../../src/support/env.js";
import {
  mobileViewports,
  verifyMobileAccountMenu,
  verifyMobileShellAtCurrentViewport,
} from "../../src/support/mobile.js";
import { test } from "../../src/support/test.js";

test.describe("S13 mobile AppShell and responsive critical paths", () => {
  test("keeps navigation, menus and primary pages usable from 320px to 390px", async ({ page }, testInfo) => {
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
  });
});
