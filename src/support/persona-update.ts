import { expect, type Page } from "@playwright/test";
import { testJob } from "../fixtures/job.js";
import {
  apiResponseMatcher,
  requireSuccessfulResponse,
  runAndRequireAiResponse,
} from "./api-waits.js";
import { assertMutationAllowed } from "./env.js";
import { AI_RESULT_TIMEOUT } from "./timeouts.js";

export const personaUpdateReflection =
  "面接では、実装速度だけでなくチームでIssueを分割しレビューしやすくした経験を評価された。今後はフロントエンドに限定せずWeb開発全体の経験を伸ばしたい。";

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

  await runAndRequireAiResponse(
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
    await expect(checkPage.getByText(/バージョン1/)).toBeVisible();
    await expect(checkPage.getByText(/v1/)).toBeVisible();
    await expect(checkPage.getByText(/v2/)).toHaveCount(0);
  } finally {
    await checkPage.close();
  }
}

export async function approvePersonaUpdateAndFinishReevaluation(page: Page): Promise<void> {
  assertMutationAllowed();

  // Approval and the first re-evaluation happen sequentially from one click.
  // Observe both network contracts up front so an approve failure cannot leave
  // the test waiting forever for UI that will never be produced.
  const approveResponsePromise = page.waitForResponse(
    apiResponseMatcher("POST", /^\/api\/persona\/update\/approve$/),
    { timeout: AI_RESULT_TIMEOUT },
  );
  const reevaluateResponsePromise = page.waitForResponse(
    apiResponseMatcher("POST", /^\/api\/persona\/update\/re-evaluate$/),
    { timeout: AI_RESULT_TIMEOUT },
  );

  await page
    .getByRole("button", { name: "承認して新バージョンを作成" })
    .click();

  await requireSuccessfulResponse(
    await approveResponsePromise,
    "Persona update approval",
  );
  await requireSuccessfulResponse(
    await reevaluateResponsePromise,
    "Persona job re-evaluation",
  );
  await expect(page.getByRole("heading", { name: "再評価結果" })).toBeVisible();

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const continueButton = page.getByRole("button", { name: /残り\d+件を再評価/ });
    if (!(await continueButton.isVisible().catch(() => false))) break;
    await runAndRequireAiResponse(
      page,
      apiResponseMatcher("POST", /^\/api\/persona\/update\/re-evaluate$/),
      "Persona job re-evaluation continuation",
      async () => {
        await continueButton.click();
      },
    );
    await expect(page.getByRole("heading", { name: "再評価結果" })).toBeVisible();
  }
  await expect(page.getByText("全ての求人の再評価が完了しました。")).toBeVisible();
}

export async function verifyPersonaV2AndFreshScore(page: Page): Promise<void> {
  await page.goto("/app/persona");
  await expect(page.getByText(/バージョン2/)).toBeVisible();
  await expect(page.getByText(/v2/)).toBeVisible();

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
