import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  ANSWER_POLICY_MODES,
  LANGUAGES,
  SCHEDULE_KINDS,
  SCHEDULE_SOURCES,
  SIMPLICITY_LEVELS,
  TOPIC_SITUATIONS,
} from "@/domain/types";

/**
 * Postgres schema. Enum values are the same kebab-case strings the domain uses,
 * so a status never needs translating between layers.
 *
 * Localised text is jsonb keyed by language rather than a column per language,
 * because four more languages follow and a migration per language is the wrong
 * shape.
 */

export const languageEnum = pgEnum("language", LANGUAGES);
export const simplicityEnum = pgEnum("simplicity_level", SIMPLICITY_LEVELS);
export const answerPolicyModeEnum = pgEnum("answer_policy_mode", ANSWER_POLICY_MODES);
export const topicSituationEnum = pgEnum("topic_situation", TOPIC_SITUATIONS);
export const scheduleKindEnum = pgEnum("schedule_kind", SCHEDULE_KINDS);
export const scheduleSourceEnum = pgEnum("schedule_source", SCHEDULE_SOURCES);

export const facilities = pgTable("facilities", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  /** IANA zone. Every rendered time is derived in it. */
  timezone: text("timezone").notNull(),
});

export const people = pgTable("people", {
  id: text("id").primaryKey(),
  facilityId: text("facility_id")
    .notNull()
    .references(() => facilities.id),
  preferredName: text("preferred_name").notNull(),
  roomLabel: text("room_label").notNull(),
  voiceName: text("voice_name").notNull(),
  primaryLanguage: languageEnum("primary_language").notNull(),
  /** Every language we listen for. Always contains primary_language. */
  languages: languageEnum("languages").array().notNull(),
  simplicity: simplicityEnum("simplicity").notNull(),
  /** The family controlled microphone switch. Off means no microphone opens. */
  micEnabled: boolean("mic_enabled").notNull().default(true),
});

export const scheduleEntries = pgTable("schedule_entries", {
  id: text("id").primaryKey(),
  personId: text("person_id")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  title: jsonb("title").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  kind: scheduleKindEnum("kind").notNull(),
  source: scheduleSourceEnum("source").notNull(),
  visitorName: text("visitor_name"),
  /**
   * UID from the source calendar, so a resync can match an entry it has seen
   * before instead of duplicating it.
   */
  externalUid: text("external_uid"),
});

export const familyNotes = pgTable("family_notes", {
  id: text("id").primaryKey(),
  personId: text("person_id")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  text: jsonb("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const photos = pgTable("photos", {
  id: text("id").primaryKey(),
  personId: text("person_id")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  /** Written under the face, always. Not nullable by design. */
  name: text("name").notNull(),
  relationship: jsonb("relationship").notNull(),
  order: integer("display_order").notNull().default(0),
});

export const voiceMessages = pgTable("voice_messages", {
  id: text("id").primaryKey(),
  personId: text("person_id")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  fromName: text("from_name").notNull(),
  /**
   * Family recorded audio, uploaded from the family app. Nothing captured in
   * the room is ever written here, or anywhere. See PROJECT.md section 5.
   */
  audioUrl: text("audio_url").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
  transcript: jsonb("transcript"),
});

export const answerPolicies = pgTable("answer_policies", {
  personId: text("person_id")
    .primaryKey()
    .references(() => people.id, { onDelete: "cascade" }),
  /** No database default. The family chooses this explicitly at setup. */
  defaultMode: answerPolicyModeEnum("default_mode").notNull(),
});

export const sensitiveTopics = pgTable("sensitive_topics", {
  id: text("id").primaryKey(),
  personId: text("person_id")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  subjectName: text("subject_name").notNull(),
  relationship: jsonb("relationship").notNull(),
  situation: topicSituationEnum("situation").notNull(),
  mode: answerPolicyModeEnum("mode"),
  familyWording: jsonb("family_wording"),
});

export const deviceTokens = pgTable(
  "device_tokens",
  {
    token: text("token").primaryKey(),
    personId: text("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("device_tokens_token_key").on(table.token)],
);

export const calendarSubscriptions = pgTable("calendar_subscriptions", {
  id: text("id").primaryKey(),
  personId: text("person_id")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  label: text("label").notNull(),
  language: languageEnum("language").notNull(),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
});
