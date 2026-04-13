import { expect, test } from "playwright/test";

test("dashboard page loads", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.locator("body")).toBeVisible();
});

test("dashboard prompts wallet connection when disconnected", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.locator("body")).toContainText(/connect|wallet/i);
});
