import { expect, test } from "../../src/support/test.js";
import { evidenceStep } from "../../src/support/evidence.js";

test.describe("public smoke", () => {
  test("health endpoint reports database readiness", async ({ request }, testInfo) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    await testInfo.attach("health.json", {
      body: Buffer.from(JSON.stringify({ status: "ok" }, null, 2)),
      contentType: "application/json",
    });
  });

  test("landing page renders the primary Prizgram CTA", async ({ page }, testInfo) => {
    await evidenceStep(page, testInfo, "ランディングページを開く", async () => {
      await page.goto("/");
      await expect(
        page.getByRole("heading", { name: /あなたの就活に/ }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /Prizgramをはじめる/ }),
      ).toHaveAttribute("href", "/register");
    });
  });

  test("registration form is reachable", async ({ page }, testInfo) => {
    await evidenceStep(page, testInfo, "新規登録フォームを確認", async () => {
      await page.goto("/register");
      await expect(page.getByRole("heading", { name: "新規登録" })).toBeVisible();
      await expect(page.getByLabel("ログインID")).toBeVisible();
      await expect(page.getByLabel("パスワード", { exact: true })).toBeVisible();
      await expect(page.getByLabel("パスワード（確認）")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "アカウントを作成" }),
      ).toBeVisible();
    });
  });

  test("login form is reachable", async ({ page }, testInfo) => {
    await evidenceStep(page, testInfo, "ログインフォームを確認", async () => {
      await page.goto("/login");
      await expect(page.getByLabel("ログインID")).toBeVisible();
      await expect(page.getByLabel("パスワード")).toBeVisible();
      await expect(page.getByRole("button", { name: "ログイン" })).toBeVisible();
    });
  });
});
