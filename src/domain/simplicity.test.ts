import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SIMPLICITY_LEVELS } from "./types";
import { capabilitiesFor } from "./simplicity";

/**
 * The simplicity dial is a first class concept, not a pile of feature flags
 * (PROJECT.md section 7). The rule that keeps it one is in
 * claude/rules/room-screen.md: nothing outside this module may branch on the
 * raw level, everything asks `capabilitiesFor` for a named capability.
 *
 * That rule had nothing behind it. `docs/traceability.md` listed it under what
 * nothing holds, with the note "the first violation will look reasonable", and
 * it would: one `=== "minimal"` in a component reads as a small thing and is
 * the moment the dial stops being a concept and becomes four flags.
 *
 * The scan is deliberately about comparisons rather than about the words. A
 * level appears as data in fixtures and as a key in the family app's label
 * maps, and neither is a branch.
 */

const SOURCE_ROOT = join(process.cwd(), "src");
const HOME = join(SOURCE_ROOT, "domain", "simplicity.ts");

function sourceFiles(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      found.push(...sourceFiles(path));
      continue;
    }
    if (!/\.tsx?$/.test(entry)) continue;
    if (/\.test\.tsx?$/.test(entry)) continue;
    found.push(path);
  }
  return found;
}

describe("the simplicity dial stays one concept", () => {
  it("is never compared against a raw level outside simplicity.ts", () => {
    // === "calm", !== "minimal", and the same with single quotes.
    const comparison = new RegExp(
      `[!=]==?\\s*["'](${SIMPLICITY_LEVELS.join("|")})["']`,
    );

    const offenders = sourceFiles(SOURCE_ROOT)
      .filter((path) => path !== HOME)
      .filter((path) => comparison.test(readFileSync(path, "utf8")))
      .map((path) => path.replace(`${SOURCE_ROOT}/`, ""));

    expect(offenders).toEqual([]);
  });

  it("is never switched on outside simplicity.ts", () => {
    const switched = /switch\s*\(\s*[^)]*simplicity[^)]*\)/i;

    const offenders = sourceFiles(SOURCE_ROOT)
      .filter((path) => path !== HOME)
      .filter((path) => switched.test(readFileSync(path, "utf8")))
      .map((path) => path.replace(`${SOURCE_ROOT}/`, ""));

    expect(offenders).toEqual([]);
  });

  it("answers every level with a full set of capabilities", () => {
    // The reason the rule is affordable: asking is never harder than branching.
    for (const level of SIMPLICITY_LEVELS) {
      const capabilities = capabilitiesFor(level);
      expect(Object.keys(capabilities).length).toBeGreaterThan(0);
      for (const value of Object.values(capabilities)) {
        expect(typeof value).toBe("boolean");
      }
    }
  });
});
