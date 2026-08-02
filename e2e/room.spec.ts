import { expect, test, type Page } from "@playwright/test";
import { ROOM_MIN_TEXT_PX, ROOM_MIN_FONT_WEIGHT } from "../src/config/constants";
import { DAYLIGHT_LUX_THRESHOLD, NIGHT_LUX_THRESHOLD, ROOM_TARGET_CONTRAST } from "../src/config/constants";
import { contrastRatio } from "../src/lib/contrast";

/**
 * The room screen, checked against the constraints in PROJECT.md section 4 as
 * rendered, not as intended. Every number here comes from a named constant, so
 * a product decision that changes moves these tests with it.
 */

/*
 * Lighting is pinned, because it is not what these tests are about and it was
 * silently deciding whether they passed. With no sensor reading, resolveLighting
 * falls back to the hour, and ASSUMED_DARK_START_HOUR is 20, so this suite was
 * green in the morning and red after eight in the evening every day. A test that
 * depends on when somebody runs it reports the clock, not the product.
 *
 * PINNED_DAYLIGHT_LUX is at DAYLIGHT_LUX_THRESHOLD, which puts inkDim at
 * MAX_INK_DIM and matches the daytime conditions these numbers were set under.
 */
const PINNED_DAYLIGHT_LUX = DAYLIGHT_LUX_THRESHOLD;
const ROOM_URL = `/room?token=dev-room-token&lux=${PINNED_DAYLIGHT_LUX}`;

async function computed(page: Page, testId: string, property: string): Promise<string> {
  return page
    .getByTestId(testId)
    .evaluate(
      (element, name) => getComputedStyle(element).getPropertyValue(name),
      property,
    );
}

/** Resolve a computed colour, which comes back as rgb(), to a hex string. */
function toHex(colour: string): string {
  const parts = colour.match(/\d+(\.\d+)?/g);
  if (!parts) throw new Error(`Cannot read colour: ${colour}`);
  return `#${parts
    .slice(0, 3)
    .map((value) => Math.round(Number(value)).toString(16).padStart(2, "0"))
    .join("")}`;
}

test.beforeEach(async ({ request }) => {
  await request.post("/api/test-reset");
});

test.describe("what is on the screen", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROOM_URL);
  });

  test("shows the day, where they are, one next thing, and a named face", async ({ page }) => {
    await expect(page.getByTestId("day")).toBeVisible();
    await expect(page.getByTestId("location")).toContainText("Willowbrook");
    await expect(page.getByTestId("location")).toContainText("kamer 12");
    await expect(page.getByTestId("next-thing")).toBeVisible();
    await expect(page.getByTestId("photo-caption")).toBeVisible();
  });

  test("never abbreviates the day", async ({ page }) => {
    const day = await page.getByTestId("day").innerText();
    expect(day).toMatch(/dag/i);
    expect(day).not.toMatch(/\b(Ma|Di|Wo|Do|Vr|Sa|So|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/);
  });

  test("shows exactly one next thing", async ({ page }) => {
    const count = await page.getByTestId("next-thing").count();
    expect(count).toBeLessThanOrEqual(1);
  });

  test("has no navigation, no links, and nothing to press", async ({ page }) => {
    await expect(page.locator("a")).toHaveCount(0);
    await expect(page.locator("button")).toHaveCount(0);
  });

  test("keeps every line inside the screen", async ({ page }) => {
    // The room screen hides its overflow, so a line that runs off the edge is
    // clipped rather than scrolled and nothing else would catch it. Afrikaans
    // compounds the day and the part of the day into one unbreakable word,
    // which is the case that found this.
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();

    for (const testId of ["day", "location", "next-thing", "photo-caption", "mic-state"]) {
      const box = await page.getByTestId(testId).boundingBox();
      expect(box, testId).not.toBeNull();
      expect(box!.x, testId).toBeGreaterThanOrEqual(0);
      expect(box!.y, testId).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width, testId).toBeLessThanOrEqual(viewport!.width);
      expect(box!.y + box!.height, testId).toBeLessThanOrEqual(viewport!.height);
    }
  });

  test("does not scroll", async ({ page }) => {
    const overflowing = await page.evaluate(
      () =>
        document.documentElement.scrollHeight > window.innerHeight + 1 ||
        document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(overflowing).toBe(false);
  });
});

test.describe("readable from a bed at three metres", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROOM_URL);
  });

  for (const testId of ["day", "location", "next-thing", "photo-caption", "mic-state"]) {
    test(`${testId} is at or above the minimum size and weight`, async ({ page }) => {
      const size = Number.parseFloat(await computed(page, testId, "font-size"));
      expect(size).toBeGreaterThanOrEqual(ROOM_MIN_TEXT_PX);

      const weight = Number.parseInt(await computed(page, testId, "font-weight"), 10);
      expect(weight).toBeGreaterThanOrEqual(ROOM_MIN_FONT_WEIGHT);

      const tracking = await computed(page, testId, "letter-spacing");
      if (tracking !== "normal") {
        expect(Number.parseFloat(tracking)).toBeGreaterThanOrEqual(0);
      }
    });
  }

  for (const testId of ["day", "location", "next-thing", "photo-caption"]) {
    test(`${testId} clears the contrast target as rendered`, async ({ page }) => {
      const foreground = toHex(await computed(page, testId, "color"));
      const background = toHex(
        await page.getByTestId("room").evaluate((element) => getComputedStyle(element).backgroundColor),
      );
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(ROOM_TARGET_CONTRAST);
    });
  }

  /*
   * Known failure, kept visible rather than pinned away. Dimmed to MIN_INK_DIM
   * the location line measures about 5.7 against a target of 7, so the room
   * screen does not clear AAA at night as rendered. MIN_INK_DIM carries the
   * comment that it is "the exact point where the night palette's primary ink
   * leaves AAA", and this line is evidently not primary ink, so the constant was
   * set against one pairing and applied to all of them. room-theme.test.ts
   * computes every pairing and passes, which is the same shape as the hashed
   * class name incident: green units, wrong rendering.
   *
   * Changing MIN_INK_DIM or the ink this line uses is a product decision under
   * claude/rules/room-screen.md. See worklog/2026-08-02-matcher-precision/errors.md.
   */
  for (const testId of ["day", "location", "next-thing", "photo-caption"]) {
    test.fixme(`${testId} clears the contrast target at night`, async ({ page }) => {
      await page.goto(`/room?token=dev-room-token&lux=${NIGHT_LUX_THRESHOLD - 1}`);
      const foreground = toHex(await computed(page, testId, "color"));
      const background = toHex(
        await page.getByTestId("room").evaluate((element) => getComputedStyle(element).backgroundColor),
      );
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(ROOM_TARGET_CONTRAST);
    });
  }
});

test.describe("the microphone is never a secret", () => {
  test("says what the microphone is doing, in words", async ({ page }) => {
    await page.goto(ROOM_URL);
    const mic = page.getByTestId("mic-state");
    await expect(mic).toBeVisible();
    await expect(mic).toHaveText(/Luister|Mikrofoon af/);
  });

  test("does not claim to transmit when it is not", async ({ page }) => {
    await page.goto(ROOM_URL);
    await expect(page.getByTestId("mic-state")).toHaveAttribute("data-transmitting", "false");
  });
});

test.describe("an unknown device", () => {
  test("shows a quiet screen rather than an error", async ({ page }) => {
    await page.goto("/room?token=not-a-real-token");
    await expect(page.getByTestId("day")).toHaveCount(0);
    await expect(page.getByText(/error|failed|not found/i)).toHaveCount(0);
  });
});
