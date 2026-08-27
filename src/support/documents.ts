import { expect, type Locator, type Page } from "@playwright/test";
import {
  apiResponseMatcher,
  requireSuccessfulResponse,
  runAndRequireResponse,
} from "./api-waits.js";
import { assertMutationAllowed } from "./env.js";

export const manualDocumentTitle = "E2E ES";
export const editedDocumentTitle = "E2E ES（編集）";
export const manualQuestion = "学生時代に力を入れたこと";
export const manualAnswer =
  "チームでWebアプリを開発し、担当機能の実装とレビュー対応を行いました。";
export const editedManualAnswer =
  "チームでWebアプリを開発し、担当機能の実装、テスト、レビュー対応まで行いました。";

function documentCard(page: Page, title: string): Locator {
  return page
    .locator("ul.document-list > li.card")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
}

export async function createManualDocument(page: Page): Promise<void> {
  assertMutationAllowed();
  await expect(page.getByRole("heading", { name: "応募書類 / ES" })).toBeVisible();
  await page.getByLabel("新しい書類").fill(manualDocumentTitle);
  await runAndRequireResponse(
    page,
    apiResponseMatcher("POST", /^\/api\/applications\/[^/]+\/documents$/),
    "Document creation",
    async () => {
      await page.getByRole("button", { name: "書類を追加" }).click();
    },
  );
  await expect(page.getByRole("heading", { name: manualDocumentTitle })).toBeVisible();
}

export async function renameManualDocument(page: Page): Promise<void> {
  assertMutationAllowed();
  const card = documentCard(page, manualDocumentTitle);
  await card.getByRole("button", { name: "タイトルを編集" }).click();
  await card.getByLabel("書類タイトル").fill(editedDocumentTitle);
  await runAndRequireResponse(
    page,
    apiResponseMatcher("PATCH", /^\/api\/documents\/[^/]+$/),
    "Document rename",
    async () => {
      await card.getByRole("button", { name: "保存", exact: true }).click();
    },
  );
  await expect(page.getByRole("heading", { name: editedDocumentTitle })).toBeVisible();
}

export async function addAndEditManualEntry(page: Page): Promise<void> {
  assertMutationAllowed();
  let card = documentCard(page, editedDocumentTitle);
  await card.getByLabel("設問", { exact: true }).fill(manualQuestion);
  await card.getByLabel("回答", { exact: true }).fill(manualAnswer);
  await runAndRequireResponse(
    page,
    apiResponseMatcher("POST", /^\/api\/documents\/[^/]+\/entries$/),
    "Document entry creation",
    async () => {
      await card.getByRole("button", { name: "設問を追加" }).click();
    },
  );

  card = documentCard(page, editedDocumentTitle);
  const entry = card.getByLabel(new RegExp(manualQuestion));
  await expect(entry).toHaveValue(manualAnswer);
  await expect(card).toContainText("ユーザー編集");

  await entry.fill(editedManualAnswer);
  const updateResponsePromise = page.waitForResponse(
    apiResponseMatcher("PATCH", /^\/api\/entries\/[^/]+$/),
  );
  await entry.blur();
  await requireSuccessfulResponse(
    await updateResponsePromise,
    "Document entry update",
  );

  card = documentCard(page, editedDocumentTitle);
  await expect(card.getByLabel(new RegExp(manualQuestion))).toHaveValue(
    editedManualAnswer,
  );
}

export async function verifyManualDocumentPersists(page: Page): Promise<void> {
  await page.reload();
  const card = documentCard(page, editedDocumentTitle);
  await expect(card).toBeVisible();
  await expect(card.getByLabel(new RegExp(manualQuestion))).toHaveValue(
    editedManualAnswer,
  );
  await expect(card).toContainText("ユーザー編集");
}

export async function submitManualDocument(page: Page): Promise<void> {
  assertMutationAllowed();
  let card = documentCard(page, editedDocumentTitle);
  await runAndRequireResponse(
    page,
    apiResponseMatcher("POST", /^\/api\/documents\/[^/]+\/submit$/),
    "Document submission",
    async () => {
      await card.getByRole("button", { name: "提出済みにする" }).click();
    },
  );
  card = documentCard(page, editedDocumentTitle);
  await expect(card).toContainText("提出済み");
  await expect(card.getByLabel(new RegExp(manualQuestion))).toBeDisabled();
  await expect(card.getByRole("button", { name: "設問を追加" })).toHaveCount(0);

  await page.reload();
  card = documentCard(page, editedDocumentTitle);
  await expect(card).toContainText("提出済み");
  await expect(card.getByLabel(new RegExp(manualQuestion))).toBeDisabled();
}
