import { expect, type Locator, type Page } from "@playwright/test";
import { assertMutationAllowed } from "./env.js";

export const deadlineTitle = "E2E ES提出";
export const updatedDeadlineTitle = "E2E ES提出（更新）";

function tokyoDateTimeLocal(hoursFromNow: number): string {
  const date = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  const parts: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  const hour = parts.hour === "24" ? "00" : (parts.hour ?? "00");
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}`;
}

function row(page: Page, title: string): Locator {
  return page.locator("li.deadline-item").filter({ hasText: title });
}

export async function createDeadlineForCurrentApplication(page: Page): Promise<void> {
  assertMutationAllowed();
  await page.getByRole("link", { name: "締切を管理する" }).click();
  await expect(page).toHaveURL(/\/app\/deadlines\?applicationId=/);
  await page.getByLabel("種別").selectOption("document");
  await page.getByLabel("タイトル").fill(deadlineTitle);
  await page.getByLabel(/期限（Asia\/Tokyoの現地時刻）/).fill(tokyoDateTimeLocal(48));
  await page.getByRole("button", { name: "締切を登録" }).click();
  await expect(row(page, deadlineTitle)).toBeVisible();
}

export async function verifyDeadlineInApplicationAndDashboard(page: Page): Promise<void> {
  const deadlineRow = row(page, deadlineTitle);
  await deadlineRow.getByRole("link", { name: "応募を見る" }).click();
  await expect(page.getByRole("heading", { name: "締切" })).toBeVisible();
  await expect(page.getByText(deadlineTitle, { exact: false })).toBeVisible();

  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "直近の締切" })).toBeVisible();
  await expect(page.getByText(deadlineTitle, { exact: false })).toBeVisible();
}

export async function editDeadline(page: Page): Promise<void> {
  assertMutationAllowed();
  await page.goto("/app/deadlines");
  const deadlineRow = row(page, deadlineTitle);
  await deadlineRow
    .getByRole("button", { name: `${deadlineTitle}のその他の操作` })
    .click();
  await deadlineRow.getByRole("button", { name: "編集" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("タイトル").fill(updatedDeadlineTitle);
  await dialog
    .getByLabel(/期限（Asia\/Tokyoの現地時刻）/)
    .fill(tokyoDateTimeLocal(72));
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  await expect(row(page, updatedDeadlineTitle)).toBeVisible();
  await expect(page.getByText("締切を更新しました。")).toBeVisible();
}

export async function completeRestoreAndDeleteDeadline(page: Page): Promise<void> {
  assertMutationAllowed();
  let deadlineRow = row(page, updatedDeadlineTitle);
  await deadlineRow.getByRole("button", { name: "完了にする" }).click();

  const completedSection = page.getByRole("heading", { name: "完了済み" }).locator("..");
  await expect(completedSection).toContainText(updatedDeadlineTitle);
  deadlineRow = completedSection.locator("li.deadline-item").filter({
    hasText: updatedDeadlineTitle,
  });
  await deadlineRow.getByRole("button", { name: "未完了に戻す" }).click();

  deadlineRow = row(page, updatedDeadlineTitle);
  await expect(deadlineRow).toBeVisible();
  await deadlineRow
    .getByRole("button", { name: `${updatedDeadlineTitle}のその他の操作` })
    .click();
  await deadlineRow.getByRole("button", { name: "削除" }).click();
  const deleteDialog = page.getByRole("dialog");
  await expect(deleteDialog).toContainText(updatedDeadlineTitle);
  await deleteDialog.getByRole("button", { name: "削除する" }).click();
  await expect(row(page, updatedDeadlineTitle)).toHaveCount(0);
}
