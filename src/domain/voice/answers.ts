import { NEXT_THING_HORIZON_MINUTES } from "@/config/constants";
import { phrases } from "@/i18n/strings";
import { answerSensitive, type PolicyAnswer } from "../answer-policy/policy";
import type { RoomData } from "../room-view";
import { dayAndPartOfDay, spokenClock } from "../time";
import { resolveText, type AnswerPolicy, type Language, type ScheduleEntry } from "../types";
import { trimToSpokenLength } from "../answer-policy/wording";
import type { IntentMatch } from "./matcher";

/**
 * Scripted answers for mode one, built from the same data the room screen
 * renders (PROJECT.md section 5). Nothing here is generated, nothing here calls
 * out, and a spoken answer can never disagree with what is on the screen
 * because both derive from the same RoomData.
 *
 * Every answer is one or two sentences. The trim is applied at the end rather
 * than trusted to the phrasing, so a translation cannot quietly get long.
 */

export interface AnswerContext {
  data: RoomData;
  policy: AnswerPolicy | null;
  now: Date;
  /** False when Nora would be speaking first. Gates the sensitive path. */
  asked: boolean;
}

const MINUTE_MS = 60_000;

function upcoming(
  entries: ScheduleEntry[],
  now: Date,
  predicate: (entry: ScheduleEntry) => boolean,
): ScheduleEntry | null {
  const horizon = now.getTime() + NEXT_THING_HORIZON_MINUTES * MINUTE_MS;
  return (
    entries
      .filter(predicate)
      .filter((entry) => {
        const start = entry.startsAt.getTime();
        if (start > horizon) return false;
        if (entry.endsAt) return entry.endsAt.getTime() > now.getTime();
        return start >= now.getTime();
      })
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0] ?? null
  );
}

function speak(text: string, rule: string): PolicyAnswer {
  return { speak: trimToSpokenLength(text), show: text, rule };
}

export function answerFor(match: IntentMatch, context: AnswerContext): PolicyAnswer {
  const { data, now } = context;
  const language: Language = match.language;
  const text = phrases(language);
  const fallbacks = data.person.languages.filter((candidate) => candidate !== language);
  const timezone = data.facility.timezone;

  switch (match.intent) {
    case "what-day-is-it":
      return speak(text.itIs(dayAndPartOfDay(now, timezone, language)), "what-day-is-it");

    case "where-am-i":
      // Answered even when the dial has location off the screen. The dial
      // decides what is shown unasked, not what may be answered when asked.
      return speak(
        text.location(data.facility.name, data.person.roomLabel),
        "where-am-i",
      );

    case "who-are-you":
      return speak(text.whoAreYou(data.person.voiceName), "who-are-you");

    case "when-is-meal": {
      const meal = upcoming(data.entries, now, (entry) => entry.kind === "meal");
      if (!meal) return speak(text.quietDay, "when-is-meal-none");
      const title = resolveText(meal.title, language, fallbacks) ?? "";
      const happening = meal.startsAt.getTime() <= now.getTime();
      return speak(
        happening ? text.eventNow(title) : text.eventAt(title, spokenClock(meal.startsAt, timezone)),
        happening ? "when-is-meal-now" : "when-is-meal",
      );
    }

    case "when-is-visit": {
      const visit = upcoming(
        data.entries,
        now,
        (entry) =>
          entry.kind === "visit" &&
          (!match.subjectName ||
            entry.visitorName?.toLowerCase() === match.subjectName.toLowerCase()),
      );
      if (!visit) {
        // No visit is not a disappointment to be narrated. It is a quiet day.
        return speak(text.quietDay, "when-is-visit-none");
      }
      const name = visit.visitorName ?? resolveText(visit.title, language, fallbacks) ?? "";
      const happening = visit.startsAt.getTime() <= now.getTime();
      return speak(
        happening ? text.visitNow(name) : text.visitAt(name, spokenClock(visit.startsAt, timezone)),
        happening ? "when-is-visit-now" : "when-is-visit",
      );
    }

    case "where-is-person":
      return answerSensitive(
        {
          intent: "where-is-person",
          subjectName: match.subjectName,
          language,
          languages: data.person.languages,
          asked: context.asked,
          facilityName: data.facility.name,
        },
        context.policy,
      );

    case "going-home":
      return answerSensitive(
        {
          intent: "going-home",
          language,
          languages: data.person.languages,
          asked: context.asked,
          facilityName: data.facility.name,
        },
        context.policy,
      );

    default:
      return { speak: null, show: null, rule: "no-answer" };
  }
}
