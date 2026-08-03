import { FIXTURE_DEVICE_TOKEN } from "@/data/fixtures";

/**
 * Which device token the room route should look up, if any.
 *
 * The room device authenticates with a long lived token and never a login
 * (PROJECT.md section 9), and the token arrives as a query parameter because a
 * kiosk browser is pointed at one URL once and then left alone for months.
 *
 * The rule that matters is the fallback. Running on fixtures, a missing token
 * resolves to the fixture device, because that is the whole point of a
 * prototype anybody can open at /room with no setup. Running against a real
 * database it resolves to nothing, because behind that database is a real
 * person's room number, schedule and family photographs.
 *
 * This used to default to the fixture token unconditionally. It failed safe
 * only by luck: the fixture token is not in a real database, so the lookup
 * missed and the quiet screen rendered. Seed the fixtures into a real database
 * once, which is an ordinary thing to do for a demo, and an unauthenticated
 * request to /room serves a resident's day to whoever asked.
 */
export function deviceTokenFor(token: string | undefined, onFixtures: boolean): string | null {
  const trimmed = token?.trim();
  if (trimmed) return trimmed;
  return onFixtures ? FIXTURE_DEVICE_TOKEN : null;
}

/**
 * Whether a lighting override from the URL may be honoured.
 *
 * `?lux=` exists so the browser tests can render the night palette without
 * waiting for night. In a real room the screen has to show what the light in
 * that room actually is, and a query parameter that dims a resident's screen at
 * midday is not a debugging affordance, it is a stranger changing what they
 * see.
 *
 * The wizard rig is deliberately not gated this way. A human typing what they
 * heard is how the interaction gets tested in a real room before any speech
 * recognition is trusted, which PROJECT.md section 14 asks for directly.
 */
export function lightingOverrideAllowed(onFixtures: boolean): boolean {
  return onFixtures;
}
