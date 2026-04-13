import { expect, test } from "@playwright/test";

test("register page loads without crashing", async ({ page }) => {
  await page.goto("/register");
  await expect(page.locator("body")).toBeVisible();
});

test("register page has a heading", async ({ page }) => {
  await page.goto("/register");
  await expect(page.locator("h1, h2").first()).toBeVisible({
    timeout: 15_000,
  });
});
