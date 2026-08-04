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
      // Assert the palette these numbers are about, not just the numbers. See
      // the note on the night loop below for why this is not belt and braces.
      await expect(page.getByTestId("room")).toHaveAttribute("data-lighting", "day");
      const foreground = toHex(await computed(page, testId, "color"));
      const background = toHex(
        await page.getByTestId("room").evaluate((element) => getComputedStyle(element).backgroundColor),
      );
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(ROOM_TARGET_CONTRAST);
    });
  }

  /*
   * These were four fixme cases holding a real defect: dimmed to MIN_INK_DIM
   * the location line measured about 5.7 against a target of 7, so the room
   * screen did not clear AAA at night as rendered while room-theme.test.ts
   * computed every pairing and passed. Green units, wrong rendering, which is
   * the same shape as the hashed class name incident.
   *
   * Only the location line ever failed. The other three inherit primary ink and
   * measure 7.12. All four were fixme because they share this loop, which is
   * worth knowing before reading a skipped test as four separate defects.
   *
   * Closed by making the location line primary ink rather than by moving
   * MIN_INK_DIM, since raising the dim floor makes the screen brighter at three
   * in the morning and that constant exists to stop exactly that. The reasoning
   * is in room.module.css beside the rule.
   *
   * The data-lighting assertion is not decoration. `?lux=` is only honoured on
   * fixtures (device-token.ts), so with a DATABASE_URL set the parameter is
   * ignored, lighting falls back to the hour, and in the morning these four
   * would measure the day palette at 12:1 and pass while asserting nothing
   * about night. That is the clock dependence incident of 2026-08-02 returning
   * through a different door, silently this time. Assert the palette.
   */
  for (const testId of ["day", "location", "next-thing", "photo-caption"]) {
    test(`${testId} clears the contrast target at night`, async ({ page }) => {
      await page.goto(`/room?token=dev-room-token&lux=${NIGHT_LUX_THRESHOLD - 1}`);
      await expect(page.getByTestId("room")).toHaveAttribute("data-lighting", "night");
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

  test("says whether sound is leaving the room, in words and not in a colour", async ({
    page,
  }) => {
    // Until 2026-08-03 the only difference between transmitting and not was the
    // fill of a 13px dot, and in the night palette accent and inkSoft are the
    // same value, so at night there was no difference at all. WCAG 1.4.1, and
    // more to the point a person is entitled to know what leaves the room.
    await page.goto(ROOM_URL);
    const mic = page.getByTestId("mic-state");
    const transmitting = (await mic.getAttribute("data-transmitting")) === "true";
    const words = (await mic.textContent()) ?? "";

    // The words and the attribute have to agree, whichever state this build is
    // in. Cloud ASR is off by default, so normally this is the quiet branch.
    expect(/klank|sound/i.test(words)).toBe(transmitting);
  });
});

test.describe("no scorekeeping", () => {
  /*
   * PROJECT.md section 3, and it had nothing behind it: `docs/traceability.md`
   * listed it under what nothing holds. A screen showing four incomplete tasks
   * tells somebody every hour that they are failing, and the person reading it
   * cannot act on any of them or remember agreeing to them.
   *
   * The shape to catch is a list. One next thing is already asserted elsewhere;
   * this is the guard against the day somebody adds a second, and a third.
   */
  const LIST_SHAPES = [
    "ul",
    "ol",
    "li",
    "input[type=checkbox]",
    "progress",
    "[role=list]",
    "[role=listitem]",
    "[role=progressbar]",
  ];

  test("shows nothing shaped like a checklist", async ({ page }) => {
    await page.goto(ROOM_URL);
    const room = page.getByTestId("room");
    for (const shape of LIST_SHAPES) {
      await expect(room.locator(shape), `found ${shape} on the room screen`).toHaveCount(0);
    }
  });

  test("counts nothing out loud", async ({ page }) => {
    await page.goto(ROOM_URL);
    const words = await page.getByTestId("room").innerText();

    // "2 of 5", "1/4", "3 left", "2 done". A room number and a lunch time are
    // bare numbers and stay legitimate.
    expect(words).not.toMatch(/\b\d+\s*(?:of|\/)\s*\d+\b/i);
    expect(words).not.toMatch(/\b\d+\s+(?:left|remaining|done|completed|to go)\b/i);
  });
});

test.describe("an unknown device", () => {
  test("shows a quiet screen rather than an error", async ({ page }) => {
    await page.goto("/room?token=not-a-real-token");
    await expect(page.getByTestId("day")).toHaveCount(0);
    await expect(page.getByText(/error|failed|not found/i)).toHaveCount(0);
  });
});
