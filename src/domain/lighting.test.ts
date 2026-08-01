import { describe, expect, it } from "vitest";
import {
  ASSUMED_DARK_END_HOUR,
  ASSUMED_DARK_START_HOUR,
  DAYLIGHT_LUX_THRESHOLD,
  MAX_INK_DIM,
  MIN_INK_DIM,
  NIGHT_LUX_THRESHOLD,
} from "@/config/constants";
import { DAY_PALETTE, NIGHT_PALETTE } from "@/design/room-theme";
import { assumedDark, resolveLighting } from "./lighting";

describe("with no sensor, which is most tablets", () => {
  it("treats the small hours as dark", () => {
    expect(assumedDark(3)).toBe(true);
    expect(assumedDark(ASSUMED_DARK_START_HOUR)).toBe(true);
    expect(assumedDark(ASSUMED_DARK_END_HOUR)).toBe(false);
    expect(assumedDark(13)).toBe(false);
  });

  it("uses the night palette at three in the morning", () => {
    const lighting = resolveLighting(null, 3);
    expect(lighting.mode).toBe("night");
    expect(lighting.palette).toBe(NIGHT_PALETTE);
    expect(lighting.inkDim).toBe(MIN_INK_DIM);
    expect(lighting.measured).toBe(false);
  });

  it("uses the day palette in the afternoon", () => {
    const lighting = resolveLighting(null, 14);
    expect(lighting.mode).toBe("day");
    expect(lighting.palette).toBe(DAY_PALETTE);
    expect(lighting.inkDim).toBe(MAX_INK_DIM);
  });
});

describe("with a sensor", () => {
  it("prefers the room over the clock", () => {
    // Two in the afternoon with the curtains drawn is still a dark room.
    const lighting = resolveLighting(2, 14);
    expect(lighting.mode).toBe("night");
    expect(lighting.measured).toBe(true);
  });

  it("scales between the two thresholds rather than jumping", () => {
    const dim = resolveLighting(NIGHT_LUX_THRESHOLD, 12).inkDim;
    const middle = resolveLighting(
      (NIGHT_LUX_THRESHOLD + DAYLIGHT_LUX_THRESHOLD) / 2,
      12,
    ).inkDim;
    const bright = resolveLighting(DAYLIGHT_LUX_THRESHOLD, 12).inkDim;

    expect(dim).toBeLessThan(middle);
    expect(middle).toBeLessThan(bright);
    expect(bright).toBe(MAX_INK_DIM);
  });

  it("never goes below the dim floor, whatever the sensor says", () => {
    for (const lux of [0, 1, 5, 11, 12, 50, 5000]) {
      const lighting = resolveLighting(lux, 3);
      expect(lighting.inkDim, `${lux} lux`).toBeGreaterThanOrEqual(MIN_INK_DIM);
      expect(lighting.inkDim, `${lux} lux`).toBeLessThanOrEqual(MAX_INK_DIM);
    }
  });
});
