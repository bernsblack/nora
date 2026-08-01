import { zonedDateAt } from "@/domain/time";
import type {
  AnswerPolicy,
  CalendarSubscription,
  DeviceToken,
  Facility,
  FamilyNote,
  Person,
  Photo,
  ScheduleEntry,
  VoiceMessage,
} from "@/domain/types";

/**
 * One fictional resident, enough to render every state the room screen has.
 * These are fixtures, not seed data: nothing here should ever reach a real
 * deployment, and the names are invented.
 *
 * The day is built relative to whenever the process starts, so the screen
 * always has a plausible next thing without anyone editing a timestamp.
 */

export const FIXTURE_FACILITY_ID = "facility-willowbrook";
export const FIXTURE_PERSON_ID = "person-marta";
export const FIXTURE_DEVICE_TOKEN = "dev-room-token";

export const FIXTURE_TIMEZONE = "Africa/Johannesburg";

export function fixtureFacility(): Facility {
  return {
    id: FIXTURE_FACILITY_ID,
    name: "Willowbrook",
    timezone: FIXTURE_TIMEZONE,
  };
}

export function fixturePerson(): Person {
  return {
    id: FIXTURE_PERSON_ID,
    facilityId: FIXTURE_FACILITY_ID,
    preferredName: "Marta",
    roomLabel: "12",
    voiceName: "Nora",
    primaryLanguage: "af",
    languages: ["af", "en"],
    simplicity: "guided",
    micEnabled: true,
  };
}

export function fixturePhotos(): Photo[] {
  return [
    {
      id: "photo-anna",
      personId: FIXTURE_PERSON_ID,
      url: "/fixtures/photo-anna.svg",
      name: "Anna",
      relationship: { af: "jou dogter", en: "your daughter" },
      order: 1,
    },
    {
      id: "photo-pieter",
      personId: FIXTURE_PERSON_ID,
      url: "/fixtures/photo-pieter.svg",
      name: "Pieter",
      relationship: { af: "jou seun", en: "your son" },
      order: 2,
    },
    {
      id: "photo-hannie",
      personId: FIXTURE_PERSON_ID,
      url: "/fixtures/photo-hannie.svg",
      name: "Hannie",
      relationship: { af: "jou suster", en: "your sister" },
      order: 3,
    },
  ];
}

export function fixtureSchedule(now: Date): ScheduleEntry[] {
  const at = (hour: number, minute = 0, dayOffset = 0) =>
    zonedDateAt(now, FIXTURE_TIMEZONE, hour, minute, dayOffset);

  const day = (dayOffset: number): ScheduleEntry[] => [
    {
      id: `breakfast-${dayOffset}`,
      personId: FIXTURE_PERSON_ID,
      title: { af: "Ontbyt", en: "Breakfast" },
      startsAt: at(8, 0, dayOffset),
      endsAt: at(9, 0, dayOffset),
      kind: "meal",
      source: "calendar",
    },
    {
      id: `lunch-${dayOffset}`,
      personId: FIXTURE_PERSON_ID,
      title: { af: "Middagete", en: "Lunch" },
      startsAt: at(12, 0, dayOffset),
      endsAt: at(13, 0, dayOffset),
      kind: "meal",
      source: "calendar",
    },
    {
      id: `tea-${dayOffset}`,
      personId: FIXTURE_PERSON_ID,
      title: { af: "Tee", en: "Tea" },
      startsAt: at(15, 0, dayOffset),
      endsAt: at(15, 30, dayOffset),
      kind: "meal",
      source: "calendar",
    },
    {
      id: `supper-${dayOffset}`,
      personId: FIXTURE_PERSON_ID,
      title: { af: "Aandete", en: "Supper" },
      startsAt: at(17, 30, dayOffset),
      endsAt: at(18, 30, dayOffset),
      kind: "meal",
      source: "calendar",
    },
  ];

  return [
    ...day(0),
    ...day(1),
    {
      id: "visit-anna",
      personId: FIXTURE_PERSON_ID,
      title: { af: "Anna kom kuier", en: "Anna is visiting" },
      startsAt: at(15, 0),
      endsAt: at(16, 30),
      kind: "visit",
      source: "family",
      visitorName: "Anna",
    },
    {
      id: "physio",
      personId: FIXTURE_PERSON_ID,
      title: { af: "Fisioterapie", en: "Physio" },
      startsAt: at(10, 0),
      endsAt: at(10, 45),
      kind: "care",
      source: "calendar",
    },
  ];
}

export function fixtureNotes(): FamilyNote[] {
  // Deliberately empty. A note outranks the schedule, so a fixture note would
  // hide the schedule rendering behind it on every screenshot.
  return [];
}

export function fixtureVoiceMessages(now: Date): VoiceMessage[] {
  return [
    {
      id: "voice-anna-1",
      personId: FIXTURE_PERSON_ID,
      fromName: "Anna",
      audioUrl: "/fixtures/voice-anna.txt",
      recordedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      transcript: {
        af: "Hallo Ma, ek sien Ma later vanmiddag.",
        en: "Hello Ma, I will see you later this afternoon.",
      },
    },
  ];
}

/**
 * A policy with one deceased spouse configured, because that is the highest
 * risk path in the product and it should be exercised by default in the
 * prototype rather than sitting untested behind an empty list.
 */
export function fixtureAnswerPolicy(): AnswerPolicy {
  return {
    personId: FIXTURE_PERSON_ID,
    defaultMode: "gentle-redirection",
    topics: [
      {
        id: "topic-jan",
        personId: FIXTURE_PERSON_ID,
        subjectName: "Jan",
        relationship: { af: "jou man", en: "your husband" },
        situation: "deceased",
        familyWording: {
          af: "Jan is nie nou hier nie. Anna kom later kuier.",
          en: "Jan is not here right now. Anna is coming later.",
        },
      },
      {
        id: "topic-hannie",
        personId: FIXTURE_PERSON_ID,
        subjectName: "Hannie",
        relationship: { af: "jou suster", en: "your sister" },
        situation: "moved-away",
      },
    ],
  };
}

export function fixtureDeviceTokens(now: Date): DeviceToken[] {
  return [
    {
      token: FIXTURE_DEVICE_TOKEN,
      personId: FIXTURE_PERSON_ID,
      label: "Bedside tablet",
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    },
  ];
}

export function fixtureCalendarSubscriptions(): CalendarSubscription[] {
  return [
    {
      id: "calendar-willowbrook",
      personId: FIXTURE_PERSON_ID,
      url: "fixture:willowbrook",
      label: "Willowbrook activities",
      language: "af",
    },
  ];
}
