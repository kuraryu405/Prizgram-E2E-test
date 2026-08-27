import { expect, type Locator, type Page } from "@playwright/test";
import { assertMutationAllowed } from "./env.js";
import { AI_RESULT_TIMEOUT } from "./timeouts.js";

export const aiDocumentTitle = "E2E AI ES";
export const aiQuestion = "学生時代に最も力を入れたことを400文字以内で教えてください";

function aiSection(page: Page): Locator {
  return page.getByRole("heading", { name: "ES AI支援" }).locator("..");
}

function aiDocumentCard(page: Page): Locator {
  return page.getByRole("heading", { name: aiDocumentTitle, exact: true }).locator("..").locator("..");
}

export async function createAiDocument(page: Page): Promise<void> {
  assertMutationAllowed();
  await page.getByLabel("新しい書類").fill(aiDocumentTitle);
  await page.getByRole("button", { name: "書類を追加" }).click();
  await expect(page.getByRole("heading", { name: aiDocumentTitle })).toBeVisible();
}

export async function findEsEpisodes(page: Page): Promise<void> {
  assertMutationAllowed();
  const section = aiSection(page);
  await section.getByLabel("設問").fill(aiQuestion);
  await section.getByLabel("文字数制限").fill("400");
  await section.getByRole("button", { name: "使えそうな経験を探す" }).click();
  const candidate = section.locator('li[role="button"]').first();
  await expect(candidate).toBeVisible({ timeout: AI_RESULT_TIMEOUT });
  await expect(candidate).toContainText(/関連:|根拠:|evidence:/);
  await candidate.click();
}

export async function generateAndHumanEditDraft(page: Page): Promise<string> {
  assertMutationAllowed();
  const section = aiSection(page);
  await section.getByRole("button", { name: "この経験で下書きを作る" }).click();
  const preview = section.getByLabel("AI生成結果");
  await expect(preview).toBeVisible({ timeout: AI_RESULT_TIMEOUT });
  const generated = await preview.inputValue();
  expect(generated.trim().length).toBeGreaterThan(0);
  const humanEdited = `${generated.slice(0, 360).trim()} E2Eで内容を確認・編集しました。`;
  await preview.fill(humanEdited);
  await expect(preview).toHaveValue(humanEdited);
  return humanEdited;
}

export async function saveAiDraftAndRevise(page: Page, expectedDraft: string): Promise<void> {
  assertMutationAllowed();
  const section = aiSection(page);
  await section.getByLabel("保存先の書類").selectOption({ label: aiDocumentTitle });
  await section.getByRole("button", { name: "この内容で保存（AI生成）" }).click();

  let card = aiDocumentCard(page);
  let entry = card.getByLabel(new RegExp("学生時代に最も力を入れたこと"));
  await expect(entry).toHaveValue(expectedDraft);
  await expect(card).toContainText("AI生成");

  const userEdited = `${expectedDraft.slice(0, 350).trim()} 保存後にもユーザーが編集しました。`;
  await entry.fill(userEdited);
  await entry.blur();

  card = aiDocumentCard(page);
  entry = card.getByLabel(new RegExp("学生時代に最も力を入れたこと"));
  await expect(entry).toHaveValue(userEdited);
  await expect(card).toContainText("ユーザー編集");

  await card.getByRole("button", { name: "AI添削" }).click();
  await expect(card.getByText("添削案", { exact: true })).toBeVisible({
    timeout: AI_RESULT_TIMEOUT,
  });
}
