import { describe, expect, it } from "vitest";
import { FIXTURE_DEVICE_TOKEN } from "@/data/fixtures";
import { deviceTokenFor, lightingOverrideAllowed } from "./device-token";

describe("which device token the room route looks up", () => {
  it("uses the token that was given, on fixtures or not", () => {
    expect(deviceTokenFor("real-token", true)).toBe("real-token");
    expect(deviceTokenFor("real-token", false)).toBe("real-token");
  });

  it("falls back to the fixture device only when there is no database", () => {
    expect(deviceTokenFor(undefined, true)).toBe(FIXTURE_DEVICE_TOKEN);
  });

  it("resolves to nothing when a token is missing and a database is behind it", () => {
    // The whole point. Behind a real database is a real person's room number,
    // schedule and family photographs, and an unauthenticated request must not
    // reach them just because the fixture token was once seeded for a demo.
    expect(deviceTokenFor(undefined, false)).toBeNull();
  });

  it("treats an empty or whitespace token as missing", () => {
    expect(deviceTokenFor("", false)).toBeNull();
    expect(deviceTokenFor("   ", false)).toBeNull();
    expect(deviceTokenFor("", true)).toBe(FIXTURE_DEVICE_TOKEN);
  });

  it("trims a token rather than failing on a stray space", () => {
    // A kiosk URL gets copied by hand onto a tablet in a care home.
    expect(deviceTokenFor("  real-token  ", false)).toBe("real-token");
  });
});

describe("whether the URL may override the lighting", () => {
  it("allows it on fixtures, so the browser tests can render night", () => {
    expect(lightingOverrideAllowed(true)).toBe(true);
  });

  it("refuses it against a real database", () => {
    // A query parameter that dims a resident's screen at midday is a stranger
    // changing what they see, not a debugging affordance.
    expect(lightingOverrideAllowed(false)).toBe(false);
  });
});
