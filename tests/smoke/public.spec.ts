import { expect, test } from "@playwright/test";
import { evidenceStep } from "../../src/support/evidence.js";

test.describe("public smoke", () => {
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
