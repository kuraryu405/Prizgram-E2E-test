import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { join } from "node:path";

import { expect, type Page, type TestInfo } from "@playwright/test";

import { apiResponseMatcher, runAndRequireResponse } from "./api-waits.js";
import { assertMutationAllowed } from "./env.js";

export const reminderCompany = "E2E Reminder株式会社";
export const reminderDeadlineTitle = "E2E リマインダー対象ES";

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

export async function createReminderEligibleDeadline(page: Page): Promise<void> {
  assertMutationAllowed();
  await page.goto("/app/applications");
  const form = page.getByRole("heading", { name: "選考中の企業を追加" }).locator("..");
  await form.getByLabel("企業名").fill(reminderCompany);
  await form.getByLabel("職種 / コース名（任意）").fill("Software Engineer");
  await form.getByLabel("現在のステータス").selectOption("interview");
  await form.getByLabel("現在の段階（任意）").fill("一次面接前");
  await form.getByLabel("次のアクション（任意）").fill("ESを提出する");
  await runAndRequireResponse(
    page,
    apiResponseMatcher("POST", /^\/api\/applications\/minimal$/),
    "Reminder application creation",
    async () => {
      await form.getByRole("button", { name: "応募を追加" }).click();
    },
  );
  const status = form.getByRole("status");
  await expect(status.getByRole("link", { name: "締切を追加" })).toBeVisible();
  await status.getByRole("link", { name: "締切を追加" }).click();

  await page.getByLabel("種別").selectOption("document");
  await page.getByLabel("タイトル").fill(reminderDeadlineTitle);
  await page
    .getByLabel(/期限（Asia\/Tokyoの現地時刻）/)
    .fill(tokyoDateTimeLocal(30));
  await runAndRequireResponse(
    page,
    apiResponseMatcher("POST", /^\/api\/deadlines$/),
    "Reminder deadline creation",
    async () => {
      await page.getByRole("button", { name: "締切を登録" }).click();
    },
  );
  await expect(page.getByText(reminderDeadlineTitle, { exact: true })).toBeVisible();
}

export async function canRunLocalReminderGenerator(): Promise<boolean> {
  const repo = process.env.E2E_PRIZGRAM_REPO?.trim();
  const databaseUrl =
    process.env.E2E_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!repo || !databaseUrl) return false;
  try {
    await access(join(repo, "apps/web/scripts/run-reminders.ts"));
    return true;
  } catch {
    return false;
  }
}

export async function runLocalReminderGenerator(testInfo: TestInfo): Promise<void> {
  const repo = process.env.E2E_PRIZGRAM_REPO?.trim();
  const databaseUrl =
    process.env.E2E_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!repo || !databaseUrl) {
    throw new Error("E2E_PRIZGRAM_REPO and E2E_DATABASE_URL/DATABASE_URL are required");
  }

  const output: string[] = [];
  const exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn(
      "pnpm",
      ["exec", "tsx", "apps/web/scripts/run-reminders.ts"],
      {
        cwd: repo,
        env: { ...process.env, DATABASE_URL: databaseUrl },
        shell: process.platform === "win32",
      },
    );
    child.stdout.on("data", (chunk) => output.push(String(chunk)));
    child.stderr.on("data", (chunk) => output.push(String(chunk)));
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });

  await testInfo.attach("reminder-generator.log", {
    body: Buffer.from(output.join("")),
    contentType: "text/plain",
  });
  if (exitCode !== 0) throw new Error(`reminder generator exited with ${exitCode}`);
}

export async function verifyAndDismissReminder(page: Page): Promise<void> {
  await page.goto("/app/reminders");
  await expect(page.getByRole("heading", { name: "リマインダー" })).toBeVisible();
  const card = page.locator("li.card").filter({ hasText: reminderDeadlineTitle });
  await expect(card).toBeVisible();
  await expect(card.getByText(/優先度:/)).toBeVisible();
  await expect(card.getByText(/検知時刻:/)).toBeVisible();
  await runAndRequireResponse(
    page,
    apiResponseMatcher("POST", /^\/api\/reminders\/[^/]+\/dismiss$/),
    "Reminder dismissal",
    async () => {
      await card.getByRole("button", { name: "解除" }).click();
    },
  );
  await expect(card).toHaveCount(0);
  await page.reload();
  await expect(page.locator("li.card").filter({ hasText: reminderDeadlineTitle })).toHaveCount(0);
}
