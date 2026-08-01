import { describe, expect, it } from "vitest";
import { InMemoryRepository } from "@/data/memory-repository";
import { FIXTURE_PERSON_ID, FIXTURE_TIMEZONE } from "@/data/fixtures";
import { zonedParts } from "@/domain/time";
import { FixtureCalendarFetcher, inferKind, parseCalendar } from "./calendar";
import { syncCalendars } from "./calendar-sync";
import { FIXTURE_CALENDARS, WILLOWBROOK_ICS } from "./fixtures/willowbrook-ics";

const NOW = new Date("2026-08-04T06:00:00Z"); // Tuesday, 08:00 in Johannesburg
const DAY_MS = 24 * 60 * 60 * 1000;

function parse(from = NOW, to = new Date(NOW.getTime() + DAY_MS)) {
  return parseCalendar(WILLOWBROOK_ICS, {
    personId: FIXTURE_PERSON_ID,
    language: "af",
    from,
    to,
  });
}

describe("recurrence expansion", () => {
  it("produces today's meals from a rule written in 2024", () => {
    const titles = parse().map((entry) => entry.title.af);
    expect(titles).toContain("Ontbyt");
    expect(titles).toContain("Middagete");
    expect(titles).toContain("Aandete");
  });

  it("resolves times in the calendar's own timezone", () => {
    const lunch = parse().find((entry) => entry.title.af === "Middagete");
    expect(lunch).toBeDefined();
    expect(zonedParts(lunch!.startsAt, FIXTURE_TIMEZONE)).toMatchObject({ hour: 12, minute: 0 });
  });

  it("keeps the duration from the source event", () => {
    const lunch = parse().find((entry) => entry.title.af === "Middagete");
    expect(lunch?.endsAt).toBeDefined();
    expect(lunch!.endsAt!.getTime() - lunch!.startsAt.getTime()).toBe(60 * 60 * 1000);
  });

  it("expands a weekly rule onto the right weekday only", () => {
    // Physio is Thursdays. 2026-08-04 is a Tuesday, 2026-08-06 is a Thursday.
    const tuesday = parse().filter((entry) => entry.title.af === "Fisioterapie");
    expect(tuesday).toHaveLength(0);

    const thursday = parse(
      new Date("2026-08-06T00:00:00Z"),
      new Date("2026-08-07T00:00:00Z"),
    ).filter((entry) => entry.title.af === "Fisioterapie");
    expect(thursday).toHaveLength(1);
  });

  it("honours an interval, so a fortnightly event is not weekly", () => {
    const fortnight = parseCalendar(WILLOWBROOK_ICS, {
      personId: FIXTURE_PERSON_ID,
      language: "af",
      from: new Date("2026-08-01T00:00:00Z"),
      to: new Date("2026-08-29T00:00:00Z"),
    }).filter((entry) => entry.title.af === "Haarkapper");
    expect(fortnight).toHaveLength(2);
  });

  it("returns entries in time order", () => {
    const times = parse().map((entry) => entry.startsAt.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("files titles under the language the facility writes in", () => {
    const entry = parse()[0];
    expect(entry.title.af).toBeDefined();
    expect(entry.title.en).toBeUndefined();
  });
});

describe("kind inference", () => {
  it("recognises meals in both languages", () => {
    expect(inferKind("Middagete")).toBe("meal");
    expect(inferKind("Lunch")).toBe("meal");
    expect(inferKind("Afternoon tea")).toBe("meal");
  });

  it("recognises care", () => {
    expect(inferKind("Fisioterapie")).toBe("care");
    expect(inferKind("Doctor's round")).toBe("care");
  });

  it("falls back to activity rather than guessing", () => {
    expect(inferKind("Sangkring")).toBe("activity");
    expect(inferKind("Bingo")).toBe("activity");
  });
});

describe("sync", () => {
  it("replaces calendar entries and leaves family entries alone", async () => {
    const repository = new InMemoryRepository(NOW);
    const before = await repository.listScheduleEntries(
      FIXTURE_PERSON_ID,
      new Date(NOW.getTime() - DAY_MS),
      new Date(NOW.getTime() + DAY_MS),
    );
    expect(before.some((entry) => entry.source === "family")).toBe(true);

    await syncCalendars(
      repository,
      FIXTURE_PERSON_ID,
      new FixtureCalendarFetcher(FIXTURE_CALENDARS),
      NOW,
    );

    const after = await repository.listScheduleEntries(
      FIXTURE_PERSON_ID,
      new Date(NOW.getTime() - DAY_MS),
      new Date(NOW.getTime() + DAY_MS),
    );
    const family = after.filter((entry) => entry.source === "family");
    expect(family.map((entry) => entry.visitorName)).toContain("Anna");
    expect(after.some((entry) => entry.source === "calendar")).toBe(true);
  });

  it("records the sync time", async () => {
    const repository = new InMemoryRepository(NOW);
    await syncCalendars(
      repository,
      FIXTURE_PERSON_ID,
      new FixtureCalendarFetcher(FIXTURE_CALENDARS),
      NOW,
    );
    const [subscription] = await repository.listCalendarSubscriptions(FIXTURE_PERSON_ID);
    expect(subscription.lastSyncedAt).toEqual(NOW);
  });

  it("reports a failing calendar instead of throwing", async () => {
    const repository = new InMemoryRepository(NOW);
    const result = await syncCalendars(
      repository,
      FIXTURE_PERSON_ID,
      new FixtureCalendarFetcher({}),
      NOW,
    );
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].subscriptionId).toBe("calendar-willowbrook");
  });
});
