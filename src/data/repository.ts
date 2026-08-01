import type { RoomData } from "@/domain/room-view";
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
 * The only way either surface reaches data. Two implementations exist: an in
 * memory one seeded with fixtures, which is what runs until a database is
 * provisioned, and a Drizzle one against Postgres. Nothing above this line
 * knows which it is talking to.
 *
 * Reads that the room screen performs are separated from writes that only the
 * family app performs, because the room device holds a device token and must
 * never be able to mutate anything.
 */

export interface RoomReads {
  getPerson(personId: string): Promise<Person | null>;
  getFacility(facilityId: string): Promise<Facility | null>;
  /** Half open range, [from, to). */
  listScheduleEntries(personId: string, from: Date, to: Date): Promise<ScheduleEntry[]>;
  listNotes(personId: string): Promise<FamilyNote[]>;
  listPhotos(personId: string): Promise<Photo[]>;
  listVoiceMessages(personId: string): Promise<VoiceMessage[]>;
  getAnswerPolicy(personId: string): Promise<AnswerPolicy | null>;
  /** Everything the room screen needs for one render, in one call. */
  loadRoomData(personId: string, now: Date): Promise<RoomData | null>;
}

export interface FamilyWrites {
  listPeople(): Promise<Person[]>;
  updatePerson(personId: string, patch: Partial<Omit<Person, "id">>): Promise<Person>;

  createScheduleEntry(entry: Omit<ScheduleEntry, "id">): Promise<ScheduleEntry>;
  deleteScheduleEntry(entryId: string): Promise<void>;
  /** Replace every calendar sourced entry for a person. Used by iCal sync. */
  replaceCalendarEntries(
    personId: string,
    entries: Omit<ScheduleEntry, "id">[],
  ): Promise<ScheduleEntry[]>;

  createNote(note: Omit<FamilyNote, "id">): Promise<FamilyNote>;
  deleteNote(noteId: string): Promise<void>;

  createPhoto(photo: Omit<Photo, "id">): Promise<Photo>;
  deletePhoto(photoId: string): Promise<void>;

  createVoiceMessage(message: Omit<VoiceMessage, "id">): Promise<VoiceMessage>;
  deleteVoiceMessage(messageId: string): Promise<void>;

  saveAnswerPolicy(policy: AnswerPolicy): Promise<AnswerPolicy>;

  listDeviceTokens(personId: string): Promise<DeviceToken[]>;
  createDeviceToken(personId: string, label: string): Promise<DeviceToken>;
  revokeDeviceToken(token: string): Promise<void>;

  listCalendarSubscriptions(personId: string): Promise<CalendarSubscription[]>;
  createCalendarSubscription(
    subscription: Omit<CalendarSubscription, "id">,
  ): Promise<CalendarSubscription>;
  deleteCalendarSubscription(subscriptionId: string): Promise<void>;
  markCalendarSynced(subscriptionId: string, at: Date): Promise<void>;
}

export interface DeviceAuthReads {
  /** Returns null for unknown or revoked tokens. */
  resolveDeviceToken(token: string): Promise<DeviceToken | null>;
  touchDeviceToken(token: string, at: Date): Promise<void>;
}

export type NoraRepository = RoomReads & FamilyWrites & DeviceAuthReads;
