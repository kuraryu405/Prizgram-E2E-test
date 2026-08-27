import { expect, type Locator, type Page } from "@playwright/test";

export const mobileViewports = [
  { width: 320, height: 568 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
] as const;

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    )
    .toBe(true);
}

async function expectTapTarget(locator: Locator): Promise<void> {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
}

async function expectBottomNavigation(page: Page): Promise<void> {
  const navigation = page.locator(".app-nav");
  await expect(navigation).toBeVisible();
  await expect(navigation).toHaveCSS("position", "fixed");
  const viewport = page.viewportSize();
  const bounds = await navigation.boundingBox();
  expect(viewport).not.toBeNull();
  expect(bounds).not.toBeNull();
  expect(Math.abs(bounds!.y + bounds!.height - viewport!.height)).toBeLessThanOrEqual(1);

  for (const name of ["ホーム", "求人", "応募", "ペルソナ"] as const) {
    await expectTapTarget(page.getByRole("link", { name, exact: true }));
  }
  await expectTapTarget(page.getByLabel("その他"));
}

export async function verifyMobileShellAtCurrentViewport(page: Page): Promise<void> {
  await page.goto("/app");
  await expectBottomNavigation(page);
  await expectNoHorizontalOverflow(page);

  const destinations = [
    ["求人", /\/app\/jobs/],
    ["応募", /\/app\/applications/],
    ["ペルソナ", /\/app\/persona/],
    ["ホーム", /\/app$/],
  ] as const;
  for (const [name, url] of destinations) {
    await page.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(url);
    await expectNoHorizontalOverflow(page);
    await expectBottomNavigation(page);
  }

  await page.getByLabel("その他").click();
  const more = page.locator(".app-nav-more");
  await expect(more).toHaveAttribute("open", "");
  await expect(more.getByRole("link", { name: "締切" })).toBeVisible();
  await expect(more.getByRole("link", { name: "通知" })).toBeVisible();
  await expect(more.getByRole("link", { name: "プロフィール" })).toBeVisible();

  await more.getByRole("link", { name: "締切" }).click();
  await expect(page).toHaveURL(/\/app\/deadlines/);
  await expectNoHorizontalOverflow(page);

  await page.getByLabel("その他").click();
  await page.locator(".app-nav-more").getByRole("link", { name: "プロフィール" }).click();
  await expect(page).toHaveURL(/\/app\/profile/);
  await expectNoHorizontalOverflow(page);

  await page.getByRole("link", { name: "通知", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/reminders/);
  await expectNoHorizontalOverflow(page);
  await expectTapTarget(page.getByRole("link", { name: "通知", exact: true }));
}

export async function verifyMobileAccountMenu(page: Page, loginId: string): Promise<void> {
  await page.goto("/app");
  const trigger = page.getByLabel(`アカウント ${loginId}`);
  await expectTapTarget(trigger);
  await trigger.click();
  const menu = page.locator(".app-account-menu");
  await expect(menu).toHaveAttribute("open", "");
  await expect(menu.getByRole("link", { name: "プロフィール" })).toBeVisible();
  await expect(menu.getByRole("button", { name: "ログアウト" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
}
