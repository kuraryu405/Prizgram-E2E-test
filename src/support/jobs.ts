import { expect, type Page } from "@playwright/test";
import { testJob, updatedTestJobBody } from "../fixtures/job.js";
import { assertMutationAllowed } from "./env.js";
import { AI_RESULT_TIMEOUT } from "./timeouts.js";

export async function importSyntheticJob(page: Page): Promise<void> {
  assertMutationAllowed();
  await page.goto("/app/jobs");
  await page.getByLabel("求人票本文").fill(testJob.body);
  await page.getByLabel("会社名（任意）").fill(testJob.companyName);
  await page.getByLabel("出典名（任意）").fill(testJob.sourceName);
  await page.getByLabel("出典URL（任意）").fill(testJob.sourceUrl);
  await page.getByRole("button", { name: "求人票を取り込む" }).click();
  await expect(
    page.getByRole("link", { name: new RegExp(testJob.companyName) }),
  ).toBeVisible({ timeout: AI_RESULT_TIMEOUT });
}

export async function openSyntheticJob(page: Page): Promise<void> {
  await page.goto("/app/jobs");
  await page.getByRole("link", { name: new RegExp(testJob.companyName) }).first().click();
  await expect(page.getByRole("heading", { name: testJob.companyName })).toBeVisible();
}

export async function evaluateCurrentJob(page: Page): Promise<void> {
  assertMutationAllowed();
  await page.getByRole("button", { name: "この求人を評価する" }).click();
  await expect(page.getByRole("heading", { name: "スキル適合" })).toBeVisible({
    timeout: AI_RESULT_TIMEOUT,
  });
  await expect(
    page.getByRole("heading", { name: "文化・価値観フィット" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "難易度ギャップ" })).toBeVisible();
}

export async function addSyntheticJobVersion(page: Page): Promise<void> {
  assertMutationAllowed();
  await page.getByLabel("求人本文").last().fill(updatedTestJobBody);
  await page.getByRole("button", { name: "新バージョンとして追加" }).click();
  await expect(page.getByRole("status")).toContainText(/新しいバージョン v\d+ を追加しました/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "バージョン履歴" })).toBeVisible();
  await expect(page.getByText(/v2/)).toBeVisible();
}

export async function archiveAndRestoreSyntheticJob(page: Page): Promise<void> {
  assertMutationAllowed();
  await page.getByRole("button", { name: "求人をアーカイブ" }).click();
  await expect(page).toHaveURL(/\/app\/jobs(?:$|[/?#])/);
  const archivedSection = page.getByRole("heading", { name: "アーカイブ済み" }).locator("..");
  await expect(
    archivedSection.getByRole("link", { name: new RegExp(testJob.companyName) }),
  ).toBeVisible();
  await archivedSection
    .getByRole("link", { name: new RegExp(testJob.companyName) })
    .click();
  await page.getByRole("button", { name: "求人を復元" }).click();
  await expect(page).toHaveURL(/\/app\/jobs(?:$|[/?#])/);
  await expect(
    page.getByRole("heading", { name: "取り込み済みの求人" }).locator("..").getByRole("link", {
      name: new RegExp(testJob.companyName),
    }),
  ).toBeVisible();
}
