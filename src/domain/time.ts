import {
  AFTERNOON_START_HOUR,
  EVENING_START_HOUR,
  MORNING_START_HOUR,
  NIGHT_START_HOUR,
} from "@/config/constants";
import type { Language } from "./types";

/**
 * Everything the room screen says about time is derived here, in the facility's
 * timezone, and rendered in words we control rather than locale defaults. A
 * locale string would happily produce "Tue" and the room screen must never
 * abbreviate a day.
 */

export const PARTS_OF_DAY = ["morning", "afternoon", "evening", "night"] as const;
export type PartOfDay = (typeof PARTS_OF_DAY)[number];

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** 0 is Sunday, matching Date.getDay. */
  weekday: number;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Break a timestamp into calendar fields as seen in a given IANA timezone. */
export function zonedParts(at: Date, timezone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(at).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    // Some runtimes render midnight as hour 24 under hour12: false.
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    weekday: WEEKDAY_INDEX[parts.weekday] ?? 0,
  };
}

export function partOfDay(hour: number): PartOfDay {
  if (hour >= NIGHT_START_HOUR || hour < MORNING_START_HOUR) return "night";
  if (hour >= EVENING_START_HOUR) return "evening";
  if (hour >= AFTERNOON_START_HOUR) return "afternoon";
  return "morning";
}

const WEEKDAY_WORDS: Record<Language, string[]> = {
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  af: ["Sondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrydag", "Saterdag"],
};

const PART_OF_DAY_WORDS: Record<Language, Record<PartOfDay, string>> = {
  en: { morning: "morning", afternoon: "afternoon", evening: "evening", night: "night" },
  af: { morning: "oggend", afternoon: "middag", evening: "aand", night: "nag" },
};

export function weekdayWord(weekday: number, language: Language): string {
  return WEEKDAY_WORDS[language][weekday];
}

/**
 * "Tuesday morning" in English. Afrikaans compounds the two into one word,
 * "Dinsdagoggend", which is why this is not a template with a space in it.
 */
export function dayAndPartOfDay(at: Date, timezone: string, language: Language): string {
  const { weekday, hour } = zonedParts(at, timezone);
  const day = weekdayWord(weekday, language);
  const part = PART_OF_DAY_WORDS[language][partOfDay(hour)];
  return language === "af" ? `${day}${part}` : `${day} ${part}`;
}

/**
 * A clock time as a person would say it. On the hour reads as a bare number,
 * because "Lunch at 12" is how the question gets asked and answered. No am or
 * pm: the part of the day is already on the screen above it.
 */
export function spokenClock(at: Date, timezone: string): string {
  const { hour, minute } = zonedParts(at, timezone);
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return minute === 0 ? `${twelve}` : `${twelve}:${String(minute).padStart(2, "0")}`;
}

/** Offset of a timezone from UTC at a given instant, in ms, minute resolution. */
function zonedOffsetMs(at: Date, timezone: string): number {
  const parts = zonedParts(at, timezone);
  const asIfUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
  );
  const flooredToMinute = Math.floor(at.getTime() / 60_000) * 60_000;
  return asIfUtc - flooredToMinute;
}

/**
 * Build the instant at a given wall clock time in a timezone, on the calendar
 * day of `reference` shifted by `dayOffset`. Two passes, because the offset
 * itself depends on the instant across a daylight saving boundary.
 */
export function zonedDateAt(
  reference: Date,
  timezone: string,
  hour: number,
  minute = 0,
  dayOffset = 0,
): Date {
  const parts = zonedParts(reference, timezone);
  const target = Date.UTC(parts.year, parts.month - 1, parts.day + dayOffset, hour, minute);
  let guess = new Date(target);
  for (let pass = 0; pass < 2; pass += 1) {
    guess = new Date(target - zonedOffsetMs(guess, timezone));
  }
  return guess;
}

/** True when two instants fall on the same calendar day in the given zone. */
export function isSameZonedDay(a: Date, b: Date, timezone: string): boolean {
  const first = zonedParts(a, timezone);
  const second = zonedParts(b, timezone);
  return (
    first.year === second.year && first.month === second.month && first.day === second.day
  );
}
