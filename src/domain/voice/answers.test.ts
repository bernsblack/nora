import { describe, expect, it } from "vitest";
import { MAX_SPOKEN_SENTENCES, MAX_SPOKEN_WORDS } from "@/config/constants";
import {
  FIXTURE_TIMEZONE,
  fixtureAnswerPolicy,
  fixtureFacility,
  fixturePerson,
  fixturePhotos,
} from "@/data/fixtures";
import { splitSentences, countWords } from "../answer-policy/wording";
import { buildRoomView, type RoomData } from "../room-view";
import { zonedDateAt } from "../time";
import type { Language, ScheduleEntry } from "../types";
import { answerFor } from "./answers";
import { matchIntent } from "./matcher";
import { knownSubjects } from "./subjects";

/**
 * Mode one's answers, checked against the data the screen renders. If one of
 * these ever disagrees with room-view.test.ts, the device is saying something
 * the screen contradicts, which is worse than saying nothing.
 */

const NOW = new Date("2026-08-04T10:00:00Z"); // Tuesday, 12:00 in Johannesburg
const LANGUAGES: Language[] = ["af", "en"];

function data(): RoomData {
  const person = fixturePerson();
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
  return { person, facility: fixtureFacility(), entries, notes: [], photos: fixturePhotos() };
}

function ask(heard: string, asked = true) {
  const roomData = data();
  const match = matchIntent(heard, {
    subjects: knownSubjects(roomData, fixtureAnswerPolicy()),
    languages: LANGUAGES,
  });
  if (!match) throw new Error(`Nothing matched: ${heard}`);
  return answerFor(match, {
    data: roomData,
    policy: fixtureAnswerPolicy(),
    now: NOW,
    asked,
  });
}

describe("the questions people repeat", () => {
  it("what day is it", () => {
    expect(ask("watter dag is dit").speak).toBe("Dit is Dinsdagmiddag.");
  });

  it("where am i", () => {
    expect(ask("waar is ek").speak).toBe("Jy is by Willowbrook, kamer 12.");
  });

  it("when is lunch", () => {
    expect(ask("wanneer is middagete").speak).toBe("Middagete om 1");
  });

  it("when is someone coming", () => {
    expect(ask("wanneer kom anna").speak).toBe("Anna kom om 3");
  });

  it("who are you", () => {
    expect(ask("wie is jy").speak).toBe("Ek is Nora. Ek is hier by jou.");
  });

  it("when am i going home", () => {
    const answer = ask("wanneer gaan ek huis toe");
    expect(answer.rule).toBe("going-home");
    expect(answer.speak).toContain("Willowbrook");
  });
});

describe("agreement with the screen", () => {
  it("says the same day the screen shows", () => {
    const view = buildRoomView(data(), NOW);
    expect(ask("watter dag is dit").speak).toContain(view.dayAndPartOfDay);
  });

  it("says the same place the screen shows", () => {
    const view = buildRoomView(data(), NOW);
    expect(ask("waar is ek").speak).toBe(view.location);
  });
});

describe("the dial decides what is shown, not what may be answered", () => {
  it("still answers where they are when the screen has location off", () => {
    const roomData = data();
    roomData.person = { ...roomData.person, simplicity: "minimal" };
    const view = buildRoomView(roomData, NOW);
    expect(view.location).toBeNull();

    const match = matchIntent("waar is ek", { subjects: [], languages: LANGUAGES })!;
    const answer = answerFor(match, {
      data: roomData,
      policy: null,
      now: NOW,
      asked: true,
    });
    expect(answer.speak).toContain("Willowbrook");
  });
});

describe("length", () => {
  const questions = [
    "watter dag is dit",
    "waar is ek",
    "wanneer is middagete",
    "wanneer kom anna",
    "wie is jy",
    "wanneer gaan ek huis toe",
    "waar is jan",
  ];

  for (const question of questions) {
    it(`"${question}" stays within the spoken limits`, () => {
      const spoken = ask(question).speak ?? "";
      expect(splitSentences(spoken).length).toBeLessThanOrEqual(MAX_SPOKEN_SENTENCES);
      expect(countWords(spoken)).toBeLessThanOrEqual(MAX_SPOKEN_WORDS);
    });
  }
});

describe("nothing to report is not a disappointment", () => {
  it("says a quiet day rather than naming what is missing", () => {
    const roomData = data();
    roomData.entries = [];
    const match = matchIntent("kom iemand", { subjects: [], languages: LANGUAGES })!;
    const answer = answerFor(match, { data: roomData, policy: null, now: NOW, asked: true });
    expect(answer.rule).toBe("when-is-visit-none");
    expect(answer.speak).toBe("'n Rustige dag.");
  });
});

describe("the sensitive path", () => {
  it("uses the family's words when asked about Jan", () => {
    const answer = ask("waar is jan");
    expect(answer.rule).toBe("family-wording-gentle-redirection");
    expect(answer.speak).toContain("Jan is nie nou hier nie");
  });

  it("says nothing at all when nobody asked", () => {
    const answer = ask("waar is jan", false);
    expect(answer.speak).toBeNull();
    expect(answer.rule).toBe("never-volunteer");
  });
});
