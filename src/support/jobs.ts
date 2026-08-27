import { expect, type Page, type Response } from "@playwright/test";
import { testJob, updatedTestJobBody } from "../fixtures/job.js";
import {
  apiResponseMatcher,
  runAndRequireAiResponse,
  runAndRequireResponse,
} from "./api-waits.js";
import { assertMutationAllowed } from "./env.js";
import { AI_RESULT_TIMEOUT } from "./timeouts.js";

const CLOUDFLARE_SCORE_RETRY_LIMIT = 3;
const ORIGIN_HEALTH_POLL_MS = 5_000;
const ORIGIN_HEALTH_TIMEOUT_MS = 120_000;

export async function importSyntheticJob(page: Page): Promise<void> {
  assertMutationAllowed();
  await page.goto("/app/jobs");
  await page.getByLabel("求人票本文").fill(testJob.body);
  await page.getByLabel("会社名（任意）").fill(testJob.companyName);
  await page.getByLabel("出典名（任意）").fill(testJob.sourceName);
  await page.getByLabel("出典URL（任意）").fill(testJob.sourceUrl);
  await runAndRequireAiResponse(
    page,
    apiResponseMatcher("POST", /^\/api\/jobs$/),
    "Synthetic job import",
    async () => {
      await page.getByRole("button", { name: "求人票を取り込む" }).click();
    },
  );
  await expect(
    page.getByRole("link", { name: new RegExp(testJob.companyName) }),
  ).toBeVisible();
}

export async function openSyntheticJob(page: Page): Promise<void> {
  await page.goto("/app/jobs");
  await page.getByRole("link", { name: new RegExp(testJob.companyName) }).first().click();
  await expect(page.getByRole("heading", { name: testJob.companyName })).toBeVisible();
}

function isScoreResponse(response: Response): boolean {
  if (response.request().method() !== "POST") return false;
  try {
    return /\/api\/jobs\/[^/]+\/score$/.test(new URL(response.url()).pathname);
  } catch {
    return false;
  }
}

async function isCloudflareHostFailure(response: Response, body: string): Promise<boolean> {
  if (response.status() !== 502) return false;
  const contentType = (await response.headerValue("content-type")) ?? "";
  return (
    contentType.toLowerCase().includes("text/html") &&
    /cloudflare/i.test(body) &&
    /bad gateway|host\s+error|cf-error-source/i.test(body)
  );
}

async function waitForOriginHealth(page: Page): Promise<void> {
  const deadline = Date.now() + ORIGIN_HEALTH_TIMEOUT_MS;
  let lastStatus = "unreachable";

  while (Date.now() < deadline) {
    try {
      const response = await page.request.get("/api/health", {
        failOnStatusCode: false,
        timeout: 10_000,
      });
      lastStatus = `HTTP ${response.status()}`;
      if (response.ok()) return;
    } catch (error) {
      lastStatus = error instanceof Error ? error.message : String(error);
    }
    await page.waitForTimeout(ORIGIN_HEALTH_POLL_MS);
  }

  throw new Error(
    `Prizgram origin did not recover within ${ORIGIN_HEALTH_TIMEOUT_MS / 1000}s after a Cloudflare 502 (last health result: ${lastStatus}).`,
  );
}

async function requestCurrentJobScore(page: Page): Promise<Response> {
  const scoreResponsePromise = page.waitForResponse(isScoreResponse, {
    timeout: AI_RESULT_TIMEOUT,
  });
  await page.getByRole("button", { name: "この求人を評価する" }).click();
  return scoreResponsePromise;
}

export async function evaluateCurrentJob(page: Page): Promise<void> {
  assertMutationAllowed();

  let scoreResponse: Response | undefined;
  for (let attempt = 1; attempt <= CLOUDFLARE_SCORE_RETRY_LIMIT; attempt += 1) {
    scoreResponse = await requestCurrentJobScore(page);
    if (scoreResponse.ok()) break;

    const body = await scoreResponse.text().catch(() => "<response body unavailable>");
    if (!(await isCloudflareHostFailure(scoreResponse, body))) {
      throw new Error(
        `Job scoring failed: HTTP ${scoreResponse.status()} ${scoreResponse.statusText()}\n${body}`,
      );
    }

    if (attempt === CLOUDFLARE_SCORE_RETRY_LIMIT) {
      throw new Error(
        `Job scoring failed after ${CLOUDFLARE_SCORE_RETRY_LIMIT} attempts because Cloudflare repeatedly reported a 502 Host Error for the Prizgram origin.`,
      );
    }

    await waitForOriginHealth(page);
    await expect(page.getByRole("button", { name: "この求人を評価する" })).toBeEnabled();
  }

  if (scoreResponse === undefined || !scoreResponse.ok()) {
    throw new Error("Job scoring did not produce a successful response.");
  }

  const scoreSection = page.getByRole("region", { name: "3軸評価" });

  // ScoreEvaluateButton first renders the fresh result client-side, then calls
  // router.refresh(). During that transition both the client preview and the
  // server-rendered persisted score can briefly coexist. Assert only against
  // .score-current so strict-mode locators never race that duplicate DOM.
  const currentScore = scoreSection.locator(".score-current");
  await expect(currentScore).toBeVisible();

  for (const axisName of [
    "スキル適合",
    "文化・価値観フィット",
    "難易度ギャップ",
  ] as const) {
    // Playwright's `has` locator is evaluated relative to each candidate.
    // Passing a locator already rooted at currentScore makes the condition
    // impossible to satisfy. Filter the axis item by its own text instead,
    // then assert the exact heading inside that item.
    const axis = currentScore.locator("li.axis-item").filter({ hasText: axisName });
    await expect(axis).toHaveCount(1);
    await expect(axis.getByRole("heading", { name: axisName, exact: true })).toBeVisible();
    await expect(axis.locator(".axis-score")).toContainText(/\d+\s*\/\s*100/);
    await expect(axis).toContainText("根拠:");
    await expect(axis.locator("ul").nth(0).getByRole("listitem").first()).toBeVisible();
    const evidence = axis.locator("ul").nth(1).getByRole("listitem").first();
    await expect(evidence).toBeVisible();
    await expect(evidence.locator(".signal-id")).toBeVisible();
  }
  await expect(currentScore).toContainText(/persona\s+[a-zA-Z0-9]+/);
}

export async function addSyntheticJobVersion(page: Page): Promise<void> {
  assertMutationAllowed();
  await page.getByLabel("求人本文").last().fill(updatedTestJobBody);
  await runAndRequireAiResponse(
    page,
    apiResponseMatcher("POST", /^\/api\/jobs$/),
    "Synthetic job re-import",
    async () => {
      await page.getByRole("button", { name: "新バージョンとして追加" }).click();
    },
  );
  await expect(page.getByRole("status")).toContainText(/新しいバージョン v\d+ を追加しました/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "バージョン履歴" })).toBeVisible();
  await expect(page.getByText(/v2/)).toBeVisible();
}

export async function archiveAndRestoreSyntheticJob(page: Page): Promise<void> {
  assertMutationAllowed();
  await runAndRequireResponse(
    page,
    apiResponseMatcher("PATCH", /^\/api\/jobs\/[^/]+$/),
    "Job archive",
    async () => {
      await page.getByRole("button", { name: "求人をアーカイブ" }).click();
    },
  );
  await expect(page).toHaveURL(/\/app\/jobs(?:$|[/?#])/);
  const archivedSection = page.getByRole("heading", { name: "アーカイブ済み" }).locator("..");
  await expect(
    archivedSection.getByRole("link", { name: new RegExp(testJob.companyName) }),
  ).toBeVisible();
  await archivedSection
    .getByRole("link", { name: new RegExp(testJob.companyName) })
    .click();

  await runAndRequireResponse(
    page,
    apiResponseMatcher("PATCH", /^\/api\/jobs\/[^/]+$/),
    "Job restore",
    async () => {
      await page.getByRole("button", { name: "求人を復元" }).click();
    },
  );
  await expect(page).toHaveURL(/\/app\/jobs(?:$|[/?#])/);
  await expect(
    page.getByRole("heading", { name: "取り込み済みの求人" }).locator("..").getByRole("link", {
      name: new RegExp(testJob.companyName),
    }),
  ).toBeVisible();
}
