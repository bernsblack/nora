"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRepository } from "@/data";
import { validateFamilyWording } from "@/domain/answer-policy/wording";
import { parseLocalDateTime } from "@/domain/time";
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
import { describeProblems, failed, ok, type FormState } from "./form-state";

/**
 * Everything the family app writes. Each action checks that the signed in user
 * may touch this person before it does anything, because the room device reads
 * whatever is here and cannot tell a mistake from an instruction.
 *
 * Every action takes the previous form state and returns a new one, so a
 * refusal arrives as a sentence under the form rather than as an error page.
 */

async function assertAccess(personId: string): Promise<boolean> {
  return getFamilyAuth().canAccess(personId);
}

function refresh(personId: string): void {
  revalidatePath(`/app/${personId}`);
  revalidatePath("/room");
}

const DENIED = failed([], "That is not your person to change");

function localized(af: string | undefined, en: string | undefined): LocalizedText {
  const text: LocalizedText = {};
  if (af?.trim()) text.af = af.trim();
  if (en?.trim()) text.en = en.trim();
  return text;
}

/** Turn a zod failure into something a person can read. */
function invalid(error: z.ZodError): FormState {
  return failed(error.issues.map((issue) => issue.message));
}

const personSchema = z.object({
  personId: z.string().min(1),
  preferredName: z.string().min(1, "They need a name to be called by."),
  roomLabel: z.string().min(1, "The room needs a label, even if it is just a number."),
  voiceName: z.string().min(1, "Nora needs a name for them to use."),
  primaryLanguage: z.enum(LANGUAGES),
  simplicity: z.enum(SIMPLICITY_LEVELS),
  micEnabled: z.boolean(),
});

export async function savePerson(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = personSchema.safeParse({
    personId: formData.get("personId"),
    preferredName: formData.get("preferredName"),
    roomLabel: formData.get("roomLabel"),
    voiceName: formData.get("voiceName"),
    primaryLanguage: formData.get("primaryLanguage"),
    simplicity: formData.get("simplicity"),
    micEnabled: formData.get("micEnabled") === "on",
  });
  if (!parsed.success) return invalid(parsed.error);
  if (!(await assertAccess(parsed.data.personId))) return DENIED;

  const { personId, ...patch } = parsed.data;
  await getRepository().updatePerson(personId, patch);
  refresh(personId);
  return ok("Saved. The room screen has it now.");
}

const noteSchema = z.object({
  personId: z.string().min(1),
  af: z.string().optional(),
  en: z.string().optional(),
  hours: z.coerce.number().min(1).max(72),
});

export async function addNote(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = noteSchema.safeParse({
    personId: formData.get("personId"),
    af: formData.get("af"),
    en: formData.get("en"),
    hours: formData.get("hours") ?? 12,
  });
  if (!parsed.success) return invalid(parsed.error);
  if (!(await assertAccess(parsed.data.personId))) return DENIED;

  const text = localized(parsed.data.af, parsed.data.en);
  if (Object.keys(text).length === 0) {
    return failed(["Write the note in at least one language."]);
  }

  const now = new Date();
  await getRepository().createNote({
    personId: parsed.data.personId,
    text,
    createdAt: now,
    // A note that never expires becomes a lie the moment it stops being true.
    expiresAt: new Date(now.getTime() + parsed.data.hours * 60 * 60 * 1000),
  });
  refresh(parsed.data.personId);
  return ok("On the screen now.");
}

export async function deleteNote(formData: FormData): Promise<void> {
  const personId = String(formData.get("personId"));
  if (!(await assertAccess(personId))) return;
  await getRepository().deleteNote(String(formData.get("noteId")));
  refresh(personId);
}

const entrySchema = z.object({
  personId: z.string().min(1),
  af: z.string().optional(),
  en: z.string().optional(),
  kind: z.enum(SCHEDULE_KINDS),
  visitorName: z.string().optional(),
  startsAt: z.string().min(1, "Pick a day and a time."),
  durationMinutes: z.coerce.number().min(0).max(24 * 60),
});

export async function addScheduleEntry(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = entrySchema.safeParse({
    personId: formData.get("personId"),
    af: formData.get("af"),
    en: formData.get("en"),
    kind: formData.get("kind"),
    visitorName: formData.get("visitorName"),
    startsAt: formData.get("startsAt"),
    durationMinutes: formData.get("durationMinutes") ?? 60,
  });
  if (!parsed.success) return invalid(parsed.error);
  if (!(await assertAccess(parsed.data.personId))) return DENIED;

  const repository = getRepository();
  const person = await repository.getPerson(parsed.data.personId);
  const facility = person ? await repository.getFacility(person.facilityId) : null;
  if (!facility) return failed(["Could not find the care home for this person."]);

  // Read the entered time as a wall clock time at the facility, not wherever
  // the family member happens to be standing.
  const startsAt = parseLocalDateTime(parsed.data.startsAt, facility.timezone);
  if (!startsAt) return failed(["That day and time could not be read."]);

  const title = localized(parsed.data.af, parsed.data.en);
  const visitorName = parsed.data.visitorName?.trim() || undefined;
  if (Object.keys(title).length === 0 && !visitorName) {
    return failed(["Say what it is, or who is coming."]);
  }

  await repository.createScheduleEntry({
    personId: parsed.data.personId,
    title,
    startsAt,
    endsAt:
      parsed.data.durationMinutes > 0
        ? new Date(startsAt.getTime() + parsed.data.durationMinutes * 60_000)
        : undefined,
    kind: parsed.data.kind,
    source: "family",
    visitorName,
  });
  refresh(parsed.data.personId);
  return ok("Added.");
}

export async function deleteScheduleEntry(formData: FormData): Promise<void> {
  const personId = String(formData.get("personId"));
  if (!(await assertAccess(personId))) return;
  await getRepository().deleteScheduleEntry(String(formData.get("entryId")));
  refresh(personId);
}

const photoSchema = z.object({
  personId: z.string().min(1),
  url: z.string().min(1, "A picture address is needed until uploading is built."),
  name: z.string().min(1, "The name goes under the face, so it cannot be blank."),
  af: z.string().optional(),
  en: z.string().optional(),
});

export async function addPhoto(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = photoSchema.safeParse({
    personId: formData.get("personId"),
    url: formData.get("url"),
    name: formData.get("name"),
    af: formData.get("af"),
    en: formData.get("en"),
  });
  if (!parsed.success) return invalid(parsed.error);
  if (!(await assertAccess(parsed.data.personId))) return DENIED;

  const existing = await getRepository().listPhotos(parsed.data.personId);
  await getRepository().createPhoto({
    personId: parsed.data.personId,
    url: parsed.data.url,
    name: parsed.data.name,
    relationship: localized(parsed.data.af, parsed.data.en),
    order: existing.length + 1,
  });
  refresh(parsed.data.personId);
  return ok("Added.");
}

export async function deletePhoto(formData: FormData): Promise<void> {
  const personId = String(formData.get("personId"));
  if (!(await assertAccess(personId))) return;
  await getRepository().deletePhoto(String(formData.get("photoId")));
  refresh(personId);
}

/* The answer policy. The highest risk surface in the family app. */

const policySchema = z.object({
  personId: z.string().min(1),
  defaultMode: z.enum(ANSWER_POLICY_MODES),
});

export async function saveDefaultMode(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = policySchema.safeParse({
    personId: formData.get("personId"),
    defaultMode: formData.get("defaultMode"),
  });
  if (!parsed.success) return invalid(parsed.error);
  if (!(await assertAccess(parsed.data.personId))) return DENIED;

  const repository = getRepository();
  const existing = await repository.getAnswerPolicy(parsed.data.personId);
  await repository.saveAnswerPolicy({
    personId: parsed.data.personId,
    defaultMode: parsed.data.defaultMode,
    topics: existing?.topics ?? [],
  });
  refresh(parsed.data.personId);
  return ok("Saved.");
}

const topicSchema = z.object({
  personId: z.string().min(1),
  subjectName: z.string().min(1, "Who do they ask about?"),
  situation: z.enum(TOPIC_SITUATIONS),
  mode: z.union([z.enum(ANSWER_POLICY_MODES), z.literal("")]),
  relationshipAf: z.string().optional(),
  relationshipEn: z.string().optional(),
  wordingAf: z.string().optional(),
  wordingEn: z.string().optional(),
});

/**
 * Saving a topic runs the same wording guards the engine runs at read time, so
 * the failure lands in a form somebody is looking at rather than in a bedroom
 * at three in the morning. Rejected wording is not saved: keeping it silently
 * would leave the family believing it is live when the device would drop it.
 */
export async function saveTopic(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = topicSchema.safeParse({
    personId: formData.get("personId"),
    subjectName: formData.get("subjectName"),
    situation: formData.get("situation"),
    mode: formData.get("mode") ?? "",
    relationshipAf: formData.get("relationshipAf"),
    relationshipEn: formData.get("relationshipEn"),
    wordingAf: formData.get("wordingAf"),
    wordingEn: formData.get("wordingEn"),
  });
  if (!parsed.success) return invalid(parsed.error);
  if (!(await assertAccess(parsed.data.personId))) return DENIED;

  const input = parsed.data;
  const repository = getRepository();
  const person = await repository.getPerson(input.personId);
  if (!person) return failed(["Could not find this person."]);

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
  if (problems.length > 0) return failed(describeProblems(problems));

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
  return ok(`Saved what Nora says about ${input.subjectName}.`);
}

export async function deleteTopic(formData: FormData): Promise<void> {
  const personId = String(formData.get("personId"));
  const topicId = String(formData.get("topicId"));
  if (!(await assertAccess(personId))) return;

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

export async function createDeviceToken(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const personId = String(formData.get("personId"));
  if (!(await assertAccess(personId))) return DENIED;
  const device = await getRepository().createDeviceToken(
    personId,
    String(formData.get("label") || "Tablet"),
  );
  refresh(personId);
  return ok(`Added. Point the tablet at /room?token=${device.token}`);
}

export async function revokeDeviceToken(formData: FormData): Promise<void> {
  const personId = String(formData.get("personId"));
  if (!(await assertAccess(personId))) return;
  await getRepository().revokeDeviceToken(String(formData.get("token")));
  refresh(personId);
}

export async function syncCalendarNow(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const personId = String(formData.get("personId"));
  if (!(await assertAccess(personId))) return DENIED;

  const result = await syncCalendars(
    getRepository(),
    personId,
    defaultCalendarFetcher(),
    new Date(),
  );
  refresh(personId);

  if (result.failures.length > 0) {
    return failed(
      result.failures.map(
        (failure) => `Could not read one of the calendars: ${failure.message}`,
      ),
      "Refreshed, with problems",
    );
  }
  return ok(`Refreshed. ${result.entries.length} things on the calendar.`);
}
