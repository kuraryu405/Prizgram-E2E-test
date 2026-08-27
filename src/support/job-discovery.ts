import { expect, test, type Page } from "@playwright/test";
import { assertMutationAllowed } from "./env.js";
import { AI_RESULT_TIMEOUT } from "./timeouts.js";

async function waitForDiscoverySettled(page: Page): Promise<void> {
  const firstCandidate = page.getByRole("article").first();
  const empty = page.getByText("条件に一致する候補がありませんでした", {
    exact: false,
  });
  await Promise.race([
    firstCandidate.waitFor({ state: "visible", timeout: AI_RESULT_TIMEOUT }),
    empty.waitFor({ state: "visible", timeout: AI_RESULT_TIMEOUT }),
  ]);
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
  await page.getByRole("button", { name: "求人を探す" }).click();
  await waitForDiscoverySettled(page);
  let count = await page.getByRole("article").count();

  if (count === 0) {
    await page.getByLabel("キーワード（任意）").fill("software engineer");
    await page.getByRole("button", { name: "求人を探す" }).click();
    await waitForDiscoverySettled(page);
    count = await page.getByRole("article").count();
  }

  if (count === 0) {
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
  await candidate.getByRole("button", { name: "取り込む" }).click();
  await expect(candidate.getByRole("button", { name: "取り込み済み" })).toBeDisabled({
    timeout: AI_RESULT_TIMEOUT,
  });

  await candidate.getByRole("button", { name: "3軸で評価" }).click();
  await expect(candidate.getByRole("group", { name: "3軸評価結果" })).toBeVisible({
    timeout: AI_RESULT_TIMEOUT,
  });
  await expect(candidate).toContainText("スキル適合");
  await expect(candidate).toContainText("文化・価値観");
  await expect(candidate).toContainText("難易度");
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
  await expect(
    page.getByText(new RegExp(`${enabledCount}件を取り込みました|${enabledCount}件中`)),
  ).toBeVisible({ timeout: AI_RESULT_TIMEOUT });
}
