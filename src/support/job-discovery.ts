import { expect, test, type Page } from "@playwright/test";
import {
  apiResponseMatcher,
  runAndRequireAiResponse,
  runAndRequireResponse,
} from "./api-waits.js";
import { assertMutationAllowed } from "./env.js";
import { AI_RESULT_TIMEOUT } from "./timeouts.js";

const DISCOVERY_RESPONSE_TIMEOUT_MS = 45_000;

async function runDiscovery(page: Page): Promise<void> {
  await runAndRequireResponse(
    page,
    apiResponseMatcher("POST", /^\/api\/jobs\/discover$/),
    "Job discovery",
    async () => {
      await page.getByRole("button", { name: "求人を探す" }).click();
    },
    DISCOVERY_RESPONSE_TIMEOUT_MS,
  );
  await expect(
    page.getByRole("heading", { name: /検索結果\s+[\d,]+件/ }),
  ).toBeVisible();
}

async function verifyProviderSummary(page: Page): Promise<void> {
  const sources = page.getByRole("list", { name: "求人取得元" });
  await expect(sources).toBeVisible();
  for (const provider of ["Careerjet", "Himalayas", "Jobicy"] as const) {
    await expect(sources).toContainText(provider);
  }
}

export async function verifyDiscoveryFiltersReset(page: Page): Promise<void> {
  await page.goto("/app/jobs");
  await page.getByLabel("キーワード（任意）").fill("software engineer");
  await page.getByLabel("勤務地（任意）").fill("Tokyo");
  await page.getByLabel("雇用形態（任意）").selectOption("internship");
  await page.getByRole("button", { name: "条件をリセット" }).click();
  await expect(page.getByLabel("キーワード（任意）")).toHaveValue("");
  await expect(page.getByLabel("勤務地（任意）")).toHaveValue("");
  await expect(page.getByLabel("雇用形態（任意）")).toHaveValue("");
}

export async function discoverJobs(page: Page): Promise<number> {
  assertMutationAllowed();
  await runDiscovery(page);
  await verifyProviderSummary(page);
  let count = await page.getByRole("article").count();

  if (count === 0) {
    await page.getByLabel("キーワード（任意）").fill("software engineer");
    await runDiscovery(page);
    await verifyProviderSummary(page);
    count = await page.getByRole("article").count();
  }

  if (count === 0) {
    await expect(page.getByText("候補が見つかりませんでした。", { exact: true })).toBeVisible();
    test.info().annotations.push({
      type: "EXTERNAL_DEPENDENCY",
      description: "求人providerから候補を取得できなかったため、候補操作を実行しませんでした。",
    });
  }
  return count;
}

export async function importAndEvaluateFirstCandidate(page: Page): Promise<void> {
  assertMutationAllowed();
  const candidate = page.getByRole("article").first();
  await expect(candidate).toBeVisible();

  await runAndRequireAiResponse(
    page,
    apiResponseMatcher("POST", /^\/api\/jobs$/),
    "Discovered job import",
    async () => {
      await candidate.getByRole("button", { name: "取り込む" }).click();
    },
  );
  await expect(candidate.getByRole("button", { name: "取り込み済み" })).toBeDisabled();

  await runAndRequireAiResponse(
    page,
    apiResponseMatcher("POST", /^\/api\/jobs\/[^/]+\/score$/),
    "Discovered job scoring",
    async () => {
      await candidate.getByRole("button", { name: "3軸で評価" }).click();
    },
  );
  await expect(candidate.getByRole("group", { name: "3軸評価結果" })).toBeVisible();
  await expect(candidate).toContainText("スキル適合");
  await expect(candidate).toContainText("カルチャー適合");
  await expect(candidate).toContainText("難易度ギャップ");

  await candidate.getByRole("button", { name: "根拠を見る" }).click();
  await expect(candidate).toContainText("根拠:");
  const evidenceIds = candidate.locator(".candidate-score-details .signal-id");
  await expect(evidenceIds.first()).toBeVisible();
  await expect(candidate.getByRole("link", { name: "詳細へ" })).toBeVisible();
}

export async function bulkImportRemainingCandidates(page: Page): Promise<void> {
  assertMutationAllowed();
  const selectable = page.getByRole("checkbox", { name: /を選択$/ });
  const count = await selectable.count();
  let enabledCount = 0;
  for (let index = 0; index < count; index += 1) {
    if (await selectable.nth(index).isEnabled()) enabledCount += 1;
  }

  if (enabledCount === 0) {
    test.info().annotations.push({
      type: "EXTERNAL_DEPENDENCY",
      description: "一括取り込み可能な追加候補がなかったためbulk importを省略しました。",
    });
    return;
  }

  await page.getByRole("checkbox", { name: "すべて選択" }).check();
  const bulkButton = page.getByRole("button", {
    name: new RegExp(`選択した${enabledCount}件を取り込む`),
  });
  await bulkButton.click();

  // Bulk import may issue several LLM-backed /api/jobs requests concurrently.
  // Do not time-limit those requests, but stop waiting as soon as the UI says
  // the batch has completed; then classify the resulting toast explicitly.
  const busyButton = page.getByRole("button", { name: "取り込み中…" });
  await expect(busyButton).toBeVisible();
  await expect(busyButton).toHaveCount(0, { timeout: AI_RESULT_TIMEOUT });

  const allFailed = page.getByRole("alert").filter({
    hasText: /件の取り込みに失敗しました/,
  });
  if (await allFailed.isVisible().catch(() => false)) {
    throw new Error((await allFailed.textContent())?.trim() || "Bulk job import failed");
  }

  await expect(
    page.getByRole("status").filter({
      hasText: /件を取り込みました|件中\d+件を取り込みました/,
    }),
  ).toBeVisible();
}
