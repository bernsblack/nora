import { expect, test } from "@playwright/test";
import { DAYLIGHT_LUX_THRESHOLD } from "../src/config/constants";

/**
 * Offline is a property, not a hope (claude/rules/room-screen.md).
 *
 * Until the service worker existed, "the screen keeps working" when the wifi
 * goes down, which is what personas/anna-venter.md tells the buyer, was true
 * only for as long as the tab stayed loaded. A tablet that is on for months
 * reloads: the kiosk browser restarts, the power blips, Android kills the tab.
 * These tests are the difference between that claim being true and being a
 * sentence in a persona file.
 *
 * docs/traceability.md carried "works with no network" as partial, with the
 * reason "no test starts the room screen offline". This is that test.
 */

const ROOM_URL = `/room?token=dev-room-token&lux=${DAYLIGHT_LUX_THRESHOLD}`;

/**
 * Load the room screen and wait until the service worker is actually driving
 * requests, then load it once more so the room render is in the cache.
 *
 * The second load is not belt and braces. The worker claims clients on activate,
 * so the very first navigation completed before anything was intercepted, and
 * only the load after that is served through the cache it populates.
 */
async function warmTheCache(page: import("@playwright/test").Page) {
  await page.goto(ROOM_URL);
  await page.waitForFunction(() => navigator.serviceWorker?.controller != null, null, {
    timeout: 15_000,
  });
  await page.reload();
  await expect(page.getByTestId("day")).toBeVisible();
}

test.describe("a care home with bad wifi, which is most care homes", () => {
  test("still renders the room screen after a reload with no network", async ({
    page,
    context,
  }) => {
    await warmTheCache(page);

    await context.setOffline(true);
    await page.reload();

    // The four things PROJECT.md section 4 puts on this screen. If the reload
    // had failed these would not exist at all, which is the blank screen in the
    // morning this whole file is about.
    await expect(page.getByTestId("day")).toBeVisible();
    await expect(page.getByTestId("location")).toBeVisible();
    await expect(page.getByTestId("photo-caption")).toBeVisible();
    await expect(page.getByTestId("room")).toBeVisible();
  });

  test("says something real offline rather than an empty shell", async ({ page, context }) => {
    await warmTheCache(page);
    const online = await page.getByTestId("location").textContent();

    await context.setOffline(true);
    await page.reload();

    // Where they are is a person fact rather than a day fact, so it does not go
    // stale in any way that matters and must survive the outage intact.
    await expect(page.getByTestId("location")).toHaveText(online ?? "");
    expect((await page.getByTestId("day").textContent())?.trim().length).toBeGreaterThan(0);
  });

  test("keeps the day correct offline, from the device clock", async ({ page, context }) => {
    await warmTheCache(page);
    const online = await page.getByTestId("day").textContent();

    await context.setOffline(true);
    await page.reload();

    // The cached HTML carries the server's clock only for the first paint.
    // room-screen.tsx follows the device from the first tick onward, which is
    // what makes serving a stale copy safe: the worst case is a device that
    // knows less, never one that is confidently wrong about what day it is.
    await expect(page.getByTestId("day")).toHaveText(online ?? "");
  });

  test("keeps the face, not only the words", async ({ page, context }) => {
    await warmTheCache(page);

    await context.setOffline(true);
    await page.reload();

    // PROJECT.md section 4 puts a photo of someone who loves them on this
    // screen and counts it as one of the four things on it. Asserting the
    // caption is not the same assertion: the caption is a text node in the
    // cached HTML and would survive with a broken image where the face was.
    const loaded = await page
      .getByTestId("photo")
      .locator("img")
      .evaluate((image) => image instanceof HTMLImageElement && image.naturalWidth > 0);
    expect(loaded).toBe(true);
  });

  test("will not serve one room's screen to another room's device", async ({ page, context }) => {
    await warmTheCache(page);

    await context.setOffline(true);
    // A tablet moved between rooms, or a token revoked and re-issued, which the
    // family app offers. The token is the whole identity of the device, so a
    // cache that matched on path alone would hand this device the other
    // resident's room number, schedule and family photographs.
    await page.goto("/room?token=some-other-device").catch(() => {
      // Nothing cached for this token, so the navigation itself may fail. That
      // is the correct outcome and the assertion below is what matters.
    });

    await expect(page.getByTestId("day")).toHaveCount(0);
    await expect(page.getByTestId("location")).toHaveCount(0);
  });

  test("does not resurrect the wizard rig onto an ordinary reload", async ({ page, context }) => {
    // Warm the cache with a Wizard-of-Oz session only, which is how the
    // interaction gets tested on the real tablet in the real room.
    await page.goto(`${ROOM_URL}&wizard=1`);
    await page.waitForFunction(() => navigator.serviceWorker?.controller != null, null, {
      timeout: 15_000,
    });
    await page.reload();
    await expect(page.getByTestId("wizard-input")).toBeVisible();

    await context.setOffline(true);
    await page.goto(ROOM_URL).catch(() => {
      // Correct to fail rather than serve the wizard render.
    });

    // A text box and a Say button appearing unbidden after an overnight reboot
    // is a reachable broken state on a screen whose rule is that there is none.
    await expect(page.getByTestId("wizard-input")).toHaveCount(0);
    await expect(page.getByTestId("wizard-send")).toHaveCount(0);
  });

  test("serves the manifest so the device can be installed and locked down", async ({
    request,
  }) => {
    const response = await request.get("/room/manifest.webmanifest");
    expect(response.ok()).toBe(true);

    const manifest = await response.json();
    expect(manifest.start_url).toBe("/room");
    // No browser chrome. There is nowhere to navigate to from this screen, so a
    // back button is a way to reach a broken state.
    expect(manifest.display).toBe("fullscreen");
    expect(manifest.icons.length).toBeGreaterThan(0);
  });
});
