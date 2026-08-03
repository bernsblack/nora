import { and, asc, eq, gte, isNull, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { neon } from "@neondatabase/serverless";
import type { RoomData } from "@/domain/room-view";
import type {
  AnswerPolicy,
  CalendarSubscription,
  DeviceToken,
  Facility,
  FamilyNote,
  Language,
  LocalizedText,
  Person,
  Photo,
  ScheduleEntry,
  SensitiveTopic,
  VoiceMessage,
} from "@/domain/types";
import type { NoraRepository } from "../repository";
import * as schema from "./schema";

/**
 * Postgres implementation, for Neon.
 *
 * Exercised by `src/data/repository.contract.test.ts`, which runs one suite
 * against this class and the in memory one and requires the same answers from
 * both. That test needs a Postgres to talk to and skips itself without one, so
 * read its header before trusting a green run.
 *
 * The database is typed as any Drizzle Postgres database rather than as Neon's
 * specifically. Production builds it over Neon's HTTP driver via `fromUrl`; the
 * contract test builds it over node-postgres against a local server, because
 * Neon's HTTP driver only talks to Neon. The SQL Drizzle emits is identical, so
 * what the test covers is every query, every row to domain conversion and every
 * ordering in this file, which is where the substance is. What it does not
 * cover is the transport, and that difference is why `fromUrl` stays thin
 * enough to read in one line.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

function localized(value: unknown): LocalizedText {
  return (value ?? {}) as LocalizedText;
}

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export class DrizzleRepository implements NoraRepository {
  constructor(private db: Database) {}

  static fromUrl(databaseUrl: string): DrizzleRepository {
    return new DrizzleRepository(drizzle(neon(databaseUrl), { schema }));
  }

  /* RoomReads */

  async getPerson(personId: string): Promise<Person | null> {
    const [row] = await this.db
      .select()
      .from(schema.people)
      .where(eq(schema.people.id, personId))
      .limit(1);
    if (!row) return null;
    return {
      id: row.id,
      facilityId: row.facilityId,
      preferredName: row.preferredName,
      roomLabel: row.roomLabel,
      voiceName: row.voiceName,
      primaryLanguage: row.primaryLanguage as Language,
      languages: row.languages as Language[],
      simplicity: row.simplicity,
      micEnabled: row.micEnabled,
    };
  }

  async getFacility(facilityId: string): Promise<Facility | null> {
    const [row] = await this.db
      .select()
      .from(schema.facilities)
      .where(eq(schema.facilities.id, facilityId))
      .limit(1);
    return row ?? null;
  }

  async listScheduleEntries(personId: string, from: Date, to: Date): Promise<ScheduleEntry[]> {
    const rows = await this.db
      .select()
      .from(schema.scheduleEntries)
      .where(
        and(
          eq(schema.scheduleEntries.personId, personId),
          gte(schema.scheduleEntries.startsAt, from),
          lt(schema.scheduleEntries.startsAt, to),
        ),
      )
      .orderBy(asc(schema.scheduleEntries.startsAt));

    return rows.map((row) => ({
      id: row.id,
      personId: row.personId,
      title: localized(row.title),
      startsAt: row.startsAt,
      endsAt: row.endsAt ?? undefined,
      kind: row.kind,
      source: row.source,
      visitorName: row.visitorName ?? undefined,
    }));
  }

  async listNotes(personId: string): Promise<FamilyNote[]> {
    const rows = await this.db
      .select()
      .from(schema.familyNotes)
      .where(eq(schema.familyNotes.personId, personId));
    return rows
      .map((row) => ({
        id: row.id,
        personId: row.personId,
        text: localized(row.text),
        createdAt: row.createdAt,
        expiresAt: row.expiresAt ?? undefined,
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async listPhotos(personId: string): Promise<Photo[]> {
    const rows = await this.db
      .select()
      .from(schema.photos)
      .where(eq(schema.photos.personId, personId))
      .orderBy(asc(schema.photos.order));
    return rows.map((row) => ({
      id: row.id,
      personId: row.personId,
      url: row.url,
      name: row.name,
      relationship: localized(row.relationship),
      order: row.order,
    }));
  }

  async listVoiceMessages(personId: string): Promise<VoiceMessage[]> {
    const rows = await this.db
      .select()
      .from(schema.voiceMessages)
      .where(eq(schema.voiceMessages.personId, personId));
    return rows
      .map((row) => ({
        id: row.id,
        personId: row.personId,
        fromName: row.fromName,
        audioUrl: row.audioUrl,
        recordedAt: row.recordedAt,
        transcript: row.transcript ? localized(row.transcript) : undefined,
      }))
      .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
  }

  async getAnswerPolicy(personId: string): Promise<AnswerPolicy | null> {
    const [policy] = await this.db
      .select()
      .from(schema.answerPolicies)
      .where(eq(schema.answerPolicies.personId, personId))
      .limit(1);
    if (!policy) return null;

    const topicRows = await this.db
      .select()
      .from(schema.sensitiveTopics)
      .where(eq(schema.sensitiveTopics.personId, personId));

    const topics: SensitiveTopic[] = topicRows.map((row) => ({
      id: row.id,
      personId: row.personId,
      subjectName: row.subjectName,
      relationship: localized(row.relationship),
      situation: row.situation,
      mode: row.mode ?? undefined,
      familyWording: row.familyWording ? localized(row.familyWording) : undefined,
    }));

    return { personId, defaultMode: policy.defaultMode, topics };
  }

  async loadRoomData(personId: string, now: Date): Promise<RoomData | null> {
    const person = await this.getPerson(personId);
    if (!person) return null;
    const facility = await this.getFacility(person.facilityId);
    if (!facility) return null;
    const [entries, notes, photos] = await Promise.all([
      this.listScheduleEntries(
        personId,
        new Date(now.getTime() - DAY_MS),
        new Date(now.getTime() + DAY_MS),
      ),
      this.listNotes(personId),
      this.listPhotos(personId),
    ]);
    return { person, facility, entries, notes, photos };
  }

  /* FamilyWrites */

  async listPeople(): Promise<Person[]> {
    const rows = await this.db.select({ id: schema.people.id }).from(schema.people);
    const people = await Promise.all(rows.map((row) => this.getPerson(row.id)));
    return people.filter((person): person is Person => person !== null);
  }

  async updatePerson(personId: string, patch: Partial<Omit<Person, "id">>): Promise<Person> {
    const languages =
      patch.languages && patch.primaryLanguage && !patch.languages.includes(patch.primaryLanguage)
        ? [patch.primaryLanguage, ...patch.languages]
        : patch.languages;
    await this.db
      .update(schema.people)
      .set({ ...patch, languages })
      .where(eq(schema.people.id, personId));
    const updated = await this.getPerson(personId);
    if (!updated) throw new Error(`No such person: ${personId}`);
    return updated;
  }

  async createScheduleEntry(entry: Omit<ScheduleEntry, "id">): Promise<ScheduleEntry> {
    const id = newId("entry");
    await this.db.insert(schema.scheduleEntries).values({
      id,
      personId: entry.personId,
      title: entry.title,
      startsAt: entry.startsAt,
      endsAt: entry.endsAt ?? null,
      kind: entry.kind,
      source: entry.source,
      visitorName: entry.visitorName ?? null,
    });
    return { ...entry, id };
  }

  async deleteScheduleEntry(entryId: string): Promise<void> {
    await this.db.delete(schema.scheduleEntries).where(eq(schema.scheduleEntries.id, entryId));
  }

  async replaceCalendarEntries(
    personId: string,
    entries: Omit<ScheduleEntry, "id">[],
  ): Promise<ScheduleEntry[]> {
    await this.db
      .delete(schema.scheduleEntries)
      .where(
        and(
          eq(schema.scheduleEntries.personId, personId),
          eq(schema.scheduleEntries.source, "calendar"),
        ),
      );
    const created: ScheduleEntry[] = [];
    for (const entry of entries) {
      created.push(await this.createScheduleEntry({ ...entry, source: "calendar" }));
    }
    return created;
  }

  async createNote(note: Omit<FamilyNote, "id">): Promise<FamilyNote> {
    const id = newId("note");
    await this.db.insert(schema.familyNotes).values({
      id,
      personId: note.personId,
      text: note.text,
      createdAt: note.createdAt,
      expiresAt: note.expiresAt ?? null,
    });
    return { ...note, id };
  }

  async deleteNote(noteId: string): Promise<void> {
    await this.db.delete(schema.familyNotes).where(eq(schema.familyNotes.id, noteId));
  }

  async createPhoto(photo: Omit<Photo, "id">): Promise<Photo> {
    const id = newId("photo");
    await this.db.insert(schema.photos).values({ ...photo, id });
    return { ...photo, id };
  }

  async deletePhoto(photoId: string): Promise<void> {
    await this.db.delete(schema.photos).where(eq(schema.photos.id, photoId));
  }

  async createVoiceMessage(message: Omit<VoiceMessage, "id">): Promise<VoiceMessage> {
    const id = newId("voice");
    await this.db.insert(schema.voiceMessages).values({
      id,
      personId: message.personId,
      fromName: message.fromName,
      audioUrl: message.audioUrl,
      recordedAt: message.recordedAt,
      transcript: message.transcript ?? null,
    });
    return { ...message, id };
  }

  async deleteVoiceMessage(messageId: string): Promise<void> {
    await this.db.delete(schema.voiceMessages).where(eq(schema.voiceMessages.id, messageId));
  }

  async saveAnswerPolicy(policy: AnswerPolicy): Promise<AnswerPolicy> {
    await this.db
      .insert(schema.answerPolicies)
      .values({ personId: policy.personId, defaultMode: policy.defaultMode })
      .onConflictDoUpdate({
        target: schema.answerPolicies.personId,
        set: { defaultMode: policy.defaultMode },
      });

    await this.db
      .delete(schema.sensitiveTopics)
      .where(eq(schema.sensitiveTopics.personId, policy.personId));

    for (const topic of policy.topics) {
      await this.db.insert(schema.sensitiveTopics).values({
        id: topic.id || newId("topic"),
        personId: policy.personId,
        subjectName: topic.subjectName,
        relationship: topic.relationship,
        situation: topic.situation,
        mode: topic.mode ?? null,
        familyWording: topic.familyWording ?? null,
      });
    }
    return policy;
  }

  async listDeviceTokens(personId: string): Promise<DeviceToken[]> {
    const rows = await this.db
      .select()
      .from(schema.deviceTokens)
      .where(eq(schema.deviceTokens.personId, personId));
    return rows.map((row) => ({
      token: row.token,
      personId: row.personId,
      label: row.label,
      createdAt: row.createdAt,
      lastSeenAt: row.lastSeenAt ?? undefined,
      revokedAt: row.revokedAt ?? undefined,
    }));
  }

  async createDeviceToken(personId: string, label: string): Promise<DeviceToken> {
    const token: DeviceToken = {
      token: newId("token"),
      personId,
      label,
      createdAt: new Date(),
    };
    await this.db.insert(schema.deviceTokens).values({
      token: token.token,
      personId,
      label,
      createdAt: token.createdAt,
    });
    return token;
  }

  async revokeDeviceToken(token: string): Promise<void> {
    await this.db
      .update(schema.deviceTokens)
      .set({ revokedAt: new Date() })
      .where(eq(schema.deviceTokens.token, token));
  }

  async listCalendarSubscriptions(personId: string): Promise<CalendarSubscription[]> {
    const rows = await this.db
      .select()
      .from(schema.calendarSubscriptions)
      .where(eq(schema.calendarSubscriptions.personId, personId));
    return rows.map((row) => ({
      id: row.id,
      personId: row.personId,
      url: row.url,
      label: row.label,
      language: row.language as Language,
      lastSyncedAt: row.lastSyncedAt ?? undefined,
    }));
  }

  async createCalendarSubscription(
    subscription: Omit<CalendarSubscription, "id">,
  ): Promise<CalendarSubscription> {
    const id = newId("calendar");
    await this.db.insert(schema.calendarSubscriptions).values({
      id,
      personId: subscription.personId,
      url: subscription.url,
      label: subscription.label,
      language: subscription.language,
      lastSyncedAt: subscription.lastSyncedAt ?? null,
    });
    return { ...subscription, id };
  }

  async deleteCalendarSubscription(subscriptionId: string): Promise<void> {
    await this.db
      .delete(schema.calendarSubscriptions)
      .where(eq(schema.calendarSubscriptions.id, subscriptionId));
  }

  async markCalendarSynced(subscriptionId: string, at: Date): Promise<void> {
    await this.db
      .update(schema.calendarSubscriptions)
      .set({ lastSyncedAt: at })
      .where(eq(schema.calendarSubscriptions.id, subscriptionId));
  }

  /* DeviceAuthReads */

  async resolveDeviceToken(token: string): Promise<DeviceToken | null> {
    const [row] = await this.db
      .select()
      .from(schema.deviceTokens)
      .where(
        and(eq(schema.deviceTokens.token, token), isNull(schema.deviceTokens.revokedAt)),
      )
      .limit(1);
    if (!row) return null;
    return {
      token: row.token,
      personId: row.personId,
      label: row.label,
      createdAt: row.createdAt,
      lastSeenAt: row.lastSeenAt ?? undefined,
      revokedAt: row.revokedAt ?? undefined,
    };
  }

  async touchDeviceToken(token: string, at: Date): Promise<void> {
    await this.db
      .update(schema.deviceTokens)
      .set({ lastSeenAt: at })
      .where(eq(schema.deviceTokens.token, token));
  }
}
