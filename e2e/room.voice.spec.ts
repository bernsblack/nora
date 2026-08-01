import { expect, test } from "@playwright/test";

/**
 * Mode one, driven through the Wizard of Oz control. A human types what they
 * heard and the device answers as if it had understood, which is how PROJECT.md
 * section 14 says to test this before trusting any recognition.
 *
 * These are the questions people actually repeat.
 */

const WIZARD_URL = "/room?token=dev-room-token&wizard=1";

async function say(page: import("@playwright/test").Page, words: string) {
  await page.getByTestId("wizard-input").fill(words);
  await page.getByTestId("wizard-send").click();
}

test.beforeEach(async ({ page, request }) => {
  await request.post("/api/test-reset");
  await page.goto(WIZARD_URL);
  await expect(page.getByTestId("day")).toBeVisible();
});

test("answers what day it is", async ({ page }) => {
  await say(page, "watter dag is dit");
  await expect(page.getByTestId("spoken")).toContainText("Dit is");
});

test("answers where they are", async ({ page }) => {
  await say(page, "waar is ek");
  await expect(page.getByTestId("spoken")).toContainText("Willowbrook");
});

test("answers in English when asked in English", async ({ page }) => {
  await say(page, "where am i");
  await expect(page.getByTestId("spoken")).toContainText("You are at Willowbrook");
});

test("answers who it is", async ({ page }) => {
  await say(page, "wie is jy");
  await expect(page.getByTestId("spoken")).toContainText("Nora");
});

test("uses the family's words about the husband who died", async ({ page }) => {
  await say(page, "waar is jan");
  const spoken = page.getByTestId("spoken");
  await expect(spoken).toHaveAttribute("data-rule", /family-wording/);
  await expect(spoken).toContainText("Jan is nie nou hier nie");
  await expect(spoken).not.toContainText(/dood|oorlede/i);
});

test("stays quiet when it did not understand", async ({ page }) => {
  await say(page, "ek dink die wasgoed is nog buite");
  await expect(page.getByTestId("spoken")).toHaveCount(0);
});

test("shows only one answer at a time", async ({ page }) => {
  await say(page, "waar is ek");
  await expect(page.getByTestId("spoken")).toBeVisible();
  // The answer takes the next thing's place rather than stacking under it.
  await expect(page.getByTestId("next-thing")).toHaveCount(0);
});

test("answers going home without promising or refusing", async ({ page }) => {
  await say(page, "wanneer gaan ek huis toe");
  const spoken = page.getByTestId("spoken");
  await expect(spoken).toHaveAttribute("data-rule", "going-home");
  await expect(spoken).toContainText("Willowbrook");
});

test("sounds the same on the fortieth ask as the first", async ({ page }) => {
  await say(page, "watter dag is dit");
  const first = await page.getByTestId("spoken").innerText();
  for (let repeat = 0; repeat < 5; repeat += 1) {
    await say(page, "watter dag is dit");
  }
  await expect(page.getByTestId("spoken")).toHaveText(first);
});
