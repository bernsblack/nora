import type { RoomData } from "@/domain/room-view";
import { zonedDateAt } from "@/domain/time";
import type { AnswerPolicy, Person, ScheduleEntry } from "@/domain/types";

/**
 * The three residents from personas/, as data the device would actually hold.
 *
 * These are not the development fixtures. They exist so that a persona's
 * questions can be run against the room they are really in, with the schedule,
 * the faces and the answer policy their family would have set up. A question
 * answered correctly against the wrong day is not evidence of anything.
 */

/** Tuesday, 14:00 in Johannesburg, 13:00 in London. */
export const PERSONA_NOW = new Date("2026-08-04T12:00:00Z");

export const PERSONA_IDS = ["marta", "trevor", "halina"] as const;
export type ResidentId = (typeof PERSONA_IDS)[number];

export interface PersonaContext {
  data: RoomData;
  policy: AnswerPolicy | null;
}

/* Marta Venter, 84, moderate to late Alzheimer's, Afrikaans first language. */

const MARTA: Person = {
  id: "marta",
  facilityId: "willowbrook",
  preferredName: "Marta",
  roomLabel: "12",
  voiceName: "Nora",
  primaryLanguage: "af",
  languages: ["af", "en"],
  simplicity: "guided",
  micEnabled: true,
};

function martaContext(now: Date): PersonaContext {
  const timezone = "Africa/Johannesburg";
  const at = (hour: number, minute = 0, dayOffset = 0) =>
    zonedDateAt(now, timezone, hour, minute, dayOffset);

  const entries: ScheduleEntry[] = [
    {
      id: "m-lunch",
      personId: "marta",
      title: { af: "Middagete", en: "Lunch" },
      startsAt: at(12),
      endsAt: at(13),
      kind: "meal",
      source: "calendar",
    },
    {
      id: "m-tea",
      personId: "marta",
      title: { af: "Tee", en: "Tea" },
      startsAt: at(15),
      endsAt: at(15, 30),
      kind: "meal",
      source: "calendar",
    },
    {
      id: "m-visit",
      personId: "marta",
      title: { af: "Anna kom kuier", en: "Anna is visiting" },
      startsAt: at(15),
      endsAt: at(16, 30),
      kind: "visit",
      source: "family",
      visitorName: "Anna",
    },
    {
      id: "m-supper",
      personId: "marta",
      title: { af: "Aandete", en: "Supper" },
      startsAt: at(17, 30),
      kind: "meal",
      source: "calendar",
    },
  ];

  return {
    data: {
      person: MARTA,
      facility: { id: "willowbrook", name: "Willowbrook", timezone },
      entries,
      notes: [],
      photos: [
        {
          id: "m-p1",
          personId: "marta",
          url: "/fixtures/photo-anna.svg",
          name: "Anna",
          relationship: { af: "jou dogter", en: "your daughter" },
          order: 1,
        },
        {
          id: "m-p2",
          personId: "marta",
          url: "/fixtures/photo-pieter.svg",
          name: "Pieter",
          relationship: { af: "jou seun", en: "your son" },
          order: 2,
        },
      ],
    },
    policy: {
      personId: "marta",
      defaultMode: "gentle-redirection",
      topics: [
        {
          id: "m-jan",
          personId: "marta",
          subjectName: "Jan",
          relationship: { af: "jou man", en: "your husband" },
          situation: "deceased",
          familyWording: {
            af: "Jan is nie nou hier nie. Anna kom later kuier.",
            en: "Jan is not here right now. Anna is coming later.",
          },
        },
        {
          id: "m-hannie",
          personId: "marta",
          subjectName: "Hannie",
          relationship: { af: "jou suster", en: "your sister" },
          situation: "moved-away",
        },
      ],
    },
  };
}

/* Trevor Adams, 71, early stage vascular dementia, English, in his own flat. */

const TREVOR: Person = {
  id: "trevor",
  facilityId: "oakhaven",
  preferredName: "Trevor",
  // Not a room number. He lives in a flat, and calling it a room would be the
  // first thing he objected to.
  roomLabel: "flat 6",
  voiceName: "Nora",
  primaryLanguage: "en",
  languages: ["en", "af"],
  simplicity: "full",
  micEnabled: true,
};

function trevorContext(now: Date): PersonaContext {
  const timezone = "Africa/Johannesburg";
  const at = (hour: number, minute = 0, dayOffset = 0) =>
    zonedDateAt(now, timezone, hour, minute, dayOffset);

  const entries: ScheduleEntry[] = [
    {
      id: "t-physio",
      personId: "trevor",
      title: { en: "Physio", af: "Fisioterapie" },
      startsAt: at(16),
      endsAt: at(16, 45),
      kind: "care",
      source: "calendar",
    },
    {
      id: "t-bowls",
      personId: "trevor",
      title: { en: "Bowls", af: "Rolbal" },
      startsAt: at(10, 0, 1),
      kind: "activity",
      source: "calendar",
    },
    {
      id: "t-supper",
      personId: "trevor",
      title: { en: "Supper in the dining room", af: "Aandete in die eetkamer" },
      startsAt: at(18),
      kind: "meal",
      source: "calendar",
    },
  ];

  return {
    data: {
      person: TREVOR,
      facility: { id: "oakhaven", name: "Oakhaven", timezone },
      entries,
      notes: [],
      photos: [
        {
          id: "t-p1",
          personId: "trevor",
          url: "/fixtures/photo-anna.svg",
          name: "Dorothy",
          relationship: { en: "your wife", af: "jou vrou" },
          order: 1,
        },
      ],
    },
    // Nothing sensitive configured. Dorothy is alive and in the next room, and
    // Trevor set this up himself, which is its own finding.
    policy: { personId: "trevor", defaultMode: "truthful", topics: [] },
  };
}

/* Halina Nowak, 88, late stage Lewy body dementia, Polish first language. */

const HALINA: Person = {
  id: "halina",
  facilityId: "st-brigids",
  preferredName: "Halina",
  roomLabel: "4",
  voiceName: "Nora",
  // The device offers English and Afrikaans. Halina speaks Polish and has lost
  // most of her English. There is no honest way to configure this, and the
  // configuration below is the closest anyone could get.
  primaryLanguage: "en",
  languages: ["en"],
  simplicity: "minimal",
  micEnabled: true,
};

function halinaContext(now: Date): PersonaContext {
  const timezone = "Europe/London";
  const at = (hour: number, minute = 0, dayOffset = 0) =>
    zonedDateAt(now, timezone, hour, minute, dayOffset);

  const entries: ScheduleEntry[] = [
    {
      id: "h-lunch",
      personId: "halina",
      title: { en: "Lunch" },
      startsAt: at(12, 30),
      endsAt: at(13, 15),
      kind: "meal",
      source: "calendar",
    },
    {
      id: "h-tea",
      personId: "halina",
      title: { en: "Tea" },
      startsAt: at(15, 30),
      kind: "meal",
      source: "calendar",
    },
  ];

  return {
    data: {
      person: HALINA,
      facility: { id: "st-brigids", name: "St Brigid's", timezone },
      entries,
      notes: [],
      photos: [
        {
          id: "h-p1",
          personId: "halina",
          url: "/fixtures/photo-hannie.svg",
          name: "Ewa",
          relationship: { en: "your daughter" },
          order: 1,
        },
      ],
    },
    policy: {
      personId: "halina",
      defaultMode: "gentle-redirection",
      topics: [
        {
          id: "h-stefan",
          personId: "halina",
          subjectName: "Stefan",
          relationship: { en: "your husband" },
          situation: "deceased",
        },
      ],
    },
  };
}

const BUILDERS: Record<ResidentId, (now: Date) => PersonaContext> = {
  marta: martaContext,
  trevor: trevorContext,
  halina: halinaContext,
};

export function personaContext(id: ResidentId, now: Date = PERSONA_NOW): PersonaContext {
  return BUILDERS[id](now);
}
