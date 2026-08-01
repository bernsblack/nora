import { expect, test } from "@playwright/test";

/**
 * Not assertions, artifacts. A visual recap link is the right thing to hand a
 * care home manager who will never open GitHub (PROJECT.md section 9), and
 * these are the images that go in it.
 *
 * Run with: pnpm exec playwright test e2e/screenshots.spec.ts --project=room
 */

const OUT = "screenshots";

/**
 * Animations are disabled for the capture. The room screen fades the next thing
 * and the face in over a slow crossfade, so a screenshot taken straight after
 * load catches them part way through and looks like they are missing.
 */

test.beforeEach(async ({ request }) => {
  await request.post("/api/test-reset");
});

test("room screen, Afrikaans, day", async ({ page }) => {
  await page.goto("/room?token=dev-room-token");
  await expect(page.getByTestId("day")).toBeVisible();
  await page.screenshot({ animations: "disabled", path: `${OUT}/room-af-day.png` });
});

test("room screen, English, day", async ({ page, request }) => {
  await request.post("/api/test-reset");
  await page.goto("/app/person-marta");
  await page.getByLabel("Language on the screen").selectOption("en");
  await page.getByRole("button", { name: "Save" }).first().click();

  await page.goto("/room?token=dev-room-token");
  await expect(page.getByTestId("day")).toBeVisible();
  await page.screenshot({ animations: "disabled", path: `${OUT}/room-en-day.png` });
});

test("room screen, dial turned down to the day and a face", async ({ page, request }) => {
  await request.post("/api/test-reset");
  await page.goto("/app/person-marta");
  await page.getByLabel("How much the device does").selectOption("minimal");
  await page.getByRole("button", { name: "Save" }).first().click();

  await page.goto("/room?token=dev-room-token");
  await expect(page.getByTestId("day")).toBeVisible();
  await page.screenshot({ animations: "disabled", path: `${OUT}/room-minimal.png` });
});

test("room screen, answering a question about the husband who died", async ({ page }) => {
  await page.goto("/room?token=dev-room-token&wizard=1");
  await page.getByTestId("wizard-input").fill("waar is jan");
  await page.getByTestId("wizard-send").click();
  await expect(page.getByTestId("spoken")).toBeVisible();
  await page.screenshot({ animations: "disabled", path: `${OUT}/room-answering.png` });
});

test("family app", async ({ page }) => {
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Marta", level: 1 })).toBeVisible();
  await page.screenshot({ animations: "disabled", path: `${OUT}/family-app.png`, fullPage: true });
});
