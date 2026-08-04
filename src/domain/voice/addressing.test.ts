import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { wasAddressed } from "./addressing";

/**
 * These tests are not about what `wasAddressed` returns. It returns true, and
 * that is a documented hole rather than a behaviour worth asserting: a test
 * saying "a television gets through" would bless the defect instead of
 * recording it.
 *
 * What is worth enforcing is that the hole stays in one place. It was two bare
 * `asked: true` literals in two files, which is how a compromise becomes
 * invisible, and how the next person adding a third call site never learns it
 * is one.
 */

const SOURCE_ROOT = join(process.cwd(), "src");
const REPO_ROOT = process.cwd();

function sourceFiles(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      found.push(...sourceFiles(path));
      continue;
    }
    if (!/\.tsx?$/.test(entry)) continue;
    found.push(path);
  }
  return found;
}

describe("who decides that the device was addressed", () => {
  it("is the only thing that answers the question", () => {
    /*
     * The rule in one sentence: anything that runs the whole voice path asks
     * `wasAddressed`, and only the unit tests of the two layers that consume
     * the flag set it directly, because there it is the thing under test.
     *
     * So `policy.test.ts` and `answers.test.ts` may say `asked: false`, and
     * that is the point of them. `use-voice.ts`, the persona runner and the
     * eval harness may not, because a literal there is a call site that never
     * had to read why this is not settled.
     */
    const literal = /\basked\s*:\s*(true|false)\b/;
    const EXEMPT = [
      join("domain", "answer-policy"),
      join("domain", "voice", "answers.test.ts"),
      join("domain", "voice", "addressing.test.ts"),
    ];

    const offenders = [...sourceFiles(SOURCE_ROOT), ...sourceFiles(join(REPO_ROOT, "personas"))]
      .filter((path) => !EXEMPT.some((exempt) => path.includes(exempt)))
      .filter((path) => literal.test(readFileSync(path, "utf8")))
      .map((path) => path.replace(`${REPO_ROOT}/`, ""));

    expect(offenders).toEqual([]);
  });

  it("gives the answer policy a boolean, whatever it decides", () => {
    const match = { intent: "where-is-person", score: 1, language: "af" } as const;
    expect(typeof wasAddressed(match)).toBe("boolean");
  });

  it("carries the reason it cannot say no", () => {
    // The comment is the deliverable here. If somebody strips it while leaving
    // the function, the next reader sees a function that always returns true
    // and no longer learns why, which is worse than the two literals were.
    const source = readFileSync(join(SOURCE_ROOT, "domain", "voice", "addressing.ts"), "utf8");
    expect(source).toMatch(/never fires/);
    expect(source).toMatch(/turn taking|addressed/i);
  });
});
