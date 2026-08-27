import type { Page } from "@playwright/test";

const HUMAN_PACE_ENABLED = process.env.E2E_HUMAN_PACE === "true";

export function isHumanPaceEnabled(): boolean {
  return HUMAN_PACE_ENABLED;
}

export async function showcasePageForViewer(page: Page): Promise<void> {
  if (!HUMAN_PACE_ENABLED) return;

  // Give the viewer a moment to read the result before moving the viewport.
  await page.waitForTimeout(900);

  const metrics = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
  }));

  if (metrics.scrollHeight <= metrics.viewportHeight + 48) {
    await page.waitForTimeout(900);
    return;
  }

  // Replay the page from the top, then move through it in readable chunks.
  await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  await page.waitForTimeout(700);

  const step = Math.max(240, Math.round(metrics.viewportHeight * 0.72));
  const maxScrolls = 14;

  for (let index = 0; index < maxScrolls; index += 1) {
    const atBottom = await page.evaluate(() =>
      window.scrollY + window.innerHeight >=
      document.documentElement.scrollHeight - 24,
    );
    if (atBottom) break;

    await page.mouse.wheel(0, step);
    await page.waitForTimeout(450);
  }

  // Ensure long pages still finish at the bottom even when capped above.
  await page.evaluate(() => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  });
  await page.waitForTimeout(1_000);
}
