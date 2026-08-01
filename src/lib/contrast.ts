/**
 * WCAG contrast maths. The room screen's contrast requirement is verified with
 * real numbers in a test rather than judged by eye (PROJECT.md section 4), and
 * this is where those numbers come from.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function parseHex(hex: string): Rgb {
  const value = hex.trim().replace(/^#/, "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((character) => character + character)
          .join("")
      : value;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Not a hex colour: ${hex}`);
  }
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

/** WCAG 2.x relative luminance. */
export function relativeLuminance(colour: Rgb): number {
  const channel = (raw: number) => {
    const srgb = raw / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel(colour.r) + 0.7152 * channel(colour.g) + 0.0722 * channel(colour.b)
  );
}

/** Contrast ratio between two hex colours, from 1 to 21. */
export function contrastRatio(foreground: string, background: string): number {
  const first = relativeLuminance(parseHex(foreground));
  const second = relativeLuminance(parseHex(background));
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}
