import ICAL from "ical.js";
import type { Language, ScheduleEntry, ScheduleKind } from "@/domain/types";

/**
 * Read only iCal import (PROJECT.md section 7). The facility publishes a
 * calendar, the family subscribes to it, and we never write back.
 *
 * Fetching is behind an interface because the real one has to deal with
 * redirects, webcal:// URLs, auth on some providers, and a care home IT
 * department. The fixture implementation is what the prototype runs on.
 */

export interface CalendarFetcher {
  fetch(url: string): Promise<string>;
}

export class HttpCalendarFetcher implements CalendarFetcher {
  async fetch(url: string): Promise<string> {
    const normalised = url.replace(/^webcal:\/\//i, "https://");
    const response = await fetch(normalised, { headers: { accept: "text/calendar" } });
    if (!response.ok) {
      throw new Error(`Calendar fetch failed: ${response.status}`);
    }
    return response.text();
  }
}

/** Serves a bundled .ics. Keyed by URL so several fixtures can coexist. */
export class FixtureCalendarFetcher implements CalendarFetcher {
  constructor(private documents: Record<string, string>) {}

  async fetch(url: string): Promise<string> {
    const document = this.documents[url];
    if (document === undefined) throw new Error(`No fixture calendar for ${url}`);
    return document;
  }
}

/**
 * Guardrail on recurrence expansion. A rule with no end date will iterate
 * forever, and a malformed one will do it faster.
 *
 * It has to be generous rather than tight. Expansion has to start at the rule's
 * own DTSTART, because the anchor is what decides which fortnight a
 * INTERVAL=2 rule falls on, and a calendar that has been running daily since
 * 2020 needs a couple of thousand steps before it reaches this week. A daily
 * rule anchored fifteen years ago still fits inside this.
 */
const MAX_OCCURRENCES = 6_000;

/**
 * Kind inference from the event title. Crude, and it has to be: the facility
 * writes free text and will not tag anything. Getting it wrong downgrades an
 * event to "activity", which is a wording change and not a wrong answer.
 */
const KIND_KEYWORDS: Record<Exclude<ScheduleKind, "activity">, string[]> = {
  meal: [
    "breakfast", "lunch", "dinner", "supper", "tea", "coffee", "snack",
    "ontbyt", "middagete", "aandete", "ete", "tee", "koffie",
  ],
  care: [
    "physio", "doctor", "nurse", "gp", "clinic", "hairdresser", "podiatry",
    "bath", "medication round",
    "fisio", "dokter", "suster", "kliniek", "haarkapper", "bad",
  ],
  visit: ["visit", "visitor", "family time", "kuier", "besoek", "familie"],
  rest: ["rest", "quiet time", "nap", "rus", "slaap"],
};

export function inferKind(title: string): ScheduleKind {
  const haystack = title.toLowerCase();
  for (const [kind, keywords] of Object.entries(KIND_KEYWORDS)) {
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      return kind as ScheduleKind;
    }
  }
  return "activity";
}

export interface ParseOptions {
  personId: string;
  /** The language the facility writes in. Titles are filed under this key. */
  language: Language;
  /** Only occurrences inside this window are returned. */
  from: Date;
  to: Date;
}

/**
 * Parse an iCal document into schedule entries, expanding recurrence inside the
 * requested window. Recurring structure is the whole point of the import:
 * meals, physio Thursdays, the hairdresser.
 */
export function parseCalendar(ics: string, options: ParseOptions): Omit<ScheduleEntry, "id">[] {
  const component = new ICAL.Component(ICAL.parse(ics));

  // Register any VTIMEZONE the file carries, otherwise floating and TZID times
  // resolve against the wrong zone.
  for (const timezone of component.getAllSubcomponents("vtimezone")) {
    const id = timezone.getFirstPropertyValue("tzid");
    if (typeof id === "string" && !ICAL.TimezoneService.has(id)) {
      ICAL.TimezoneService.register(new ICAL.Timezone(timezone), id);
    }
  }

  const entries: Omit<ScheduleEntry, "id">[] = [];
  const windowStart = options.from.getTime();
  const windowEnd = options.to.getTime();

  for (const vevent of component.getAllSubcomponents("vevent")) {
    const event = new ICAL.Event(vevent);
    const title = event.summary?.trim();
    if (!title) continue;

    const durationMs =
      event.endDate && event.startDate
        ? event.endDate.toJSDate().getTime() - event.startDate.toJSDate().getTime()
        : 0;

    const starts: Date[] = [];
    if (event.isRecurring()) {
      const iterator = event.iterator();
      let occurrence = iterator.next();
      let seen = 0;
      while (occurrence && seen < MAX_OCCURRENCES) {
        seen += 1;
        const at = occurrence.toJSDate();
        if (at.getTime() >= windowEnd) break;
        if (at.getTime() >= windowStart) starts.push(at);
        occurrence = iterator.next();
      }
    } else if (event.startDate) {
      const at = event.startDate.toJSDate();
      if (at.getTime() >= windowStart && at.getTime() < windowEnd) starts.push(at);
    }

    for (const startsAt of starts) {
      entries.push({
        personId: options.personId,
        title: { [options.language]: title },
        startsAt,
        endsAt: durationMs > 0 ? new Date(startsAt.getTime() + durationMs) : undefined,
        kind: inferKind(title),
        source: "calendar",
      });
    }
  }

  return entries.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}
