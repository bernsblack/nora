import {
  EVENT_STILL_CURRENT_MINUTES,
  NEXT_THING_HORIZON_MINUTES,
  NOTE_OUTRANKS_SCHEDULE_MINUTES,
} from "@/config/constants";
import type { FamilyNote, ScheduleEntry } from "./types";

/**
 * One next thing, singular (PROJECT.md section 3). Not a list, not a count of
 * what is left, and never anything the person has already missed. A screen that
 * shows four incomplete tasks tells someone every hour that they are failing.
 */
export type NextThing =
  | { kind: "event"; entry: ScheduleEntry; happeningNow: boolean }
  | { kind: "note"; note: FamilyNote }
  | { kind: "quiet" };

const MINUTE_MS = 60_000;

function isLive(note: FamilyNote, now: Date): boolean {
  if (note.expiresAt && note.expiresAt.getTime() <= now.getTime()) return false;
  const age = now.getTime() - note.createdAt.getTime();
  return age >= 0 && age <= NOTE_OUTRANKS_SCHEDULE_MINUTES * MINUTE_MS;
}

/**
 * Pick the single thing to show. A fresh family note wins, because a family
 * member wrote it just now for a reason the calendar does not know about. After
 * that, whatever is happening now, then whatever is next inside the horizon.
 */
export function selectNextThing(
  entries: ScheduleEntry[],
  notes: FamilyNote[],
  now: Date,
): NextThing {
  const liveNote = notes
    .filter((note) => isLive(note, now))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  if (liveNote) return { kind: "note", note: liveNote };

  const nowMs = now.getTime();
  const windowStart = nowMs - EVENT_STILL_CURRENT_MINUTES * MINUTE_MS;
  const windowEnd = nowMs + NEXT_THING_HORIZON_MINUTES * MINUTE_MS;

  const candidates = entries
    .filter((entry) => {
      const start = entry.startsAt.getTime();
      if (start > windowEnd) return false;
      // An event that has ended is over, whatever its start time was.
      if (entry.endsAt && entry.endsAt.getTime() <= nowMs) return false;
      return start >= windowStart;
    })
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const happening = candidates.find((entry) => entry.startsAt.getTime() <= nowMs);
  if (happening) return { kind: "event", entry: happening, happeningNow: true };

  const upcoming = candidates[0];
  if (upcoming) return { kind: "event", entry: upcoming, happeningNow: false };

  return { kind: "quiet" };
}
