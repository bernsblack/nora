import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ROOM_CROSSFADE_MS } from "@/config/constants";

/**
 * Slow crossfades only, and nothing else that moves (PROJECT.md section 4).
 *
 * A moving thing in the room of somebody with visual hallucinations is not a
 * design detail, and this is the room of somebody for whom it is common. The
 * requirement had `ROOM_CROSSFADE_MS` behind it and no test, so `docs/
 * traceability.md` listed it under what nothing holds with the note that a
 * future component could animate freely.
 *
 * The scan reads the stylesheet rather than the rendered page on purpose. A
 * browser test can only catch an animation on an element that happens to be on
 * screen during the run, and the failure this guards against is a new component
 * added later with a spinner or a slide in it.
 */

const ROOM_CSS = join(process.cwd(), "src", "app", "room", "room.module.css");

/** Every `animation:` and `transition:` shorthand, and every explicit duration. */
const MOTION = /^\s*(animation|transition|animation-duration|transition-duration)\s*:\s*([^;]+);/gm;

describe("nothing on the room screen moves except the crossfade", () => {
  const css = readFileSync(ROOM_CSS, "utf8");

  it("times every animation from the one crossfade variable", () => {
    const offenders: string[] = [];
    for (const [, property, value] of css.matchAll(MOTION)) {
      const declaration = `${property}: ${value.trim()}`;
      // "none" is how the reduced motion block turns the crossfade off, which
      // is the one legitimate way to have no duration at all.
      if (/\bnone\b/.test(value)) continue;
      if (!value.includes("var(--room-crossfade)")) offenders.push(declaration);
    }
    expect(offenders).toEqual([]);
  });

  it("declares no duration of its own, in seconds or milliseconds", () => {
    // A literal duration anywhere in this file is a second source for a product
    // decision that lives in constants.ts, and the first sign of a second kind
    // of motion.
    const literals = [...css.matchAll(/(\d+(?:\.\d+)?)(ms|s)\b/g)].map((match) => match[0]);
    expect(literals).toEqual([]);
  });

  it("keeps the crossfade slow enough not to read as movement", () => {
    // Not a style preference. Below about a second a crossfade reads as a
    // change happening in the room rather than as the screen settling.
    expect(ROOM_CROSSFADE_MS).toBeGreaterThanOrEqual(1000);
  });

  it("honours a reduced motion preference", () => {
    expect(css).toMatch(/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/);
  });
});
