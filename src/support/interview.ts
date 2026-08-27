import { expect, type Locator, type Page } from "@playwright/test";
import { assertMutationAllowed } from "./env.js";
import { AI_RESULT_TIMEOUT } from "./timeouts.js";

export const interviewQuestionAsked = "チーム開発で最も難しかったことは何ですか？";
export const interviewAnswerNotes =
  "役割分担の曖昧さを整理し、Issueを小さく分けてレビューしやすくしたと回答した。";
export const interviewImpression = "質問の意図を確認しながら落ち着いて回答できた";
export const interviewFeedback =
  "技術だけでなく、チームで改善したプロセスを具体的に話すと良いというフィードバック。";

function interviewCard(page: Page): Locator {
  return page.getByRole("heading", { name: "面接準備" }).locator("..");
}

function reflectionSection(page: Page): Locator {
  return page.getByRole("heading", { name: "面接後振り返り" }).locator("..");
}

export async function generateInterviewQuestions(page: Page): Promise<void> {
  assertMutationAllowed();
  const card = interviewCard(page);
  await card.getByLabel("現在の選考段階").fill("一次面接");
  await card.getByRole("button", { name: "想定質問を生成" }).click();
  await expect(card.getByRole("heading", { name: "想定質問" })).toBeVisible({
    timeout: AI_RESULT_TIMEOUT,
  });
  await expect(card.getByRole("button", { name: "回答を組み立てる" }).first()).toBeVisible();
}

export async function generateInterviewOutlineAndFollowup(page: Page): Promise<void> {
  assertMutationAllowed();
  const card = interviewCard(page);
  await card.getByRole("button", { name: "回答を組み立てる" }).first().click();
  await expect(card.getByRole("heading", { name: "回答骨子" })).toBeVisible({
    timeout: AI_RESULT_TIMEOUT,
  });
  await card.getByRole("button", { name: "深掘りを見る" }).click();
  await expect(card.getByText("深掘り候補", { exact: true })).toBeVisible({
    timeout: AI_RESULT_TIMEOUT,
  });
}

export async function saveInterviewReflection(page: Page): Promise<void> {
  assertMutationAllowed();
  const section = reflectionSection(page);
  await section
    .getByLabel("実際に聞かれた質問（1行1問）")
    .fill(interviewQuestionAsked);
  await section.getByLabel("自分の回答/要点").fill(interviewAnswerNotes);
  await section.getByLabel("感触").fill(interviewImpression);
  await section.getByLabel("フィードバック / メモ").fill(interviewFeedback);
  await section.getByRole("button", { name: "振り返りを保存" }).click();
  await expect(section).toContainText(interviewQuestionAsked);
  await expect(section).toContainText(interviewAnswerNotes);
  await expect(section).toContainText(interviewImpression);
  await expect(section).toContainText(interviewFeedback);
}

export async function verifyInterviewReflectionPersists(page: Page): Promise<void> {
  await page.reload();
  const section = reflectionSection(page);
  await expect(section).toContainText(interviewQuestionAsked);
  await expect(section).toContainText(interviewAnswerNotes);
  await expect(section).toContainText(interviewFeedback);
}
