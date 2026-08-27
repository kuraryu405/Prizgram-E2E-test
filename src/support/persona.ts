import { expect, type Page } from "@playwright/test";
import { personaAnswers } from "../fixtures/persona.js";
import { apiResponseMatcher, runAndRequireAiResponse } from "./api-waits.js";
import { assertMutationAllowed } from "./env.js";
import { AI_RESULT_TIMEOUT } from "./timeouts.js";

const personaSteps = [
  ["スキル", personaAnswers.skills],
  ["経験", personaAnswers.experiences],
  ["強み", personaAnswers.strengths],
  ["弱み", personaAnswers.weaknesses],
  ["価値観", personaAnswers.values],
  ["志向", personaAnswers.preferences],
] as const;

export async function createPersonaFromFixture(page: Page): Promise<void> {
  assertMutationAllowed();

  // `/app/persona/intake` is the canonical route for a user without a Persona.
  // Enter it directly rather than relying on the Persona empty-state CTA being
  // detected and clicked; that keeps the E2E focused on the intake contract.
  await page.goto("/app/persona/intake");
  await expect(page).toHaveURL(/\/app\/persona\/intake(?:$|[/?#])/);
  await expect(
    page.getByRole("heading", { name: "ペルソナ・ヒアリング" }),
  ).toBeVisible();

  for (let index = 0; index < personaSteps.length; index += 1) {
    const [label, answer] = personaSteps[index];
    await expect(page.getByLabel("進捗")).toContainText(`質問 ${index + 1} / 6`);
    await page.getByLabel(`${label}の回答`).fill(answer);

    if (index < personaSteps.length - 1) {
      await page.getByRole("button", { name: "保存して次へ" }).click();
    } else {
      await runAndRequireAiResponse(
        page,
        apiResponseMatcher("POST", /^\/api\/persona\/generate$/),
        "Persona generation",
        async () => {
          await page.getByRole("button", { name: "ペルソナを生成する" }).click();
        },
      );
    }
  }

  await expect(page).toHaveURL(/\/app\/persona(?:$|[/?#])/, {
    timeout: AI_RESULT_TIMEOUT,
  });
  await expect(page.getByRole("heading", { name: "ペルソナ" })).toBeVisible({
    timeout: AI_RESULT_TIMEOUT,
  });
  await expect(page.getByRole("heading", { name: "スキル" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "経験" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "強み" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "弱み" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "価値観" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "志向" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "根拠（抜粋）" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "バージョン履歴" })).toBeVisible();
}
