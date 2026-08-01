import { describe, expect, it } from "vitest";
import {
  MIN_INK_DIM,
  ROOM_MIN_FONT_WEIGHT,
  ROOM_MIN_LETTER_SPACING_EM,
  ROOM_MIN_TEXT_PX,
  ROOM_TARGET_CONTRAST,
  WCAG_AA_NORMAL_TEXT,
} from "@/config/constants";
import { contrastRatio } from "@/lib/contrast";
import {
  DAY_PALETTE,
  NIGHT_PALETTE,
  ROOM_THEME_SELECTOR,
  ROOM_TYPE_SCALE,
  dimColour,
  roomThemeCss,
  type RoomPalette,
} from "./room-theme";

/**
 * PROJECT.md section 4 says to verify contrast with real numbers, not by eye.
 * This is that verification, and it runs against the values the room screen
 * actually renders rather than a copy of them.
 */

const PALETTES: [string, RoomPalette][] = [
  ["day", DAY_PALETTE],
  ["night", NIGHT_PALETTE],
];

describe("room palette contrast", () => {
  for (const [name, palette] of PALETTES) {
    it(`${name}: primary ink clears AAA undimmed`, () => {
      expect(contrastRatio(palette.ink, palette.surface)).toBeGreaterThanOrEqual(
        ROOM_TARGET_CONTRAST,
      );
    });

    it(`${name}: primary ink still clears AAA at the dim floor`, () => {
      // The surface is never dimmed. Dimming both ends of a pair collapses the
      // ratio toward 1, which is the reason MIN_INK_DIM exists at all.
      const dimmed = dimColour(palette.ink, MIN_INK_DIM);
      expect(contrastRatio(dimmed, palette.surface)).toBeGreaterThanOrEqual(
        ROOM_TARGET_CONTRAST,
      );
    });

    it(`${name}: secondary ink clears AAA undimmed and AA at the dim floor`, () => {
      expect(contrastRatio(palette.inkSoft, palette.surface)).toBeGreaterThanOrEqual(
        ROOM_TARGET_CONTRAST,
      );
      const dimmed = dimColour(palette.inkSoft, MIN_INK_DIM);
      expect(contrastRatio(dimmed, palette.surface)).toBeGreaterThanOrEqual(
        WCAG_AA_NORMAL_TEXT,
      );
    });

    it(`${name}: accent clears AA undimmed`, () => {
      // The accent is never the only signal, so the floor rather than the target.
      expect(contrastRatio(palette.accent, palette.surface)).toBeGreaterThanOrEqual(
        WCAG_AA_NORMAL_TEXT,
      );
    });
  }
});

describe("room type scale", () => {
  it("never drops below the minimum text size", () => {
    for (const [name, step] of Object.entries(ROOM_TYPE_SCALE)) {
      expect(step.min, name).toBeGreaterThanOrEqual(ROOM_MIN_TEXT_PX);
      expect(step.max, name).toBeGreaterThanOrEqual(step.min);
    }
  });

  it("puts the day line above everything else", () => {
    const day = ROOM_TYPE_SCALE.dayAndPartOfDay;
    for (const [name, step] of Object.entries(ROOM_TYPE_SCALE)) {
      if (name === "dayAndPartOfDay") continue;
      expect(day.min, name).toBeGreaterThan(step.min);
    }
  });
});

describe("emitted css", () => {
  const css = roomThemeCss(DAY_PALETTE, 1);

  it("hangs off the attribute selector, not a hashed class name", () => {
    // CSS modules hash class names at build time, so a class based selector
    // emitted from here would silently match nothing.
    expect(css.startsWith(`${ROOM_THEME_SELECTOR} {`)).toBe(true);
  });

  it("carries the weight and tracking floors", () => {
    expect(css).toContain(`--room-weight: ${ROOM_MIN_FONT_WEIGHT}`);
    expect(css).toContain(`--room-tracking: ${ROOM_MIN_LETTER_SPACING_EM}em`);
  });

  it("declares a custom property for every type step", () => {
    for (const name of Object.keys(ROOM_TYPE_SCALE)) {
      const kebab = name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
      expect(css).toContain(`--room-fs-${kebab}:`);
    }
  });

  it("never dims below the floor even when asked to", () => {
    const overDimmed = roomThemeCss(NIGHT_PALETTE, 0.1);
    const atFloor = roomThemeCss(NIGHT_PALETTE, MIN_INK_DIM);
    expect(overDimmed).toEqual(atFloor);
  });

  it("declares the frame colour, which carries no text", () => {
    expect(css).toContain("--room-frame:");
  });

  it("uses no blue dominant colour on the room screen", () => {
    // The ageing lens yellows, which desaturates blues and destroys blue-green
    // discrimination first, so no room colour may have blue as its strongest
    // channel.
    for (const [name, palette] of PALETTES) {
      for (const [key, hex] of Object.entries(palette)) {
        const red = parseInt(hex.slice(1, 3), 16);
        const green = parseInt(hex.slice(3, 5), 16);
        const blue = parseInt(hex.slice(5, 7), 16);
        expect(blue, `${name}.${key}`).toBeLessThanOrEqual(Math.max(red, green));
      }
    }
  });
});
