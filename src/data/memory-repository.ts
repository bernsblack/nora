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
import {
  fixtureAnswerPolicy,
  fixtureCalendarSubscriptions,
  fixtureDeviceTokens,
  fixtureFacility,
  fixtureNotes,
  fixturePerson,
  fixturePhotos,
  fixtureSchedule,
  fixtureVoiceMessages,
} from "./fixtures";
import type { NoraRepository } from "./repository";

/**
 * The repository that runs until a database is provisioned. It is also what the
 * tests run against, so it is not throwaway: every rule the Drizzle
 * implementation enforces has to hold here too, or the tests stop meaning
 * anything.
 *
 * State lives for the life of the process. On Vercel that means a family app
 * edit may not survive to the next request, which is fine for a prototype and
 * is the reason to reach for Neon rather than a reason to add persistence here.
 */
export class InMemoryRepository implements NoraRepository {
  private people = new Map<string, Person>();
  private facilities = new Map<string, Facility>();
  private entries = new Map<string, ScheduleEntry>();
  private notes = new Map<string, FamilyNote>();
  private photos = new Map<string, Photo>();
  private voiceMessages = new Map<string, VoiceMessage>();
  private policies = new Map<string, AnswerPolicy>();
  private tokens = new Map<string, DeviceToken>();
  private calendars = new Map<string, CalendarSubscription>();
  private sequence = 0;

  constructor(seedAt: Date = new Date()) {
    this.facilities.set(fixtureFacility().id, fixtureFacility());
    this.people.set(fixturePerson().id, fixturePerson());
    for (const entry of fixtureSchedule(seedAt)) this.entries.set(entry.id, entry);
    for (const note of fixtureNotes()) this.notes.set(note.id, note);
    for (const photo of fixturePhotos()) this.photos.set(photo.id, photo);
    for (const message of fixtureVoiceMessages(seedAt)) {
      this.voiceMessages.set(message.id, message);
    }
    const policy = fixtureAnswerPolicy();
    this.policies.set(policy.personId, policy);
    for (const token of fixtureDeviceTokens(seedAt)) this.tokens.set(token.token, token);
    for (const calendar of fixtureCalendarSubscriptions()) {
      this.calendars.set(calendar.id, calendar);
    }
  }

  private nextId(prefix: string): string {
    this.sequence += 1;
    return `${prefix}-${this.sequence}`;
  }

  /* RoomReads */

  async getPerson(personId: string): Promise<Person | null> {
    return this.people.get(personId) ?? null;
  }

  async getFacility(facilityId: string): Promise<Facility | null> {
    return this.facilities.get(facilityId) ?? null;
  }

  async listScheduleEntries(personId: string, from: Date, to: Date): Promise<ScheduleEntry[]> {
    return [...this.entries.values()]
      .filter(
        (entry) =>
          entry.personId === personId &&
          entry.startsAt.getTime() >= from.getTime() &&
          entry.startsAt.getTime() < to.getTime(),
      )
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  }

  async listNotes(personId: string): Promise<FamilyNote[]> {
    return [...this.notes.values()]
      .filter((note) => note.personId === personId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async listPhotos(personId: string): Promise<Photo[]> {
    return [...this.photos.values()]
      .filter((photo) => photo.personId === personId)
      .sort((a, b) => a.order - b.order);
  }

  async listVoiceMessages(personId: string): Promise<VoiceMessage[]> {
    return [...this.voiceMessages.values()]
      .filter((message) => message.personId === personId)
      .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
  }

  async getAnswerPolicy(personId: string): Promise<AnswerPolicy | null> {
    return this.policies.get(personId) ?? null;
  }

  async loadRoomData(personId: string, now: Date): Promise<RoomData | null> {
    const person = await this.getPerson(personId);
    if (!person) return null;
    const facility = await this.getFacility(person.facilityId);
    if (!facility) return null;

    const from = new Date(now.getTime() - DAY_MS);
    const to = new Date(now.getTime() + DAY_MS);
    return {
      person,
      facility,
      entries: await this.listScheduleEntries(personId, from, to),
      notes: await this.listNotes(personId),
      photos: await this.listPhotos(personId),
    };
  }

  /* FamilyWrites */

  async listPeople(): Promise<Person[]> {
    return [...this.people.values()];
  }

  async updatePerson(personId: string, patch: Partial<Omit<Person, "id">>): Promise<Person> {
    const person = this.people.get(personId);
    if (!person) throw new Error(`No such person: ${personId}`);
    const updated: Person = { ...person, ...patch, id: person.id };
    // primaryLanguage must always be one we listen for.
    if (!updated.languages.includes(updated.primaryLanguage)) {
      updated.languages = [updated.primaryLanguage, ...updated.languages];
    }
    this.people.set(personId, updated);
    return updated;
  }

  async createScheduleEntry(entry: Omit<ScheduleEntry, "id">): Promise<ScheduleEntry> {
    const created: ScheduleEntry = { ...entry, id: this.nextId("entry") };
    this.entries.set(created.id, created);
    return created;
  }

  async deleteScheduleEntry(entryId: string): Promise<void> {
    this.entries.delete(entryId);
  }

  async replaceCalendarEntries(
    personId: string,
    entries: Omit<ScheduleEntry, "id">[],
  ): Promise<ScheduleEntry[]> {
    for (const [id, entry] of this.entries) {
      if (entry.personId === personId && entry.source === "calendar") this.entries.delete(id);
    }
    const created: ScheduleEntry[] = [];
    for (const entry of entries) {
      created.push(await this.createScheduleEntry({ ...entry, source: "calendar" }));
    }
    return created;
  }

  async createNote(note: Omit<FamilyNote, "id">): Promise<FamilyNote> {
    const created: FamilyNote = { ...note, id: this.nextId("note") };
    this.notes.set(created.id, created);
    return created;
  }

  async deleteNote(noteId: string): Promise<void> {
    this.notes.delete(noteId);
  }

  async createPhoto(photo: Omit<Photo, "id">): Promise<Photo> {
    const created: Photo = { ...photo, id: this.nextId("photo") };
    this.photos.set(created.id, created);
    return created;
  }

  async deletePhoto(photoId: string): Promise<void> {
    this.photos.delete(photoId);
  }

  async createVoiceMessage(message: Omit<VoiceMessage, "id">): Promise<VoiceMessage> {
    const created: VoiceMessage = { ...message, id: this.nextId("voice") };
    this.voiceMessages.set(created.id, created);
    return created;
  }

  async deleteVoiceMessage(messageId: string): Promise<void> {
    this.voiceMessages.delete(messageId);
  }

  async saveAnswerPolicy(policy: AnswerPolicy): Promise<AnswerPolicy> {
    this.policies.set(policy.personId, policy);
    return policy;
  }

  async listDeviceTokens(personId: string): Promise<DeviceToken[]> {
    return [...this.tokens.values()].filter((token) => token.personId === personId);
  }

  async createDeviceToken(personId: string, label: string): Promise<DeviceToken> {
    const token: DeviceToken = {
      token: this.nextId("token"),
      personId,
      label,
      createdAt: new Date(),
    };
    this.tokens.set(token.token, token);
    return token;
  }

  async revokeDeviceToken(token: string): Promise<void> {
    const existing = this.tokens.get(token);
    if (existing) this.tokens.set(token, { ...existing, revokedAt: new Date() });
  }

  async listCalendarSubscriptions(personId: string): Promise<CalendarSubscription[]> {
    return [...this.calendars.values()].filter(
      (calendar) => calendar.personId === personId,
    );
  }

  async createCalendarSubscription(
    subscription: Omit<CalendarSubscription, "id">,
  ): Promise<CalendarSubscription> {
    const created: CalendarSubscription = { ...subscription, id: this.nextId("calendar") };
    this.calendars.set(created.id, created);
    return created;
  }

  async deleteCalendarSubscription(subscriptionId: string): Promise<void> {
    this.calendars.delete(subscriptionId);
  }

  async markCalendarSynced(subscriptionId: string, at: Date): Promise<void> {
    const calendar = this.calendars.get(subscriptionId);
    if (calendar) this.calendars.set(subscriptionId, { ...calendar, lastSyncedAt: at });
  }

  /* DeviceAuthReads */

  async resolveDeviceToken(token: string): Promise<DeviceToken | null> {
    const found = this.tokens.get(token);
    if (!found || found.revokedAt) return null;
    return found;
  }

  async touchDeviceToken(token: string, at: Date): Promise<void> {
    const found = this.tokens.get(token);
    if (found) this.tokens.set(token, { ...found, lastSeenAt: at });
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;
