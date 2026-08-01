import type { NoraRepository } from "@/data/repository";
import type { ScheduleEntry } from "@/domain/types";
import { parseCalendar, type CalendarFetcher } from "./calendar";
import { FIXTURE_CALENDARS } from "./fixtures/willowbrook-ics";
import { FixtureCalendarFetcher } from "./calendar";

/**
 * Pull every calendar a person is subscribed to and replace their calendar
 * sourced entries with what came back.
 *
 * Replace rather than merge, because the facility's calendar is the authority
 * on its own events and a deleted event has to disappear from the room screen.
 * Family entered entries are never touched.
 */

/** How far either side of now we expand recurrence. */
export const SYNC_WINDOW_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface SyncResult {
  entries: ScheduleEntry[];
  /** Subscriptions that failed, so the family app can show which and why. */
  failures: { subscriptionId: string; message: string }[];
}

export async function syncCalendars(
  repository: NoraRepository,
  personId: string,
  fetcher: CalendarFetcher,
  now: Date,
): Promise<SyncResult> {
  const subscriptions = await repository.listCalendarSubscriptions(personId);
  const from = new Date(now.getTime() - SYNC_WINDOW_DAYS * DAY_MS);
  const to = new Date(now.getTime() + SYNC_WINDOW_DAYS * DAY_MS);

  const parsed: Omit<ScheduleEntry, "id">[] = [];
  const failures: SyncResult["failures"] = [];

  for (const subscription of subscriptions) {
    try {
      const ics = await fetcher.fetch(subscription.url);
      parsed.push(
        ...parseCalendar(ics, {
          personId,
          language: subscription.language,
          from,
          to,
        }),
      );
      await repository.markCalendarSynced(subscription.id, now);
    } catch (error) {
      // One bad calendar must not wipe the schedule that came from a good one,
      // so failures are collected and the replace still runs with what parsed.
      failures.push({
        subscriptionId: subscription.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const entries = await repository.replaceCalendarEntries(personId, parsed);
  return { entries, failures };
}

/**
 * The fetcher the prototype uses. Swapping to HttpCalendarFetcher is the whole
 * of the work once there is a real calendar URL to point at.
 */
export function defaultCalendarFetcher(): CalendarFetcher {
  return new FixtureCalendarFetcher(FIXTURE_CALENDARS);
}
