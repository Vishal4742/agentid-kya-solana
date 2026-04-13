import { expect, test } from "@playwright/test";

test("homepage loads with hero section", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible({ timeout: 15_000 });
});

test("navigation has register and agents links", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('a[href="/register"]').first()).toBeVisible();
  await expect(page.locator('a[href="/agents"]').first()).toBeVisible();
});

test("agents page loads", async ({ page }) => {
  await page.goto("/agents");
  await expect(page.locator("h1, h2, li").first()).toBeVisible({
    timeout: 15_000,
  });
});

test("docs page loads", async ({ page }) => {
  await page.goto("/docs");
  await expect(page.locator("h2").first()).toBeVisible({ timeout: 15_000 });
});

test("unknown route shows not-found content", async ({ page }) => {
  await page.goto("/xyz-not-a-page");
  await expect(page.locator("body")).toContainText(/not found|404/i);
});
