import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { test, type Page, type TestInfo } from "@playwright/test";

import { showcasePageForViewer } from "./pacing.js";

function slugify(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9ぁ-んァ-ヶ一-龠_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "step";
}

export async function evidenceStep(
  page: Page,
  testInfo: TestInfo,
  name: string,
  action: () => Promise<void>,
): Promise<void> {
  await test.step(name, async () => {
    await action();
    await showcasePageForViewer(page);

    const path = testInfo.outputPath(
      `evidence/${String(testInfo.attachments.length + 1).padStart(2, "0")}-${slugify(name)}.png`,
    );
    await mkdir(dirname(path), { recursive: true });
    await page.screenshot({ path, fullPage: true });
    await testInfo.attach(`evidence: ${name}`, {
      path,
      contentType: "image/png",
    });
  });
}
