import {
  ASSUMED_DARK_END_HOUR,
  ASSUMED_DARK_START_HOUR,
  DAYLIGHT_LUX_THRESHOLD,
  MAX_INK_DIM,
  MIN_INK_DIM,
  NIGHT_LUX_THRESHOLD,
} from "@/config/constants";
import { DAY_PALETTE, NIGHT_PALETTE, type RoomPalette } from "@/design/room-theme";

/**
 * How bright the room screen is, derived from the room rather than the clock
 * where a sensor exists. A bright screen at 3am causes sleep disruption and
 * disorientation (PROJECT.md section 4).
 */

export type LightingMode = "day" | "night";

export interface Lighting {
  mode: LightingMode;
  palette: RoomPalette;
  /** Multiplier on the ink channels only. Never drops below MIN_INK_DIM. */
  inkDim: number;
  /** Whether a real sensor produced this, for instrumentation. */
  measured: boolean;
}

export function assumedDark(hour: number): boolean {
  return hour >= ASSUMED_DARK_START_HOUR || hour < ASSUMED_DARK_END_HOUR;
}

/**
 * Most tablets do not expose an ambient light sensor, so the hour fallback is
 * the common path and not an edge case.
 */
export function resolveLighting(lux: number | null, hour: number): Lighting {
  if (lux === null) {
    const dark = assumedDark(hour);
    return {
      mode: dark ? "night" : "day",
      palette: dark ? NIGHT_PALETTE : DAY_PALETTE,
      inkDim: dark ? MIN_INK_DIM : MAX_INK_DIM,
      measured: false,
    };
  }

  if (lux < NIGHT_LUX_THRESHOLD) {
    return { mode: "night", palette: NIGHT_PALETTE, inkDim: MIN_INK_DIM, measured: true };
  }

  const span = DAYLIGHT_LUX_THRESHOLD - NIGHT_LUX_THRESHOLD;
  const position = Math.min(1, (lux - NIGHT_LUX_THRESHOLD) / span);
  return {
    mode: "day",
    palette: DAY_PALETTE,
    inkDim: MIN_INK_DIM + position * (MAX_INK_DIM - MIN_INK_DIM),
    measured: true,
  };
}
