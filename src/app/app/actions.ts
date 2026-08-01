"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRepository } from "@/data";
import { validateFamilyWording } from "@/domain/answer-policy/wording";
import {
  ANSWER_POLICY_MODES,
  LANGUAGES,
  SCHEDULE_KINDS,
  SIMPLICITY_LEVELS,
  TOPIC_SITUATIONS,
  type LocalizedText,
} from "@/domain/types";
import { getFamilyAuth } from "@/services/family-auth";
import { defaultCalendarFetcher, syncCalendars } from "@/services/calendar-sync";

/**
 * Everything the family app writes. Each action checks that the signed in user
 * may touch this person before it does anything, because the room device reads
 * whatever is here and cannot tell a mistake from an instruction.
 */

async function assertAccess(personId: string): Promise<void> {
  const allowed = await getFamilyAuth().canAccess(personId);
  if (!allowed) throw new Error("Not your person");
}

function refresh(personId: string): void {
  revalidatePath(`/app/${personId}`);
  revalidatePath("/room");
}

function localized(af: string | undefined, en: string | undefined): LocalizedText {
  const text: LocalizedText = {};
  if (af?.trim()) text.af = af.trim();
  if (en?.trim()) text.en = en.trim();
  return text;
}

const personSchema = z.object({
  personId: z.string().min(1),
  preferredName: z.string().min(1),
  roomLabel: z.string().min(1),
  voiceName: z.string().min(1),
  primaryLanguage: z.enum(LANGUAGES),
  simplicity: z.enum(SIMPLICITY_LEVELS),
  micEnabled: z.boolean(),
});

export async function savePerson(formData: FormData): Promise<void> {
  const input = personSchema.parse({
    personId: formData.get("personId"),
    preferredName: formData.get("preferredName"),
    roomLabel: formData.get("roomLabel"),
    voiceName: formData.get("voiceName"),
    primaryLanguage: formData.get("primaryLanguage"),
    simplicity: formData.get("simplicity"),
    micEnabled: formData.get("micEnabled") === "on",
  });
  await assertAccess(input.personId);

  const { personId, ...patch } = input;
  await getRepository().updatePerson(personId, patch);
  refresh(personId);
}

const noteSchema = z.object({
  personId: z.string().min(1),
  af: z.string().optional(),
  en: z.string().optional(),
  hours: z.coerce.number().min(1).max(72),
});

export async function addNote(formData: FormData): Promise<void> {
  const input = noteSchema.parse({
    personId: formData.get("personId"),
    af: formData.get("af"),
    en: formData.get("en"),
    hours: formData.get("hours") ?? 12,
  });
  await assertAccess(input.personId);

  const text = localized(input.af, input.en);
  if (Object.keys(text).length === 0) return;

  const now = new Date();
  await getRepository().createNote({
    personId: input.personId,
    text,
    createdAt: now,
    // A note that never expires becomes a lie the moment it stops being true.
    expiresAt: new Date(now.getTime() + input.hours * 60 * 60 * 1000),
  });
  refresh(input.personId);
}

export async function deleteNote(formData: FormData): Promise<void> {
  const personId = String(formData.get("personId"));
  await assertAccess(personId);
  await getRepository().deleteNote(String(formData.get("noteId")));
  refresh(personId);
}

const entrySchema = z.object({
  personId: z.string().min(1),
  af: z.string().optional(),
  en: z.string().optional(),
  kind: z.enum(SCHEDULE_KINDS),
  visitorName: z.string().optional(),
  startsAt: z.string().min(1),
  durationMinutes: z.coerce.number().min(0).max(24 * 60),
});

export async function addScheduleEntry(formData: FormData): Promise<void> {
  const input = entrySchema.parse({
    personId: formData.get("personId"),
    af: formData.get("af"),
    en: formData.get("en"),
    kind: formData.get("kind"),
    visitorName: formData.get("visitorName"),
    startsAt: formData.get("startsAt"),
    durationMinutes: formData.get("durationMinutes") ?? 60,
  });
  await assertAccess(input.personId);

  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) return;

  await getRepository().createScheduleEntry({
    personId: input.personId,
    title: localized(input.af, input.en),
    startsAt,
    endsAt:
      input.durationMinutes > 0
        ? new Date(startsAt.getTime() + input.durationMinutes * 60_000)
        : undefined,
    kind: input.kind,
    source: "family",
    visitorName: input.visitorName?.trim() || undefined,
  });
  refresh(input.personId);
}

export async function deleteScheduleEntry(formData: FormData): Promise<void> {
  const personId = String(formData.get("personId"));
  await assertAccess(personId);
  await getRepository().deleteScheduleEntry(String(formData.get("entryId")));
  refresh(personId);
}

const photoSchema = z.object({
  personId: z.string().min(1),
  url: z.string().min(1),
  name: z.string().min(1),
  af: z.string().optional(),
  en: z.string().optional(),
});

export async function addPhoto(formData: FormData): Promise<void> {
  const input = photoSchema.parse({
    personId: formData.get("personId"),
    url: formData.get("url"),
    name: formData.get("name"),
    af: formData.get("af"),
    en: formData.get("en"),
  });
  await assertAccess(input.personId);

  const existing = await getRepository().listPhotos(input.personId);
  await getRepository().createPhoto({
    personId: input.personId,
    url: input.url,
    name: input.name,
    relationship: localized(input.af, input.en),
    order: existing.length + 1,
  });
  refresh(input.personId);
}

export async function deletePhoto(formData: FormData): Promise<void> {
  const personId = String(formData.get("personId"));
  await assertAccess(personId);
  await getRepository().deletePhoto(String(formData.get("photoId")));
  refresh(personId);
}

/* The answer policy. The highest risk surface in the family app. */

const policySchema = z.object({
  personId: z.string().min(1),
  defaultMode: z.enum(ANSWER_POLICY_MODES),
});

export async function saveDefaultMode(formData: FormData): Promise<void> {
  const input = policySchema.parse({
    personId: formData.get("personId"),
    defaultMode: formData.get("defaultMode"),
  });
  await assertAccess(input.personId);

  const repository = getRepository();
  const existing = await repository.getAnswerPolicy(input.personId);
  await repository.saveAnswerPolicy({
    personId: input.personId,
    defaultMode: input.defaultMode,
    topics: existing?.topics ?? [],
  });
  refresh(input.personId);
}

const topicSchema = z.object({
  personId: z.string().min(1),
  subjectName: z.string().min(1),
  situation: z.enum(TOPIC_SITUATIONS),
  mode: z.union([z.enum(ANSWER_POLICY_MODES), z.literal("")]),
  relationshipAf: z.string().optional(),
  relationshipEn: z.string().optional(),
  wordingAf: z.string().optional(),
  wordingEn: z.string().optional(),
});

export interface TopicResult {
  ok: boolean;
  /** Kebab-case problem codes, rendered as sentences by the form. */
  problems: string[];
}

/**
 * Saving a topic runs the same wording guards the engine runs at read time.
 * The failure has to land in a form somebody is looking at rather than in a
 * bedroom at three in the morning.
 */
export async function saveTopic(formData: FormData): Promise<void> {
  const input = topicSchema.parse({
    personId: formData.get("personId"),
    subjectName: formData.get("subjectName"),
    situation: formData.get("situation"),
    mode: formData.get("mode") ?? "",
    relationshipAf: formData.get("relationshipAf"),
    relationshipEn: formData.get("relationshipEn"),
    wordingAf: formData.get("wordingAf"),
    wordingEn: formData.get("wordingEn"),
  });
  await assertAccess(input.personId);

  const repository = getRepository();
  const person = await repository.getPerson(input.personId);
  if (!person) return;

  const existing = await repository.getAnswerPolicy(input.personId);
  const defaultMode = existing?.defaultMode ?? "gentle-redirection";
  const mode = input.mode === "" ? undefined : input.mode;
  const familyWording = localized(input.wordingAf, input.wordingEn);

  const problems = validateFamilyWording(
    familyWording,
    mode ?? defaultMode,
    input.situation,
    input.subjectName,
    person.languages,
  );
  if (problems.length > 0) {
    // Rejected wording is not saved. Silently keeping it would mean the family
    // believes it is live when the engine would drop it.
    throw new Error(problems.map((problem) => problem.code).join(", "));
  }

  const topics = (existing?.topics ?? []).filter(
    (topic) => topic.subjectName.toLowerCase() !== input.subjectName.toLowerCase(),
  );
  topics.push({
    id: `topic-${input.subjectName.toLowerCase()}`,
    personId: input.personId,
    subjectName: input.subjectName,
    relationship: localized(input.relationshipAf, input.relationshipEn),
    situation: input.situation,
    mode,
    familyWording: Object.keys(familyWording).length > 0 ? familyWording : undefined,
  });

  await repository.saveAnswerPolicy({ personId: input.personId, defaultMode, topics });
  refresh(input.personId);
}

export async function deleteTopic(formData: FormData): Promise<void> {
  const personId = String(formData.get("personId"));
  const topicId = String(formData.get("topicId"));
  await assertAccess(personId);

  const repository = getRepository();
  const existing = await repository.getAnswerPolicy(personId);
  if (!existing) return;

  await repository.saveAnswerPolicy({
    ...existing,
    topics: existing.topics.filter((topic) => topic.id !== topicId),
  });
  refresh(personId);
}

/* Devices and calendars */

export async function createDeviceToken(formData: FormData): Promise<void> {
  const personId = String(formData.get("personId"));
  await assertAccess(personId);
  await getRepository().createDeviceToken(personId, String(formData.get("label") || "Tablet"));
  refresh(personId);
}

export async function revokeDeviceToken(formData: FormData): Promise<void> {
  const personId = String(formData.get("personId"));
  await assertAccess(personId);
  await getRepository().revokeDeviceToken(String(formData.get("token")));
  refresh(personId);
}

export async function syncCalendarNow(formData: FormData): Promise<void> {
  const personId = String(formData.get("personId"));
  await assertAccess(personId);
  await syncCalendars(getRepository(), personId, defaultCalendarFetcher(), new Date());
  refresh(personId);
}
