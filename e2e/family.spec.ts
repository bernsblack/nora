import { expect, test } from "@playwright/test";

/**
 * The family app, on a phone, which is where it will be used. A daughter
 * standing in a corridor between visits.
 */

test.beforeEach(async ({ page, request }) => {
  await request.post("/api/test-reset");
  await page.goto("/app");
});

test("goes straight to the person rather than a list of one", async ({ page }) => {
  await expect(page).toHaveURL(/\/app\/person-marta/);
  await expect(page.getByRole("heading", { name: "Marta", level: 1 })).toBeVisible();
});

test("shows what the room screen is showing right now", async ({ page }) => {
  await expect(page.getByText(/The room screen is showing/)).toBeVisible();
  await expect(page.getByText(/Willowbrook/).first()).toBeVisible();
});

test("a note written here becomes the next thing in the room", async ({ page }) => {
  await page.getByLabel("In Afrikaans", { exact: true }).fill("Pa is by die werk, hy is vanaand tuis.");
  await page.getByRole("button", { name: "Add" }).first().click();

  await expect(page.getByText("Pa is by die werk, hy is vanaand tuis.").first()).toBeVisible();

  await page.goto("/room?token=dev-room-token");
  await expect(page.getByTestId("next-thing")).toHaveText("Pa is by die werk, hy is vanaand tuis.");
});

test("the simplicity dial takes things off the room screen", async ({ page }) => {
  await page.getByLabel("How much the device does").selectOption("minimal");
  await page.getByRole("button", { name: "Save" }).first().click();

  await page.goto("/room?token=dev-room-token");
  await expect(page.getByTestId("day")).toBeVisible();
  await expect(page.getByTestId("photo")).toBeVisible();
  await expect(page.getByTestId("location")).toHaveCount(0);
  await expect(page.getByTestId("next-thing")).toHaveCount(0);
});

test("turning the microphone off says so on the room screen", async ({ page }) => {
  await page.getByLabel("The device may listen").uncheck();
  await page.getByRole("button", { name: "Save" }).first().click();

  await page.goto("/room?token=dev-room-token");
  await expect(page.getByTestId("mic-state")).toHaveText("Mikrofoon af");
});

test("the answer policy carries a warning rather than sitting among the settings", async ({
  page,
}) => {
  const section = page.getByRole("heading", { name: "What to say about hard questions" });
  await expect(section).toBeVisible();
  await expect(
    page.getByText(/never bring a death up on its own/),
  ).toBeVisible();
});

test("shows the family's own wording back to them", async ({ page }) => {
  await expect(page.getByText(/Jan is nie nou hier nie/)).toBeVisible();
});

test("revoking a device turns the room screen quiet", async ({ page }) => {
  await page.getByRole("button", { name: "Turn it off" }).first().click();
  await expect(page.getByText(/Turned off/)).toBeVisible();

  await page.goto("/room?token=dev-room-token");
  await expect(page.getByTestId("day")).toHaveCount(0);
});
