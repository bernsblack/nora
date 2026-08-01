import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TRANSCRIPT_BUFFER_MS } from "@/config/constants";
import { RollingTranscriptBuffer } from "./buffer";

/**
 * Privacy is architectural, not a policy page (PROJECT.md section 5). These are
 * the checks that keep it that way, because the claim we have to be able to
 * make to a care home compliance officer is not that we delete recordings, it
 * is that no recording exists.
 *
 * The source scan is crude and will need maintaining. That is the point: it
 * fails loudly the first time somebody reaches for a recording API, which is
 * exactly when the conversation should happen.
 */

const SOURCE_ROOT = join(process.cwd(), "src");

/** APIs that capture, store, or ship audio. None may appear in the voice path. */
const FORBIDDEN_IN_VOICE_PATH = [
  "MediaRecorder",
  "AudioContext",
  "createMediaStreamSource",
  "getUserMedia",
  "indexedDB",
  "localStorage",
  "sessionStorage",
  "writeFile",
  "createWriteStream",
];

/** Directories that make up the always on listening path. */
const VOICE_PATH = [join(SOURCE_ROOT, "domain", "voice")];

function sourceFiles(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      found.push(...sourceFiles(path));
    } else if (path.endsWith(".ts") || path.endsWith(".tsx")) {
      found.push(path);
    }
  }
  return found;
}

describe("no audio capture in the mode one path", () => {
  const files = VOICE_PATH.flatMap(sourceFiles).filter((path) => !path.endsWith(".test.ts"));

  it("scans a non empty set of files", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const api of FORBIDDEN_IN_VOICE_PATH) {
    it(`never reaches for ${api}`, () => {
      const offenders = files.filter((path) => readFileSync(path, "utf8").includes(api));
      expect(offenders).toEqual([]);
    });
  }

  it("never calls fetch from the mode one path", () => {
    // Mode one works with no network. Anything that calls out is mode two, and
    // mode two does not live here.
    const offenders = files.filter((path) => /\bfetch\s*\(/.test(readFileSync(path, "utf8")));
    expect(offenders).toEqual([]);
  });
});

describe("the rolling buffer", () => {
  it("holds text, and only for the window", () => {
    const buffer = new RollingTranscriptBuffer();
    buffer.push("where am i", 1_000);
    expect(buffer.read(1_100)).toBe("where am i");
    expect(buffer.read(1_000 + TRANSCRIPT_BUFFER_MS + 1)).toBe("");
  });

  it("empties on silence without anybody reading it", () => {
    const buffer = new RollingTranscriptBuffer();
    buffer.push("what day is it", 0);
    expect(buffer.size(0)).toBe(1);
    expect(buffer.size(TRANSCRIPT_BUFFER_MS + 1)).toBe(0);
  });

  it("is bounded so a busy room cannot grow it", () => {
    const buffer = new RollingTranscriptBuffer(60_000, 3);
    for (let index = 0; index < 20; index += 1) buffer.push(`line ${index}`, index);
    expect(buffer.size(20)).toBe(3);
    expect(buffer.read(20)).toBe("line 17 line 18 line 19");
  });

  it("drops everything on clear, not just marks it stale", () => {
    const buffer = new RollingTranscriptBuffer();
    buffer.push("something private", 0);
    buffer.clear();
    expect(buffer.read(0)).toBe("");
    expect(buffer.size(0)).toBe(0);
  });

  it("ignores empty input rather than storing blanks", () => {
    const buffer = new RollingTranscriptBuffer();
    buffer.push("   ", 0);
    expect(buffer.size(0)).toBe(0);
  });
});
