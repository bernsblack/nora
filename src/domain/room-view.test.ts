import { describe, expect, it } from "vitest";
import {
  FIXTURE_TIMEZONE,
  fixtureFacility,
  fixturePerson,
  fixturePhotos,
} from "@/data/fixtures";
import { PHOTO_ROTATION_MINUTES } from "@/config/constants";
import { buildRoomView, selectPhoto, type RoomData } from "./room-view";
import { zonedDateAt } from "./time";
import type { FamilyNote, Person, ScheduleEntry, SimplicityLevel } from "./types";

const NOW = new Date("2026-08-04T10:00:00Z"); // Tuesday, 12:00 in Johannesburg

function data(overrides: Partial<RoomData> = {}): RoomData {
  const person = fixturePerson();
  const facility = fixtureFacility();
  const entries: ScheduleEntry[] = [
    {
      id: "lunch",
      personId: person.id,
      title: { af: "Middagete", en: "Lunch" },
      startsAt: zonedDateAt(NOW, FIXTURE_TIMEZONE, 13, 0),
      kind: "meal",
      source: "calendar",
    },
    {
      id: "visit",
      personId: person.id,
      title: { af: "Anna kom kuier", en: "Anna is visiting" },
      startsAt: zonedDateAt(NOW, FIXTURE_TIMEZONE, 15, 0),
      kind: "visit",
      source: "family",
      visitorName: "Anna",
    },
  ];
  return {
    person,
    facility,
    entries,
    notes: [],
    photos: fixturePhotos(),
    ...overrides,
  };
}

function withSimplicity(level: SimplicityLevel): Person {
  return { ...fixturePerson(), simplicity: level };
}

describe("the four things on the screen", () => {
  const view = buildRoomView(data(), NOW);

  it("says the day and part of the day in words", () => {
    expect(view.dayAndPartOfDay).toBe("Dinsdagmiddag");
  });

  it("says where they are, by name", () => {
    expect(view.location).toBe("Jy is by Willowbrook, kamer 12.");
  });

  it("shows one next thing, singular", () => {
    expect(view.nextThing).toBe("Middagete om 1");
  });

  it("puts a name under the face", () => {
    expect(view.photo?.caption).toMatch(/^(Anna|Pieter|Hannie), jou /);
  });
});

describe("language", () => {
  it("renders in the person's primary language", () => {
    expect(buildRoomView(data(), NOW).language).toBe("af");
  });

  it("can be asked for the other language without changing the data", () => {
    const view = buildRoomView(data(), NOW, "en");
    expect(view.dayAndPartOfDay).toBe("Tuesday afternoon");
    expect(view.nextThing).toBe("Lunch at 1");
    expect(view.location).toBe("You are at Willowbrook, room 12.");
  });

  it("falls back to a language that exists rather than blanking the screen", () => {
    const entries: ScheduleEntry[] = [
      {
        id: "only-af",
        personId: "person-marta",
        title: { af: "Sangkring" },
        startsAt: zonedDateAt(NOW, FIXTURE_TIMEZONE, 14, 0),
        kind: "activity",
        source: "calendar",
      },
    ];
    const view = buildRoomView(data({ entries }), NOW, "en");
    expect(view.nextThing).toBe("Sangkring at 2");
  });
});

describe("the visit wording", () => {
  it("names the visitor rather than reading the title", () => {
    // 14:00 in Johannesburg. Lunch has been over for an hour, Anna is at 15:00.
    const twoPm = new Date(NOW.getTime() + 2 * 60 * 60 * 1000);
    expect(buildRoomView(data(), twoPm, "en").nextThing).toBe("Anna is coming at 3");
  });

  it("switches to the present tense once the visit has started", () => {
    const threePm = new Date(NOW.getTime() + 3 * 60 * 60 * 1000);
    expect(buildRoomView(data(), threePm, "en").nextThing).toBe("Anna is here");
  });
});

describe("a quiet day is not a lack", () => {
  it("says something warm when there is nothing in the horizon", () => {
    const view = buildRoomView(data({ entries: [] }), NOW, "en");
    expect(view.nextThing).toBe("A quiet day.");
    expect(view.nextThing).not.toMatch(/nothing|no |none/i);
  });
});

describe("a fresh family note outranks the schedule", () => {
  it("shows the note instead of the next event", () => {
    const notes: FamilyNote[] = [
      {
        id: "note-1",
        personId: "person-marta",
        text: { af: "Pa is by die werk, hy is vanaand tuis." },
        createdAt: new Date(NOW.getTime() - 60 * 60 * 1000),
      },
    ];
    const view = buildRoomView(data({ notes }), NOW);
    expect(view.nextThing).toBe("Pa is by die werk, hy is vanaand tuis.");
  });

  it("ignores a note that has gone stale", () => {
    const notes: FamilyNote[] = [
      {
        id: "note-old",
        personId: "person-marta",
        text: { af: "Pa is by die werk." },
        createdAt: new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
    ];
    expect(buildRoomView(data({ notes }), NOW).nextThing).toBe("Middagete om 1");
  });

  it("ignores a note that has expired", () => {
    const notes: FamilyNote[] = [
      {
        id: "note-expired",
        personId: "person-marta",
        text: { af: "Pa is by die werk." },
        createdAt: new Date(NOW.getTime() - 60 * 60 * 1000),
        expiresAt: new Date(NOW.getTime() - 60 * 1000),
      },
    ];
    expect(buildRoomView(data({ notes }), NOW).nextThing).toBe("Middagete om 1");
  });
});

describe("the simplicity dial", () => {
  it("shows everything when turned up", () => {
    const view = buildRoomView(data({ person: withSimplicity("full") }), NOW);
    expect(view.location).not.toBeNull();
    expect(view.nextThing).not.toBeNull();
    expect(view.photo).not.toBeNull();
    expect(view.capabilities.offerConversation).toBe(true);
  });

  it("stops speaking first at calm", () => {
    const view = buildRoomView(data({ person: withSimplicity("calm") }), NOW);
    expect(view.capabilities.speakUnprompted).toBe(false);
    expect(view.capabilities.listenLocally).toBe(true);
  });

  it("leaves the day and a face at minimal", () => {
    const view = buildRoomView(data({ person: withSimplicity("minimal") }), NOW);
    expect(view.dayAndPartOfDay).not.toBe("");
    expect(view.photo).not.toBeNull();
    expect(view.nextThing).toBeNull();
    expect(view.location).toBeNull();
  });
});

describe("photo rotation", () => {
  const photos = fixturePhotos();

  it("is derived from the clock so server and device agree", () => {
    const first = selectPhoto(photos, NOW);
    const again = selectPhoto(photos, new Date(NOW.getTime() + 1000));
    expect(again?.id).toBe(first?.id);
  });

  it("moves on after the rotation window", () => {
    const later = new Date(NOW.getTime() + PHOTO_ROTATION_MINUTES * 60_000);
    expect(selectPhoto(photos, later)?.id).not.toBe(selectPhoto(photos, NOW)?.id);
  });

  it("copes with no photos at all", () => {
    expect(selectPhoto([], NOW)).toBeNull();
    expect(buildRoomView(data({ photos: [] }), NOW).photo).toBeNull();
  });
});
