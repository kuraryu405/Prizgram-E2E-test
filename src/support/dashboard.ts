import { expect, type Page } from "@playwright/test";

import { deadlineTitle } from "./deadlines.js";
import { testJob } from "../fixtures/job.js";

function metric(page: Page, label: string) {
  return page
    .getByRole("heading", { name: "状況" })
    .locator("..")
    .getByRole("listitem")
    .filter({ hasText: label });
}

export async function verifyDashboardConsistency(page: Page): Promise<void> {
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "今日やること" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "直近の締切" })).toBeVisible();
  await expect(page.getByText(deadlineTitle, { exact: false })).toBeVisible();

  await expect(metric(page, "選考中")).toContainText("1");
  await expect(metric(page, "7日以内の締切")).toContainText("1");
  await expect(metric(page, "保存求人")).toContainText("1");

  const applications = page.getByRole("heading", { name: "応募" }).locator("..");
  await expect(applications).toContainText(testJob.companyName);
  await expect(applications).toContainText("面接");

  const jobs = page.getByRole("heading", { name: "求人" }).locator("..");
  await expect(jobs).toContainText(testJob.companyName);
  await expect(jobs.getByText("未評価", { exact: true })).toHaveCount(0);

  const persona = page.getByRole("heading", { name: "ペルソナ" }).locator("..");
  await expect(persona).toContainText(/v1/);
  await expect(persona).toContainText(/スキル \d+/);
  await expect(persona).toContainText(/強み \d+/);
  await expect(persona).toContainText(/価値観 \d+/);
}

export async function verifyGoldenJourneyFinalDashboard(page: Page): Promise<void> {
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "今日やること" })).toBeVisible();
  await expect(page.getByText(deadlineTitle, { exact: false })).toBeVisible();

  await expect(metric(page, "選考中")).toContainText("0");
  await expect(metric(page, "7日以内の締切")).toContainText("1");
  await expect(metric(page, "保存求人")).toContainText("1");

  const applications = page.getByRole("heading", { name: "応募" }).locator("..");
  await expect(applications).toContainText(testJob.companyName);
  await expect(applications).toContainText("落選");

  const jobs = page.getByRole("heading", { name: "求人" }).locator("..");
  await expect(jobs).toContainText(testJob.companyName);
  await expect(jobs.getByText("未評価", { exact: true })).toHaveCount(0);

  const persona = page.getByRole("heading", { name: "ペルソナ" }).locator("..");
  await expect(persona).toContainText(/v2/);
}
