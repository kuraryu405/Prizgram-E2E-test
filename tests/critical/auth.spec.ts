import { expect, test } from "@playwright/test";
import {
  changePassword,
  login,
  loginSuccessfully,
  logout,
  newTestAccount,
  register,
} from "../../src/support/account.js";
import { evidenceStep } from "../../src/support/evidence.js";
import { assertMutationAllowed } from "../../src/support/env.js";

test.describe("S01 authentication and account lifecycle", () => {
  test("register, change password, logout and sign back in", async ({ page }, testInfo) => {
    assertMutationAllowed();
    const account = newTestAccount("s01-auth");

    await evidenceStep(page, testInfo, "新規登録してダッシュボードへ到達", async () => {
      await register(page, account);
    });

    await evidenceStep(page, testInfo, "プロフィールでアカウントを確認", async () => {
      await page.goto("/app/profile");
      await expect(page.getByRole("heading", { name: "プロフィール" })).toBeVisible();
      await expect(page.getByText(account.loginId, { exact: true })).toBeVisible();
    });

    await evidenceStep(page, testInfo, "パスワードを変更", async () => {
      await changePassword(page, account.password, account.nextPassword);
    });

    await evidenceStep(page, testInfo, "ログアウトして公開画面へ戻る", async () => {
      await page.goto("/app");
      await logout(page);
      await expect(
        page.getByRole("link", { name: /Prizgramをはじめる/ }),
      ).toBeVisible();
    });

    await evidenceStep(page, testInfo, "旧パスワードではログインできない", async () => {
      await login(page, account.loginId, account.password);
      await expect(page).toHaveURL(/\/login(?:$|[/?#])/);
      await expect(page.getByRole("alert")).toBeVisible();
    });

    await evidenceStep(page, testInfo, "新パスワードで再ログイン", async () => {
      await loginSuccessfully(page, account.loginId, account.nextPassword);
    });

    await evidenceStep(page, testInfo, "未認証の保護ページアクセスはログインへ戻る", async () => {
      await logout(page);
      await page.goto("/app/profile");
      await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fprofile/);
    });
  });
});
