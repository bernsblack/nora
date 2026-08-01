import { expect, test } from "@playwright/test";

/**
 * The family app, on a phone, which is where it will be used. A daughter
 * standing in a corridor between visits.
 */

const ROOM_URL = "/room?token=dev-room-token";

test.beforeEach(async ({ page, request }) => {
  await request.post("/api/test-reset");
  await page.goto("/app");
});

test("goes straight to the person rather than a list of one", async ({ page }) => {
  await expect(page).toHaveURL(/\/app\/person-marta/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Marta");
});

test("keeps whose settings these are in view while scrolling", async ({ page }) => {
  await page.getByRole("heading", { name: "Screens in the room" }).scrollIntoViewIfNeeded();
  await expect(page.getByText("Marta", { exact: true })).toBeVisible();
});

test("shows the room screen itself, live, rather than describing it", async ({ page }) => {
  const preview = page.frameLocator('iframe[title*="Live view"]');
  await expect(preview.getByTestId("day")).toBeVisible();
  await expect(preview.getByTestId("location")).toContainText("Willowbrook");
});

test("a note written here becomes the next thing in the room", async ({ page }) => {
  await page.getByLabel("In Afrikaans", { exact: true }).fill("Pa is by die werk, hy is vanaand tuis.");
  await page.getByRole("button", { name: "Put this on the screen" }).click();
  await expect(page.getByText("On the screen now.")).toBeVisible();

  await page.goto(ROOM_URL);
  await expect(page.getByTestId("next-thing")).toHaveText("Pa is by die werk, hy is vanaand tuis.");
});

test("says so when something is saved", async ({ page }) => {
  await page.getByLabel("The name they answer to").fill("Marta");
  await page.getByRole("button", { name: "Save these details" }).click();
  await expect(page.getByText(/Saved\. The room screen has it now\./)).toBeVisible();
});

test("the simplicity dial takes things off the room screen", async ({ page }) => {
  await page.getByLabel("How much the device does").selectOption("minimal");
  await page.getByRole("button", { name: "Save these details" }).click();
  await expect(page.getByText(/Saved/)).toBeVisible();

  await page.goto(ROOM_URL);
  await expect(page.getByTestId("day")).toBeVisible();
  await expect(page.getByTestId("photo")).toBeVisible();
  await expect(page.getByTestId("location")).toHaveCount(0);
  await expect(page.getByTestId("next-thing")).toHaveCount(0);
});

test("turning the microphone off says so on the room screen", async ({ page }) => {
  await page.getByLabel("The device may listen").uncheck();
  await page.getByRole("button", { name: "Save these details" }).click();
  await expect(page.getByText(/Saved/)).toBeVisible();

  await page.goto(ROOM_URL);
  await expect(page.getByTestId("mic-state")).toContainText("Mikrofoon af");
});

test.describe("the answer policy", () => {
  test("is set apart from the ordinary settings and says what it will not do", async ({
    page,
  }) => {
    await expect(page.getByRole("heading", { name: "What to say about hard questions" })).toBeVisible();
    await expect(page.getByText(/never raise a death on its own/)).toBeVisible();
  });

  test("shows the family's own wording back to them", async ({ page }) => {
    await expect(page.getByText(/Jan is nie nou hier nie/)).toBeVisible();
  });

  test("refuses wording that breaks a floor, in words, without losing the page", async ({
    page,
  }) => {
    // The whole point of validating at write time: the family member finds out
    // here rather than in a bedroom at three in the morning.
    await page.locator("summary", { hasText: "Set up someone Marta asks about" }).click();

    await page.getByLabel("Who do they ask about?").fill("Jan");
    await page.getByLabel("How to answer, for this person").selectOption("truthful");
    await page.getByLabel("Your exact words, in English").fill("Jan is at work.");
    await page.getByRole("button", { name: "Save what Nora says" }).click();

    await expect(page.getByTestId("problems")).toContainText(/asked Nora to tell the truth/);
    await expect(page.getByText("Not saved")).toBeVisible();
    // Still on the page, with what was typed still there.
    await expect(page.getByLabel("Your exact words, in English")).toHaveValue("Jan is at work.");
  });

  test("saves wording that holds", async ({ page }) => {
    await page.locator("summary", { hasText: "Set up someone Marta asks about" }).click();

    await page.getByLabel("Who do they ask about?").fill("Koos");
    await page.getByLabel("Your exact words, in English").fill("Koos is not here right now.");
    await page.getByRole("button", { name: "Save what Nora says" }).click();

    await expect(page.getByText(/Saved what Nora says about Koos/)).toBeVisible();
    await expect(page.getByText("Koos is not here right now.")).toBeVisible();
  });
});

test("revoking a device turns the room screen quiet", async ({ page }) => {
  await page.getByRole("button", { name: "Turn it off" }).first().click();
  await expect(page.getByText(/Turned off/)).toBeVisible();

  await page.goto(ROOM_URL);
  await expect(page.getByTestId("day")).toHaveCount(0);
});
