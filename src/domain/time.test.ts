import { describe, expect, it } from "vitest";
import {
  dayAndPartOfDay,
  isSameZonedDay,
  parseLocalDateTime,
  partOfDay,
  spokenClock,
  zonedDateAt,
  zonedParts,
} from "./time";

const JOHANNESBURG = "Africa/Johannesburg";
const LONDON = "Europe/London";

describe("zonedParts", () => {
  it("reads calendar fields in the given zone", () => {
    // 2026-08-04T06:30Z is 08:30 in Johannesburg, a Tuesday.
    const parts = zonedParts(new Date("2026-08-04T06:30:00Z"), JOHANNESBURG);
    expect(parts).toMatchObject({ year: 2026, month: 8, day: 4, hour: 8, minute: 30, weekday: 2 });
  });

  it("reports midnight as hour zero, not twenty four", () => {
    const parts = zonedParts(new Date("2026-08-03T22:00:00Z"), JOHANNESBURG);
    expect(parts.hour).toBe(0);
    expect(parts.day).toBe(4);
  });
});

describe("partOfDay", () => {
  it("splits the day the way a care home does", () => {
    expect(partOfDay(6)).toBe("morning");
    expect(partOfDay(11)).toBe("morning");
    expect(partOfDay(12)).toBe("afternoon");
    expect(partOfDay(16)).toBe("afternoon");
    expect(partOfDay(17)).toBe("evening");
    expect(partOfDay(20)).toBe("evening");
    expect(partOfDay(21)).toBe("night");
    expect(partOfDay(3)).toBe("night");
  });
});

describe("dayAndPartOfDay", () => {
  const tuesdayMorning = new Date("2026-08-04T06:30:00Z");

  it("never abbreviates the day", () => {
    expect(dayAndPartOfDay(tuesdayMorning, JOHANNESBURG, "en")).toBe("Tuesday morning");
  });

  it("compounds the Afrikaans form into one word", () => {
    expect(dayAndPartOfDay(tuesdayMorning, JOHANNESBURG, "af")).toBe("Dinsdagoggend");
  });

  it("derives from the facility zone, not the server", () => {
    // One instant, two facilities, two different parts of the day. In August
    // Johannesburg is UTC+2 and London is UTC+1.
    const lateEvening = new Date("2026-08-04T19:30:00Z");
    expect(dayAndPartOfDay(lateEvening, JOHANNESBURG, "en")).toBe("Tuesday night");
    expect(dayAndPartOfDay(lateEvening, LONDON, "en")).toBe("Tuesday evening");
  });
});

describe("spokenClock", () => {
  it("reads a whole hour as a bare number", () => {
    expect(spokenClock(new Date("2026-08-04T10:00:00Z"), JOHANNESBURG)).toBe("12");
  });

  it("keeps minutes when there are any", () => {
    expect(spokenClock(new Date("2026-08-04T15:30:00Z"), JOHANNESBURG)).toBe("5:30");
  });

  it("reads midnight and noon as twelve", () => {
    expect(spokenClock(new Date("2026-08-03T22:00:00Z"), JOHANNESBURG)).toBe("12");
  });
});

describe("zonedDateAt", () => {
  it("builds a wall clock time on the reference day", () => {
    const reference = new Date("2026-08-04T06:30:00Z");
    const noon = zonedDateAt(reference, JOHANNESBURG, 12, 0);
    expect(zonedParts(noon, JOHANNESBURG)).toMatchObject({ day: 4, hour: 12, minute: 0 });
  });

  it("shifts by whole days", () => {
    const reference = new Date("2026-08-04T06:30:00Z");
    const tomorrow = zonedDateAt(reference, JOHANNESBURG, 8, 0, 1);
    expect(zonedParts(tomorrow, JOHANNESBURG)).toMatchObject({ day: 5, hour: 8 });
  });

  it("lands on the right wall clock time across a daylight saving change", () => {
    // London moves to summer time on 2026-03-29. A naive offset would put this
    // an hour out.
    const beforeChange = new Date("2026-03-28T12:00:00Z");
    const afterChange = zonedDateAt(beforeChange, LONDON, 9, 0, 2);
    expect(zonedParts(afterChange, LONDON)).toMatchObject({ day: 30, hour: 9, minute: 0 });
  });
});

describe("parseLocalDateTime", () => {
  it("reads the entered time as the time at the facility", () => {
    // A family member in London types 15:00 for a visit. The visit is at three
    // o'clock where their mother lives, which is 13:00 UTC in August.
    const at = parseLocalDateTime("2026-08-04T15:00", JOHANNESBURG);
    expect(at?.toISOString()).toBe("2026-08-04T13:00:00.000Z");
  });

  it("does not care what the browser or the server thinks the zone is", () => {
    const johannesburg = parseLocalDateTime("2026-08-04T15:00", JOHANNESBURG);
    const london = parseLocalDateTime("2026-08-04T15:00", LONDON);
    expect(johannesburg?.getTime()).not.toBe(london?.getTime());
    expect(zonedParts(johannesburg!, JOHANNESBURG).hour).toBe(15);
    expect(zonedParts(london!, LONDON).hour).toBe(15);
  });

  it("accepts the seconds some browsers add", () => {
    expect(parseLocalDateTime("2026-08-04T15:00:00", JOHANNESBURG)?.toISOString()).toBe(
      "2026-08-04T13:00:00.000Z",
    );
  });

  it("returns null for anything it cannot read, rather than a wrong date", () => {
    expect(parseLocalDateTime("", JOHANNESBURG)).toBeNull();
    expect(parseLocalDateTime("next tuesday", JOHANNESBURG)).toBeNull();
  });
});

describe("isSameZonedDay", () => {
  it("compares calendar days, not elapsed time", () => {
    const late = new Date("2026-08-04T21:00:00Z");
    const early = new Date("2026-08-04T22:30:00Z");
    // Both are still the 4th in London, but the second has rolled over into
    // the 5th in Johannesburg.
    expect(isSameZonedDay(late, early, LONDON)).toBe(true);
    expect(isSameZonedDay(late, early, JOHANNESBURG)).toBe(false);
  });
});
