import { expect, type Page } from "@playwright/test";
import { testJob } from "../fixtures/job.js";
import { assertMutationAllowed } from "./env.js";

export async function applyToCurrentJob(page: Page): Promise<void> {
  assertMutationAllowed();
  await page.getByRole("button", { name: "応募する" }).click();
  await expect(page).toHaveURL(/\/app\/applications\/[^/?#]+/);
  await expect(page.getByRole("heading", { name: testJob.companyName })).toBeVisible();
  await expect(page.getByRole("heading", { name: "現在の状況" })).toBeVisible();
}

export async function verifyPinnedSnapshotAndDuplicateGuard(page: Page): Promise<void> {
  const applicationUrl = page.url();
  const snapshot = page.getByRole("heading", { name: "応募した求人" }).locator("..");
  await expect(snapshot).toContainText(testJob.companyName);
  await expect(snapshot).toContainText(
    "応募時の求人情報を保持しているため、求人が後から更新されてもこの応募の記録は変わりません。",
  );

  await snapshot.getByRole("link", { name: "現在の求人詳細を見る" }).click();
  await expect(page.getByRole("link", { name: "応募済み — 詳細を見る" })).toBeVisible();
  await expect(page.getByRole("button", { name: "応募する" })).toHaveCount(0);
  await page.getByRole("link", { name: "応募済み — 詳細を見る" }).click();
  await expect(page).toHaveURL(applicationUrl);
}

export async function updateApplicationToInterview(page: Page): Promise<void> {
  assertMutationAllowed();
  await page.getByLabel("ステータス変更（任意）").selectOption("interview");
  await page.getByLabel("現在の段階（任意）").fill("一次面接");
  await page.getByLabel("次のアクション").fill("想定質問を確認して面接準備を行う");
  await page.getByLabel("メモ").fill("E2E synthetic application: 面接フェーズへ更新");
  await page.getByRole("button", { name: "更新する" }).click();
  await expect(page.getByRole("status")).toContainText("更新しました。");
  await expect(page.getByText(/面接/).first()).toBeVisible();
  await expect(page.getByText(/一次面接/).first()).toBeVisible();
}

export async function recordRejectedSelectionResult(page: Page): Promise<void> {
  assertMutationAllowed();
  await page.getByLabel("ステータス変更（任意）").selectOption("rejected");
  await page.getByLabel("現在の段階（任意）").fill("選考結果");
  await page.getByLabel("次のアクション").fill("選考を振り返りペルソナへ反映する");
  await page
    .getByLabel("メモ")
    .fill("E2E synthetic result: 面接経験を次の応募に反映するため落選結果を記録");
  await page.getByRole("button", { name: "更新する" }).click();
  await expect(page.getByRole("status")).toContainText("更新しました。");
  await expect(page.getByText(/落選/).first()).toBeVisible();
  await expect(page.getByText(/面接 → 落選/)).toBeVisible();
}

export async function verifyApplicationTimeline(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { name: "選考履歴" })).toBeVisible();
  await expect(page.getByText(/作成: 保存済み/)).toBeVisible();
  await expect(page.getByText(/保存済み → 面接/)).toBeVisible();
}

export async function verifyInterviewFilter(page: Page): Promise<void> {
  await page.goto("/app/applications?status=interview");
  await expect(
    page.getByRole("link", { name: new RegExp(testJob.companyName) }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "面接", exact: true })).toHaveAttribute(
    "data-active",
    "true",
  );
}
