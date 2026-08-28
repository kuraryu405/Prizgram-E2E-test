import { expect, type Page, type Response } from "@playwright/test";
import { testJob } from "../fixtures/job.js";
import {
  apiResponseMatcher,
  requireSuccessfulResponse,
  runAndRequireAiResponse,
  runAndRequireRetryableAiResponse,
} from "./api-waits.js";
import { withDemoWait } from "./demo-timeline.js";
import { assertMutationAllowed } from "./env.js";
import { AI_RESULT_TIMEOUT } from "./timeouts.js";

export const personaUpdateReflection =
  "面接では、実装速度だけでなくチームでIssueを分割しレビューしやすくした経験を評価された。今後はフロントエンドに限定せずWeb開発全体の経験を伸ばしたい。";

const MAX_REEVALUATION_BATCHES = 20;

type ReevaluationPayload = Readonly<{
  audit: ReadonlyArray<
    | { jobId: string; status: "scored"; scoreId: string }
    | { jobId: string; status: "failed"; code: string }
  >;
  remainingJobs: number;
}>;

type ApiResult<T> = Readonly<{
  ok: boolean;
  data?: T;
  requestId?: string;
}>;

function personaHistory(page: Page) {
  return page.getByRole("heading", { name: "バージョン履歴" }).locator("..");
}

async function requireSuccessfulReevaluation(response: Response): Promise<number> {
  const result = (await response.json()) as ApiResult<ReevaluationPayload>;
  const payload = result.data;
  if (
    result.ok !== true ||
    payload === undefined ||
    !Array.isArray(payload.audit) ||
    typeof payload.remainingJobs !== "number"
  ) {
    throw new Error(
      `Persona job re-evaluation returned an unexpected API result: ${JSON.stringify(result)}`,
    );
  }
  const failures = payload.audit.filter(
    (entry): entry is Extract<ReevaluationPayload["audit"][number], { status: "failed" }> =>
      entry.status === "failed",
  );
  if (failures.length > 0) {
    throw new Error(
      `Persona job re-evaluation reported per-job failure(s): ${failures
        .map((entry) => `${entry.jobId}:${entry.code}`)
        .join(", ")}`,
    );
  }
  return payload.remainingJobs;
}

export async function proposePersonaUpdate(page: Page): Promise<void> {
  assertMutationAllowed();
  await page.goto("/app/persona/update");
  const applicationSelect = page.getByLabel("対象応募（任意）");
  const applicationOption = applicationSelect.locator("option").filter({
    hasText: testJob.companyName,
  });
  await expect(applicationOption).toHaveCount(1);
  const applicationId = await applicationOption.getAttribute("value");
  if (!applicationId) throw new Error("Synthetic application option has no value");
  await applicationSelect.selectOption(applicationId);
  await page.getByLabel("振り返りメモ").fill(personaUpdateReflection);

  await runAndRequireRetryableAiResponse(
    page,
    apiResponseMatcher("POST", /^\/api\/persona\/update\/propose$/),
    "Persona update proposal",
    async () => {
      await page.getByRole("button", { name: "更新案を作成" }).click();
    },
  );
  await expect(page.getByRole("heading", { name: "更新案の確認" })).toBeVisible();
  await expect(page.getByText(/提案は自動確定されません/)).toBeVisible();
}

export async function verifyPersonaStillV1BeforeApproval(page: Page): Promise<void> {
  const checkPage = await page.context().newPage();
  try {
    await checkPage.goto("/app/persona");
    await expect(checkPage.locator(".page-lead")).toContainText("バージョン1");
    const history = personaHistory(checkPage);
    await expect(history.getByText(/^v1（/)).toBeVisible();
    await expect(history.getByText(/^v2（/)).toHaveCount(0);
  } finally {
    await checkPage.close();
  }
}

export async function approvePersonaUpdateAndFinishReevaluation(page: Page): Promise<void> {
  assertMutationAllowed();

  // Approval and the first re-evaluation happen sequentially from one click.
  // Observe both network contracts up front so a fast re-evaluation cannot be
  // missed. Attach a rejection handler because approve may fail before re-eval
  // ever starts, in which case Playwright will close this pending waiter.
  const approveResponsePromise = page.waitForResponse(
    apiResponseMatcher("POST", /^\/api\/persona\/update\/approve$/),
    { timeout: AI_RESULT_TIMEOUT },
  );
  const reevaluateResponsePromise = page.waitForResponse(
    apiResponseMatcher("POST", /^\/api\/persona\/update\/re-evaluate$/),
    { timeout: AI_RESULT_TIMEOUT },
  );
  void reevaluateResponsePromise.catch(() => undefined);

  await page
    .getByRole("button", { name: "承認して新バージョンを作成" })
    .click();

  await requireSuccessfulResponse(
    await withDemoWait("Persona update approval", () => approveResponsePromise),
    "Persona update approval",
  );
  const firstReevaluation = await requireSuccessfulResponse(
    await withDemoWait("Persona job re-evaluation", () => reevaluateResponsePromise),
    "Persona job re-evaluation",
  );
  let remainingJobs = await requireSuccessfulReevaluation(firstReevaluation);
  await expect(page.getByRole("heading", { name: "再評価結果" })).toBeVisible();

  for (
    let batch = 0;
    remainingJobs > 0 && batch < MAX_REEVALUATION_BATCHES;
    batch += 1
  ) {
    const continueButton = page.getByRole("button", { name: /残り\d+件を再評価/ });
    await expect(continueButton).toBeVisible();
    const response = await runAndRequireAiResponse(
      page,
      apiResponseMatcher("POST", /^\/api\/persona\/update\/re-evaluate$/),
      "Persona job re-evaluation continuation",
      async () => {
        await continueButton.click();
      },
    );
    remainingJobs = await requireSuccessfulReevaluation(response);
    await expect(page.getByRole("heading", { name: "再評価結果" })).toBeVisible();
  }

  if (remainingJobs > 0) {
    throw new Error(
      `Persona job re-evaluation still has ${remainingJobs} pending job(s) after ${MAX_REEVALUATION_BATCHES} batches.`,
    );
  }
  await expect(page.getByText("全ての求人の再評価が完了しました。")).toBeVisible();
}

export async function verifyPersonaV2AndFreshScore(page: Page): Promise<void> {
  await page.goto("/app/persona");
  await expect(page.locator(".page-lead")).toContainText("バージョン2");
  await expect(personaHistory(page).getByText(/^v2（/)).toBeVisible();

  await page.goto("/app/jobs");
  await page.getByRole("link", { name: new RegExp(testJob.companyName) }).first().click();
  await expect(page.getByText(/最新の評価を表示しています/)).toBeVisible();
  const currentScore = page.getByRole("region", { name: "3軸評価" }).locator(".score-current");
  await expect(currentScore).toBeVisible();
  await expect(
    currentScore.locator("li.axis-item").filter({ hasText: "スキル適合" }),
  ).toBeVisible();
  await expect(page.getByText(/評価が古くなっています/)).toHaveCount(0);
}
