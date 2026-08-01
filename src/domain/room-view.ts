import { PHOTO_ROTATION_MINUTES } from "@/config/constants";
import { phrases } from "@/i18n/strings";
import { selectNextThing, type NextThing } from "./next-thing";
import { capabilitiesFor, type Capabilities } from "./simplicity";
import { dayAndPartOfDay, spokenClock } from "./time";
import {
  resolveText,
  type Facility,
  type FamilyNote,
  type Language,
  type Person,
  type Photo,
  type ScheduleEntry,
} from "./types";

/**
 * The room view is the single derivation of what the device knows right now.
 * The screen renders it and the voice layer answers from it, so a spoken answer
 * can never disagree with what is visible (PROJECT.md section 5, mode one).
 */

export interface RoomData {
  person: Person;
  facility: Facility;
  entries: ScheduleEntry[];
  notes: FamilyNote[];
  photos: Photo[];
}

export interface RoomPhotoView {
  url: string;
  name: string;
  /** "Anna, your daughter". Always present, because a face alone is a quiz. */
  caption: string;
}

export interface RoomView {
  language: Language;
  voiceName: string;
  capabilities: Capabilities;
  /** "Tuesday morning". Always present. */
  dayAndPartOfDay: string;
  /** "You are at Willowbrook, room 12." Null when the dial has it off. */
  location: string | null;
  /** "Lunch at 12". Null when the dial has it off. */
  nextThing: string | null;
  /** What the next thing was derived from, for the voice layer to reason about. */
  nextThingSource: NextThing;
  photo: RoomPhotoView | null;
}

function renderNextThing(
  next: NextThing,
  language: Language,
  timezone: string,
  fallbacks: Language[],
): string {
  const text = phrases(language);
  if (next.kind === "quiet") return text.quietDay;
  if (next.kind === "note") {
    return resolveText(next.note.text, language, fallbacks) ?? text.quietDay;
  }

  const { entry, happeningNow } = next;
  const title = resolveText(entry.title, language, fallbacks) ?? "";
  const time = spokenClock(entry.startsAt, timezone);

  if (entry.kind === "visit" && entry.visitorName) {
    return happeningNow
      ? text.visitNow(entry.visitorName)
      : text.visitAt(entry.visitorName, time);
  }
  return happeningNow ? text.eventNow(title) : text.eventAt(title, time);
}

/**
 * Which face is up. Derived from the clock rather than held in state, so the
 * server and the device agree without coordinating, and a reload does not
 * shuffle the room.
 */
export function selectPhoto(photos: Photo[], now: Date): Photo | null {
  if (photos.length === 0) return null;
  const ordered = [...photos].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const slot = Math.floor(now.getTime() / (PHOTO_ROTATION_MINUTES * 60_000));
  return ordered[slot % ordered.length];
}

export function buildRoomView(data: RoomData, now: Date, language?: Language): RoomView {
  const { person, facility, entries, notes, photos } = data;
  const active = language ?? person.primaryLanguage;
  const fallbacks = person.languages.filter((candidate) => candidate !== active);
  const text = phrases(active);
  const capabilities = capabilitiesFor(person.simplicity);

  const nextThingSource = selectNextThing(entries, notes, now);
  const photo = capabilities.showPhoto ? selectPhoto(photos, now) : null;

  return {
    language: active,
    voiceName: person.voiceName,
    capabilities,
    dayAndPartOfDay: dayAndPartOfDay(now, facility.timezone, active),
    location: capabilities.showLocation
      ? text.location(facility.name, person.roomLabel)
      : null,
    nextThing: capabilities.showNextThing
      ? renderNextThing(nextThingSource, active, facility.timezone, fallbacks)
      : null,
    nextThingSource,
    photo: photo
      ? {
          url: photo.url,
          name: photo.name,
          caption: text.photoCaption(
            photo.name,
            resolveText(photo.relationship, active, fallbacks),
          ),
        }
      : null,
  };
}
