import { expect, test } from "@playwright/test";

const KNOWN_AGENT_PDA =
  "8DLr8MYie8VHBiLkFcoE6YHtNeKdgz5PWy5tpSV3iqZA";

test("agent profile page loads for known PDA", async ({ page }) => {
  await page.goto(`/agent/${KNOWN_AGENT_PDA}`);
  await page.waitForSelector("body");
  await expect
    .poll(
      async () => {
        const text = await page.locator("body").innerText();
        return text.trim().length;
      },
      { timeout: 15_000 }
    )
    .toBeGreaterThan(50);
});

test("agent profile page has a visible heading or card", async ({ page }) => {
  await page.goto(`/agent/${KNOWN_AGENT_PDA}`);
  await expect(page.locator('h1, h2, [class*="card"]').first()).toBeVisible({
    timeout: 15_000,
  });
});
