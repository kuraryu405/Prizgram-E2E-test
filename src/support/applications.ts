import { expect, type Page } from "@playwright/test";
import { testJob } from "../fixtures/job.js";
import { assertMutationAllowed } from "./env.js";

export const minimalApplicationCompany = "E2E Direct Selection株式会社";
export const minimalApplicationRole = "Software Engineer Internship";

export async function createMinimalApplicationWithoutJob(page: Page): Promise<void> {
  assertMutationAllowed();
  await page.goto("/app/applications");
  const form = page.getByRole("heading", { name: "選考中の企業を追加" }).locator("..");
  await form.getByLabel("企業名").fill(minimalApplicationCompany);
  await form.getByLabel("職種 / コース名（任意）").fill(minimalApplicationRole);
  await form.getByLabel("現在のステータス").selectOption("interview");
  await form.getByLabel("現在の段階（任意）").fill("二次面接");
  await form.getByLabel("次のアクション（任意）").fill("面接準備を行う");
  await form.getByLabel("メモ（任意）").fill("E2E synthetic direct selection");
  await form.getByRole("button", { name: "応募を追加" }).click();

  const success = form.getByRole("status");
  await expect(success).toContainText("応募を追加しました。");
  await expect(success.getByRole("link", { name: "締切を追加" })).toBeVisible();

  const list = page.getByRole("heading", { name: "応募一覧" }).locator("..");
  const card = list.getByRole("link", { name: new RegExp(minimalApplicationCompany) });
  await expect(card).toBeVisible();
  await expect(card).toContainText(minimalApplicationRole);
  await expect(card).toContainText("面接");
  await expect(card).toContainText("段階: 二次面接");
  await expect(card).toContainText("次のアクション: 面接準備を行う");

  await card.click();
  await expect(page.getByRole("heading", { name: minimalApplicationCompany })).toBeVisible();
  const overview = page.getByRole("heading", { name: "現在の状況" }).locator("..");
  await expect(overview).toContainText("面接");
  await expect(overview).toContainText("二次面接");
  await expect(page.getByRole("heading", { name: "最新メモ" }).locator("..")).toContainText(
    "E2E synthetic direct selection",
  );
}

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

async function updateApplication(
  page: Page,
  input: Readonly<{
    status: string;
    stage: string;
    nextAction: string;
    note: string;
    expectedStatusText: string;
  }>,
): Promise<void> {
  await page.getByLabel("ステータス変更（任意）").selectOption(input.status);
  await page.getByLabel("現在の段階（任意）").fill(input.stage);
  await page.getByLabel("次のアクション").fill(input.nextAction);
  await page.getByLabel("メモ").fill(input.note);
  await page.getByRole("button", { name: "更新する" }).click();
  await expect(page.getByRole("status")).toContainText("更新しました。");
  const overview = page.getByRole("heading", { name: "現在の状況" }).locator("..");
  await expect(overview).toContainText(input.expectedStatusText);
  await expect(overview).toContainText(input.stage);
}

export async function updateApplicationToInterview(page: Page): Promise<void> {
  assertMutationAllowed();
  await updateApplication(page, {
    status: "screening",
    stage: "書類選考",
    nextAction: "ES提出内容を確認し書類選考結果を待つ",
    note: "E2E synthetic application: 書類選考フェーズへ更新",
    expectedStatusText: "書類選考",
  });
  await updateApplication(page, {
    status: "interview",
    stage: "一次面接",
    nextAction: "想定質問を確認して面接準備を行う",
    note: "E2E synthetic application: 面接フェーズへ更新",
    expectedStatusText: "面接",
  });
}

export async function recordRejectedSelectionResult(page: Page): Promise<void> {
  assertMutationAllowed();
  await updateApplication(page, {
    status: "rejected",
    stage: "選考結果",
    nextAction: "選考を振り返りペルソナへ反映する",
    note: "E2E synthetic result: 面接経験を次の応募に反映するため落選結果を記録",
    expectedStatusText: "落選",
  });
  await expect(page.getByText(/面接 → 落選/)).toBeVisible();
}

export async function verifyApplicationTimeline(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { name: "選考履歴" })).toBeVisible();
  await expect(page.getByText(/作成: 保存済み/)).toBeVisible();
  await expect(page.getByText(/保存済み → 書類選考/)).toBeVisible();
  await expect(page.getByText(/書類選考 → 面接/)).toBeVisible();
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
