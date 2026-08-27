import { expect, test } from "@playwright/test";
import { newTestAccount, register } from "../../src/support/account.js";
import { evidenceStep } from "../../src/support/evidence.js";
import { assertMutationAllowed } from "../../src/support/env.js";
import { createPersonaFromFixture } from "../../src/support/persona.js";

test.describe("S02 persona intake and generation", () => {
  test("create Persona v1 from six broad job-discovery answers", async ({ page }, testInfo) => {
    assertMutationAllowed();
    const account = newTestAccount("s02-persona");
    await register(page, account);

    await evidenceStep(page, testInfo, "未作成のペルソナ画面を確認", async () => {
      await page.goto("/app/persona");
      await expect(
        page.getByText("まだペルソナがありません。6問のヒアリングから生成できます。"),
      ).toBeVisible();
    });

    await evidenceStep(page, testInfo, "6問ヒアリングからPersona v1を生成", async () => {
      await createPersonaFromFixture(page);
    });

    await evidenceStep(page, testInfo, "Persona v1の根拠とバージョン履歴を確認", async () => {
      await expect(page.getByText(/バージョン1/)).toBeVisible();
      await expect(page.getByRole("heading", { name: "根拠（抜粋）" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "バージョン履歴" })).toBeVisible();
      await expect(page.getByText(/v1/)).toBeVisible();
    });
  });
});
