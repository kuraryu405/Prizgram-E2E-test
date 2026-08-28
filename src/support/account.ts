import { randomUUID } from "node:crypto";

import { expect, type Page } from "@playwright/test";
import { assertMutationAllowed } from "./env.js";

export type TestAccount = {
  loginId: string;
  password: string;
  nextPassword: string;
};

function safeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").slice(0, 20);
}

export function newTestAccount(scenario: string): TestAccount {
  const runId = randomUUID().replaceAll("-", "").slice(0, 16);
  const prefix = safeToken(scenario) || "scenario";
  return {
    loginId: `e2e-${prefix}-${runId}`.slice(0, 64),
    password: `E2E-${runId}-Initial!23`,
    nextPassword: `E2E-${runId}-Changed!45`,
  };
}

export async function register(page: Page, account: TestAccount): Promise<void> {
  assertMutationAllowed();
  await page.goto("/register");
  await page.getByLabel("ログインID").fill(account.loginId);
  await page.getByLabel("パスワード", { exact: true }).fill(account.password);
  await page.getByLabel("パスワード（確認）").fill(account.password);
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  await expect(page).toHaveURL(/\/app(?:$|[/?#])/);
  await expect(
    page.getByRole("heading", { name: `ようこそ、${account.loginId} さん` }),
  ).toBeVisible();
}

export async function login(
  page: Page,
  loginId: string,
  password: string,
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("ログインID").fill(loginId);
  await page.getByLabel("パスワード").fill(password);
  await page.getByRole("button", { name: "ログイン" }).click();
}

export async function loginSuccessfully(
  page: Page,
  loginId: string,
  password: string,
): Promise<void> {
  await login(page, loginId, password);
  await expect(page).toHaveURL(/\/app(?:$|[/?#])/);
  await expect(
    page.getByRole("heading", { name: `ようこそ、${loginId} さん` }),
  ).toBeVisible();
}

export async function logout(page: Page): Promise<void> {
  const accountTrigger = page.getByLabel(/^アカウント /);
  await accountTrigger.click();
  await page.getByRole("button", { name: "ログアウト" }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fapp$/);
  await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
}

export async function changePassword(
  page: Page,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  assertMutationAllowed();
  await page.goto("/app/profile");
  await page.getByLabel("現在のパスワード").fill(currentPassword);
  await page.getByLabel("新しいパスワード", { exact: true }).fill(newPassword);
  await page.getByLabel("新しいパスワード（確認）").fill(newPassword);
  await page.getByRole("button", { name: "パスワードを変更" }).click();
  await expect(page.getByRole("status")).toContainText("パスワードを変更しました。");
}
