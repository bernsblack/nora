import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { DrizzleRepository, type Database } from "./drizzle/repository";
import * as schema from "./drizzle/schema";
import {
  FIXTURE_DEVICE_TOKEN,
  FIXTURE_PERSON_ID,
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
import { InMemoryRepository } from "./memory-repository";
import type { NoraRepository } from "./repository";

/**
 * One suite, two implementations, and they have to agree.
 *
 * Everything in this repo is tested against the in memory repository, so the
 * Postgres one could have drifted arbitrarily far without a single test going
 * red. It had in fact never executed at all: 446 lines, 29 methods and 10
 * tables, written when the shape was settled and never run. A comment in it
 * pointed at this file as the thing that would eventually cover it, and this
 * file did not exist.
 *
 * The Postgres half is skipped without TEST_DATABASE_URL, which means a green
 * `pnpm run check` on a laptop with no database says nothing about it. That is
 * a real gap and it is stated rather than hidden: the suite prints a skip
 * reason, and CI is where it must be wired to a branch database.
 *
 *   docker run -d --name nora-pg -e POSTGRES_PASSWORD=nora -e POSTGRES_USER=nora \
 *     -e POSTGRES_DB=nora_test -p 55432:5432 postgres:16-alpine
 *   docker exec -i nora-pg psql -U nora -d nora_test < drizzle/0000_*.sql
 *   TEST_DATABASE_URL=postgres://nora:nora@127.0.0.1:55432/nora_test pnpm exec vitest run contract
 */

/** Fixed so schedule fixtures land in a known place either side of it. */
const SEED_AT = new Date("2026-08-04T12:00:00Z");

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

/* Seeding the Postgres side with exactly what InMemoryRepository's constructor
 * puts in place. If these two drift the comparison stops meaning anything, so
 * this mirrors that constructor deliberately rather than inventing a fixture. */
async function seed(db: Database): Promise<void> {
  await db.execute(
    sql`TRUNCATE TABLE facilities, people, schedule_entries, family_notes, photos, voice_messages, answer_policies, sensitive_topics, device_tokens, calendar_subscriptions RESTART IDENTITY CASCADE`,
  );

  const facility = fixtureFacility();
  const person = fixturePerson();
  await db.insert(schema.facilities).values(facility);
  await db.insert(schema.people).values({
    id: person.id,
    facilityId: person.facilityId,
    preferredName: person.preferredName,
    roomLabel: person.roomLabel,
    voiceName: person.voiceName,
    primaryLanguage: person.primaryLanguage,
    languages: person.languages,
    simplicity: person.simplicity,
    micEnabled: person.micEnabled,
  });

  for (const entry of fixtureSchedule(SEED_AT)) {
    await db.insert(schema.scheduleEntries).values({
      id: entry.id,
      personId: entry.personId,
      title: entry.title,
      startsAt: entry.startsAt,
      endsAt: entry.endsAt ?? null,
      kind: entry.kind,
      source: entry.source,
      visitorName: entry.visitorName ?? null,
    });
  }

  for (const note of fixtureNotes()) {
    await db.insert(schema.familyNotes).values({
      id: note.id,
      personId: note.personId,
      text: note.text,
      createdAt: note.createdAt,
      expiresAt: note.expiresAt ?? null,
    });
  }

  for (const photo of fixturePhotos()) {
    await db.insert(schema.photos).values({
      id: photo.id,
      personId: photo.personId,
      url: photo.url,
      name: photo.name,
      relationship: photo.relationship,
      order: photo.order,
    });
  }

  for (const message of fixtureVoiceMessages(SEED_AT)) {
    await db.insert(schema.voiceMessages).values({
      id: message.id,
      personId: message.personId,
      fromName: message.fromName,
      audioUrl: message.audioUrl,
      recordedAt: message.recordedAt,
      transcript: message.transcript ?? null,
    });
  }

  const policy = fixtureAnswerPolicy();
  await db
    .insert(schema.answerPolicies)
    .values({ personId: policy.personId, defaultMode: policy.defaultMode });
  for (const topic of policy.topics) {
    await db.insert(schema.sensitiveTopics).values({
      id: topic.id,
      personId: topic.personId,
      subjectName: topic.subjectName,
      relationship: topic.relationship,
      situation: topic.situation,
      mode: topic.mode ?? null,
      familyWording: topic.familyWording ?? null,
    });
  }

  for (const token of fixtureDeviceTokens(SEED_AT)) {
    await db.insert(schema.deviceTokens).values({
      token: token.token,
      personId: token.personId,
      label: token.label,
      createdAt: token.createdAt,
      lastSeenAt: token.lastSeenAt ?? null,
      revokedAt: token.revokedAt ?? null,
    });
  }

  for (const calendar of fixtureCalendarSubscriptions()) {
    await db.insert(schema.calendarSubscriptions).values({
      id: calendar.id,
      personId: calendar.personId,
      url: calendar.url,
      label: calendar.label,
      language: calendar.language,
      lastSyncedAt: calendar.lastSyncedAt ?? null,
    });
  }
}

/**
 * The suite. Every assertion here has to hold for any implementation of
 * NoraRepository, which is what makes it a contract rather than a unit test.
 */
function contract(make: () => Promise<NoraRepository>): void {
  let repository: NoraRepository;

  beforeEach(async () => {
    repository = await make();
  });

  describe("what the room screen reads", () => {
    it("finds the person and their facility", async () => {
      const person = await repository.getPerson(FIXTURE_PERSON_ID);
      expect(person?.id).toBe(FIXTURE_PERSON_ID);
      // Assert it is an array before asserting what is in it. Postgres enum
      // arrays are one of the few places the two drivers can genuinely differ,
      // and a raw "{af,en}" string would satisfy both `.length > 0` and
      // `toContain`, since toContain on a string is a substring check. This is
      // the assertion meant to catch exactly that.
      expect(Array.isArray(person?.languages)).toBe(true);
      expect(person?.languages.length).toBeGreaterThan(0);
      // Always contains the primary language, which the room screen relies on
      // when it picks which language to render.
      expect(person?.languages).toEqual(
        expect.arrayContaining([person?.primaryLanguage]),
      );

      const facility = await repository.getFacility(person!.facilityId);
      expect(facility?.timezone).toBe(fixtureFacility().timezone);
    });

    it("returns null rather than throwing for somebody who is not there", async () => {
      expect(await repository.getPerson("person-nobody")).toBeNull();
      expect(await repository.getFacility("facility-nowhere")).toBeNull();
    });

    it("returns schedule entries inside the window and none outside it", async () => {
      const from = new Date(SEED_AT.getTime() - 36 * 60 * 60 * 1000);
      const to = new Date(SEED_AT.getTime() + 36 * 60 * 60 * 1000);
      const entries = await repository.listScheduleEntries(FIXTURE_PERSON_ID, from, to);

      expect(entries.length).toBeGreaterThan(0);
      for (const entry of entries) {
        expect(entry.startsAt.getTime()).toBeGreaterThanOrEqual(from.getTime());
        expect(entry.startsAt.getTime()).toBeLessThan(to.getTime());
      }
    });

    it("returns schedule entries in ascending order, which the next thing depends on", async () => {
      const from = new Date(SEED_AT.getTime() - 36 * 60 * 60 * 1000);
      const to = new Date(SEED_AT.getTime() + 36 * 60 * 60 * 1000);
      const entries = await repository.listScheduleEntries(FIXTURE_PERSON_ID, from, to);
      const times = entries.map((entry) => entry.startsAt.getTime());
      expect(times).toEqual([...times].sort((a, b) => a - b));
    });

    it("returns an empty window as an empty list rather than an error", async () => {
      const far = new Date(SEED_AT.getTime() + 400 * 24 * 60 * 60 * 1000);
      const later = new Date(far.getTime() + 60 * 60 * 1000);
      expect(await repository.listScheduleEntries(FIXTURE_PERSON_ID, far, later)).toEqual([]);
    });

    it("orders photos by the order the family chose", async () => {
      const photos = await repository.listPhotos(FIXTURE_PERSON_ID);
      expect(photos.length).toBeGreaterThan(0);
      const order = photos.map((photo) => photo.order);
      expect(order).toEqual([...order].sort((a, b) => a - b));
      // A face without a name is a quiz (PROJECT.md section 3).
      for (const photo of photos) expect(photo.name.length).toBeGreaterThan(0);
    });

    it("reads notes, voice messages and the answer policy", async () => {
      // The note fixture is deliberately empty, because a note outranks the
      // schedule and would hide it on every screenshot. Notes are covered by
      // the create and delete test below; what matters here is that an empty
      // set comes back as an empty list rather than as null or a throw.
      expect(await repository.listNotes(FIXTURE_PERSON_ID)).toEqual([]);
      expect((await repository.listVoiceMessages(FIXTURE_PERSON_ID)).length).toBeGreaterThan(0);

      const policy = await repository.getAnswerPolicy(FIXTURE_PERSON_ID);
      expect(policy?.defaultMode).toBe(fixtureAnswerPolicy().defaultMode);
      expect(policy?.topics.length).toBe(fixtureAnswerPolicy().topics.length);
    });

    it("loads the whole room in one call", async () => {
      const data = await repository.loadRoomData(FIXTURE_PERSON_ID, SEED_AT);
      expect(data?.person.id).toBe(FIXTURE_PERSON_ID);
      expect(data?.facility.id).toBe(fixtureFacility().id);
      expect(data?.entries.length).toBeGreaterThan(0);
      expect(data?.photos.length).toBeGreaterThan(0);
    });

    it("returns null room data for an unknown person rather than a half built room", async () => {
      expect(await repository.loadRoomData("person-nobody", SEED_AT)).toBeNull();
    });
  });

  describe("the device token, which is the room's only credential", () => {
    it("resolves a live token", async () => {
      const device = await repository.resolveDeviceToken(FIXTURE_DEVICE_TOKEN);
      expect(device?.personId).toBe(FIXTURE_PERSON_ID);
    });

    it("does not resolve a token that was never issued", async () => {
      expect(await repository.resolveDeviceToken("not-a-token")).toBeNull();
    });

    it("stops resolving a revoked token", async () => {
      // The family app's only way to turn a device off. If a revoked token
      // still resolved, a tablet taken out of the room would keep showing a
      // resident's day to whoever had it.
      await repository.revokeDeviceToken(FIXTURE_DEVICE_TOKEN);
      expect(await repository.resolveDeviceToken(FIXTURE_DEVICE_TOKEN)).toBeNull();
    });

    it("records that a device was seen", async () => {
      const at = new Date(SEED_AT.getTime() + 60_000);
      await repository.touchDeviceToken(FIXTURE_DEVICE_TOKEN, at);
      const tokens = await repository.listDeviceTokens(FIXTURE_PERSON_ID);
      const token = tokens.find((candidate) => candidate.token === FIXTURE_DEVICE_TOKEN);
      expect(token?.lastSeenAt?.getTime()).toBe(at.getTime());
    });

    it("issues a new token that then resolves", async () => {
      const created = await repository.createDeviceToken(FIXTURE_PERSON_ID, "the spare tablet");
      expect(created.label).toBe("the spare tablet");
      const resolved = await repository.resolveDeviceToken(created.token);
      expect(resolved?.personId).toBe(FIXTURE_PERSON_ID);
    });

    it("does nothing rather than throwing when touching a token that is gone", async () => {
      await expect(
        repository.touchDeviceToken("not-a-token", SEED_AT),
      ).resolves.toBeUndefined();
    });
  });

  describe("what the family app writes", () => {
    it("lists people", async () => {
      const people = await repository.listPeople();
      expect(people.map((person) => person.id)).toContain(FIXTURE_PERSON_ID);
    });

    it("updates a person and gives back the updated record", async () => {
      const updated = await repository.updatePerson(FIXTURE_PERSON_ID, {
        preferredName: "Mevrou Venter",
        micEnabled: false,
      });
      expect(updated.preferredName).toBe("Mevrou Venter");
      expect(updated.micEnabled).toBe(false);
      // And it is durable, not just returned.
      expect((await repository.getPerson(FIXTURE_PERSON_ID))?.micEnabled).toBe(false);
    });

    it("creates and deletes a schedule entry", async () => {
      const before = await repository.listScheduleEntries(
        FIXTURE_PERSON_ID,
        new Date(SEED_AT.getTime() - 60_000),
        new Date(SEED_AT.getTime() + 3 * 60 * 60 * 1000),
      );
      const created = await repository.createScheduleEntry({
        personId: FIXTURE_PERSON_ID,
        title: { en: "Hairdresser", af: "Haarkapper" },
        startsAt: new Date(SEED_AT.getTime() + 60 * 60 * 1000),
        kind: "care",
        source: "family",
      });
      expect(created.id).toBeTruthy();

      const after = await repository.listScheduleEntries(
        FIXTURE_PERSON_ID,
        new Date(SEED_AT.getTime() - 60_000),
        new Date(SEED_AT.getTime() + 3 * 60 * 60 * 1000),
      );
      expect(after.length).toBe(before.length + 1);
      expect(after.find((entry) => entry.id === created.id)?.title.en).toBe("Hairdresser");

      await repository.deleteScheduleEntry(created.id);
      const afterDelete = await repository.listScheduleEntries(
        FIXTURE_PERSON_ID,
        new Date(SEED_AT.getTime() - 60_000),
        new Date(SEED_AT.getTime() + 3 * 60 * 60 * 1000),
      );
      expect(afterDelete.length).toBe(before.length);
    });

    it("creates and deletes a note", async () => {
      const created = await repository.createNote({
        personId: FIXTURE_PERSON_ID,
        text: { en: "Pa is at work, home tonight", af: "Pa is by die werk" },
        createdAt: SEED_AT,
      });
      expect((await repository.listNotes(FIXTURE_PERSON_ID)).map((n) => n.id)).toContain(
        created.id,
      );
      await repository.deleteNote(created.id);
      expect((await repository.listNotes(FIXTURE_PERSON_ID)).map((n) => n.id)).not.toContain(
        created.id,
      );
    });

    it("creates and deletes a photo", async () => {
      const created = await repository.createPhoto({
        personId: FIXTURE_PERSON_ID,
        url: "https://example.test/anna.jpg",
        name: "Anna",
        relationship: { en: "your daughter", af: "jou dogter" },
        order: 99,
      });
      expect((await repository.listPhotos(FIXTURE_PERSON_ID)).map((p) => p.id)).toContain(
        created.id,
      );
      await repository.deletePhoto(created.id);
      expect((await repository.listPhotos(FIXTURE_PERSON_ID)).map((p) => p.id)).not.toContain(
        created.id,
      );
    });

    it("creates and deletes a voice message", async () => {
      const created = await repository.createVoiceMessage({
        personId: FIXTURE_PERSON_ID,
        fromName: "Pieter",
        audioUrl: "https://example.test/pieter.webm",
        recordedAt: SEED_AT,
      });
      expect((await repository.listVoiceMessages(FIXTURE_PERSON_ID)).map((m) => m.id)).toContain(
        created.id,
      );
      await repository.deleteVoiceMessage(created.id);
      expect(
        (await repository.listVoiceMessages(FIXTURE_PERSON_ID)).map((m) => m.id),
      ).not.toContain(created.id);
    });

    it("saves the answer policy, topics and all", async () => {
      // The highest risk record in the product. What comes back has to be what
      // went in, because domain/answer-policy reads it verbatim.
      const saved = await repository.saveAnswerPolicy({
        personId: FIXTURE_PERSON_ID,
        defaultMode: "truthful",
        topics: [
          {
            id: "topic-jan",
            personId: FIXTURE_PERSON_ID,
            subjectName: "Jan",
            relationship: { en: "your husband", af: "jou man" },
            situation: "deceased",
            mode: "validation",
            familyWording: { en: "He is not here right now.", af: "Hy is nie nou hier nie." },
          },
        ],
      });
      expect(saved.defaultMode).toBe("truthful");

      const read = await repository.getAnswerPolicy(FIXTURE_PERSON_ID);
      expect(read?.defaultMode).toBe("truthful");
      expect(read?.topics.length).toBe(1);
      expect(read?.topics[0].subjectName).toBe("Jan");
      expect(read?.topics[0].familyWording?.af).toBe("Hy is nie nou hier nie.");
      expect(read?.topics[0].mode).toBe("validation");
    });

    it("replaces the topic list rather than appending to it", async () => {
      // Removing a topic in the family app has to actually remove it. A topic
      // that survived a save would keep answering about somebody the family
      // deliberately stopped configuring.
      await repository.saveAnswerPolicy({
        personId: FIXTURE_PERSON_ID,
        defaultMode: "gentle-redirection",
        topics: [],
      });
      const read = await repository.getAnswerPolicy(FIXTURE_PERSON_ID);
      expect(read?.topics).toEqual([]);
    });
  });

  describe("calendar subscriptions", () => {
    it("creates, lists, marks synced and deletes", async () => {
      const created = await repository.createCalendarSubscription({
        personId: FIXTURE_PERSON_ID,
        url: "https://example.test/facility.ics",
        label: "Facility calendar",
        language: "af",
      });
      expect((await repository.listCalendarSubscriptions(FIXTURE_PERSON_ID)).map((c) => c.id)).toContain(
        created.id,
      );

      const syncedAt = new Date(SEED_AT.getTime() + 5 * 60_000);
      await repository.markCalendarSynced(created.id, syncedAt);
      const after = await repository.listCalendarSubscriptions(FIXTURE_PERSON_ID);
      expect(after.find((c) => c.id === created.id)?.lastSyncedAt?.getTime()).toBe(
        syncedAt.getTime(),
      );

      await repository.deleteCalendarSubscription(created.id);
      expect(
        (await repository.listCalendarSubscriptions(FIXTURE_PERSON_ID)).map((c) => c.id),
      ).not.toContain(created.id);
    });

    it("replaces calendar entries without touching family entries", async () => {
      // The facility owns its calendar and a resync overwrites it. What the
      // family typed in is theirs and a resync must never delete it.
      const family = await repository.createScheduleEntry({
        personId: FIXTURE_PERSON_ID,
        title: { en: "Anna visiting", af: "Anna kuier" },
        startsAt: new Date(SEED_AT.getTime() + 2 * 60 * 60 * 1000),
        kind: "visit",
        source: "family",
        visitorName: "Anna",
      });

      await repository.replaceCalendarEntries(FIXTURE_PERSON_ID, [
        {
          personId: FIXTURE_PERSON_ID,
          title: { en: "Physio", af: "Fisio" },
          startsAt: new Date(SEED_AT.getTime() + 3 * 60 * 60 * 1000),
          kind: "care",
          source: "calendar",
        },
      ]);

      const entries = await repository.listScheduleEntries(
        FIXTURE_PERSON_ID,
        new Date(SEED_AT.getTime() - 60_000),
        new Date(SEED_AT.getTime() + 6 * 60 * 60 * 1000),
      );
      expect(entries.map((entry) => entry.id)).toContain(family.id);
      expect(entries.filter((entry) => entry.source === "calendar").length).toBe(1);
      expect(entries.find((entry) => entry.source === "calendar")?.title.en).toBe("Physio");
    });
  });
}

describe("InMemoryRepository", () => {
  contract(async () => new InMemoryRepository(SEED_AT));
});

describe.skipIf(!TEST_DATABASE_URL)("DrizzleRepository, against real Postgres", () => {
  const pool = new Pool({ connectionString: TEST_DATABASE_URL });
  const db = drizzle(pool, { schema }) as unknown as Database;

  afterAll(async () => {
    await pool.end();
  });

  contract(async () => {
    await seed(db);
    return new DrizzleRepository(db);
  });
});
