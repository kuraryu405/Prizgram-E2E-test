import { expect, type Page } from "@playwright/test";
import { testJob } from "../fixtures/job.js";
import { assertMutationAllowed } from "./env.js";

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
  await page.getByRole("button", { name: "更新案を作成" }).click();
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
  await page
    .getByRole("button", { name: "承認して新バージョンを作成" })
    .click();
  await expect(page.getByRole("heading", { name: "再評価結果" })).toBeVisible({
    timeout: 120_000,
  });

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const continueButton = page.getByRole("button", { name: /残り\d+件を再評価/ });
    if (!(await continueButton.isVisible().catch(() => false))) break;
    await continueButton.click();
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
  await expect(page.getByRole("heading", { name: "スキル適合" })).toBeVisible();
  await expect(
    page.getByText(/評価が古くなっています/),
  ).toHaveCount(0);
}
