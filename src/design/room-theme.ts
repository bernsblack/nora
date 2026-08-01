import {
  MAX_INK_DIM,
  MIN_INK_DIM,
  ROOM_CROSSFADE_MS,
  ROOM_MIN_FONT_WEIGHT,
  ROOM_MIN_LETTER_SPACING_EM,
  ROOM_MIN_TEXT_PX,
} from "@/config/constants";

/**
 * The room screen's palette and type scale, in TypeScript rather than CSS, so
 * that the contrast requirement in PROJECT.md section 4 is verified against the
 * values actually rendered rather than against a copy of them.
 *
 * Colour reasoning: the ageing lens yellows, which desaturates blues and
 * destroys blue-green discrimination first, so nothing here is blue and nothing
 * carries meaning by hue alone. Both palettes are warm, and every pairing below
 * is checked in room-theme.test.ts.
 */

export interface RoomPalette {
  /** Background. Never dimmed, see MIN_INK_DIM. */
  surface: string;
  /** Everything the person is meant to read from a bed at three metres. */
  ink: string;
  /** Secondary lines only. Still held to the AA floor after dimming. */
  inkSoft: string;
  /** Used for emphasis and for the mic indicator. Never the only signal. */
  accent: string;
  /**
   * The mat around the photograph. Carries no text and no meaning, so it is
   * exempt from the contrast floors. It exists so the face reads as a framed
   * picture in a room rather than as an image in an app.
   */
  frame: string;
}

export const DAY_PALETTE: RoomPalette = {
  surface: "#FBF3E7",
  ink: "#241C13",
  inkSoft: "#4A3A28",
  accent: "#7A2E0C",
  frame: "#F1E3CE",
};

export const NIGHT_PALETTE: RoomPalette = {
  surface: "#12100C",
  ink: "#F2E0C4",
  inkSoft: "#E0C79B",
  accent: "#E0C79B",
  frame: "#241D14",
};

/**
 * Type scale in CSS pixels, expressed as a clamp so it tracks the real tablet
 * rather than assuming one. Every min is at or above ROOM_MIN_TEXT_PX, which
 * room-theme.test.ts enforces.
 */
export interface TypeStep {
  min: number;
  /** Preferred size in vw units. */
  vw: number;
  max: number;
}

export const ROOM_TYPE_SCALE = {
  dayAndPartOfDay: { min: 72, vw: 7.5, max: 152 },
  nextThing: { min: 56, vw: 5, max: 104 },
  location: { min: 44, vw: 3, max: 68 },
  photoCaption: { min: 40, vw: 3, max: 64 },
  micState: { min: ROOM_MIN_TEXT_PX, vw: 2.4, max: 48 },
} satisfies Record<string, TypeStep>;

export type TypeStepName = keyof typeof ROOM_TYPE_SCALE;

/**
 * System stack only. next/font would fetch a face at build time, and the room
 * device has to render correctly with no network. Nothing here is thin: the
 * weight floor is applied at the element level.
 */
export const ROOM_FONT_STACK =
  '"Charter", "Bitstream Charter", "Iowan Old Style", "Palatino", "Georgia", serif';

export function clampFor(step: TypeStep): string {
  return `clamp(${step.min}px, ${step.vw}vw, ${step.max}px)`;
}

/** Scale a hex colour's channels. Used to dim ink without touching the surface. */
export function dimColour(hex: string, factor: number): string {
  const value = hex.replace(/^#/, "");
  const channels = [0, 2, 4].map((index) => {
    const raw = parseInt(value.slice(index, index + 2), 16);
    const scaled = Math.round(Math.min(255, Math.max(0, raw * factor)));
    return scaled.toString(16).padStart(2, "0");
  });
  return `#${channels.join("")}`;
}

export function clampInkDim(factor: number): number {
  return Math.min(MAX_INK_DIM, Math.max(MIN_INK_DIM, factor));
}

/**
 * The selector the emitted theme hangs off. An attribute rather than a class,
 * because class names in the stylesheet are hashed by CSS modules at build time
 * and a hashed name cannot be reproduced from here.
 */
export const ROOM_THEME_SELECTOR = "[data-room]";

/**
 * Emit the theme as CSS custom properties. The room screen renders this into a
 * style element, which keeps the constants above as the only source and avoids
 * a second copy of the palette living in a stylesheet.
 */
export function roomThemeCss(palette: RoomPalette, inkDim: number): string {
  const dim = clampInkDim(inkDim);
  const ink = dimColour(palette.ink, dim);
  const inkSoft = dimColour(palette.inkSoft, dim);
  const accent = dimColour(palette.accent, dim);
  const scale = Object.entries(ROOM_TYPE_SCALE)
    .map(([name, step]) => `--room-fs-${kebab(name)}: ${clampFor(step)};`)
    .join("\n    ");

  return `${ROOM_THEME_SELECTOR} {
    --room-surface: ${palette.surface};
    --room-ink: ${ink};
    --room-ink-soft: ${inkSoft};
    --room-accent: ${accent};
    --room-frame: ${palette.frame};
    --room-photo-dim: ${dim};
    --room-weight: ${ROOM_MIN_FONT_WEIGHT};
    --room-tracking: ${ROOM_MIN_LETTER_SPACING_EM}em;
    --room-crossfade: ${ROOM_CROSSFADE_MS}ms;
    --room-font: ${ROOM_FONT_STACK};
    ${scale}
  }`;
}

function kebab(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}
