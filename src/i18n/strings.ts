import type { Language } from "@/domain/types";

/**
 * Every sentence the device shows or speaks that we wrote ourselves. Family
 * authored text does not pass through here, it is used verbatim.
 *
 * Rules that apply to every string in this file, from PROJECT.md section 3:
 * one or two sentences, never impatient, never a quiz, never scorekeeping, and
 * nothing that acknowledges the question has been asked before.
 */

export interface Phrases {
  /** "You are at Willowbrook, room 12." */
  location: (facility: string, room: string) => string;
  /** "It is Tuesday morning." */
  itIs: (dayAndPart: string) => string;
  /** "Lunch at 12" */
  eventAt: (title: string, time: string) => string;
  /** "Lunch now" */
  eventNow: (title: string) => string;
  /** "Anna is coming at 3" */
  visitAt: (name: string, time: string) => string;
  /** "Anna is here" */
  visitNow: (name: string) => string;
  /** Shown when the horizon holds nothing. Never phrased as a lack. */
  quietDay: string;
  /** Under a face. "Anna, your daughter" */
  photoCaption: (name: string, relationship: string | null) => string;
  /** "I am Nora. I am here with you." */
  whoAreYou: (voiceName: string) => string;
  /** Said when we were addressed but did not understand. Never a guess. */
  didNotCatch: string;
  /** Offered on screen alongside didNotCatch when mode two is available. */
  askMeMore: string;
  /** Fallback for a sensitive question when nothing else is configured. */
  gentleRedirect: (subject: string) => string;
  /** Fallback for "when am I going home". */
  goingHome: (facility: string) => string;
  /** Microphone state, shown on the room screen and readable across the room. */
  micOn: string;
  micOff: string;
}

const en: Phrases = {
  location: (facility, room) => `You are at ${facility}, room ${room}.`,
  itIs: (dayAndPart) => `It is ${dayAndPart}.`,
  eventAt: (title, time) => `${title} at ${time}`,
  eventNow: (title) => `${title} now`,
  visitAt: (name, time) => `${name} is coming at ${time}`,
  visitNow: (name) => `${name} is here`,
  quietDay: "A quiet day.",
  photoCaption: (name, relationship) => (relationship ? `${name}, ${relationship}` : name),
  whoAreYou: (voiceName) => `I am ${voiceName}. I am here with you.`,
  didNotCatch: "I am here.",
  askMeMore: "Tap to talk to me",
  gentleRedirect: (subject) => `${subject} is not here right now. You are safe here.`,
  goingHome: (facility) => `You are staying at ${facility} for now. You are safe here.`,
  micOn: "Listening",
  micOff: "Microphone off",
};

const af: Phrases = {
  location: (facility, room) => `Jy is by ${facility}, kamer ${room}.`,
  itIs: (dayAndPart) => `Dit is ${dayAndPart}.`,
  eventAt: (title, time) => `${title} om ${time}`,
  eventNow: (title) => `${title} nou`,
  visitAt: (name, time) => `${name} kom om ${time}`,
  visitNow: (name) => `${name} is hier`,
  quietDay: "'n Rustige dag.",
  photoCaption: (name, relationship) => (relationship ? `${name}, ${relationship}` : name),
  whoAreYou: (voiceName) => `Ek is ${voiceName}. Ek is hier by jou.`,
  didNotCatch: "Ek is hier.",
  askMeMore: "Tik om met my te praat",
  gentleRedirect: (subject) => `${subject} is nie nou hier nie. Jy is veilig hier.`,
  goingHome: (facility) => `Jy bly vir eers by ${facility}. Jy is veilig hier.`,
  micOn: "Luister",
  micOff: "Mikrofoon af",
};

const PHRASES: Record<Language, Phrases> = { en, af };

export function phrases(language: Language): Phrases {
  return PHRASES[language];
}
