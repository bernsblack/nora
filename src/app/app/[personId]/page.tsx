import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepository } from "@/data";
import { DEFAULT_MODE } from "@/domain/answer-policy/policy";
import { buildRoomView } from "@/domain/room-view";
import {
  ANSWER_POLICY_MODES,
  LANGUAGES,
  SCHEDULE_KINDS,
  SIMPLICITY_LEVELS,
  TOPIC_SITUATIONS,
  resolveText,
  type AnswerPolicy,
  type CalendarSubscription,
  type DeviceToken,
  type Facility,
  type FamilyNote,
  type Person,
  type Photo,
  type ScheduleEntry,
  type VoiceMessage,
} from "@/domain/types";
import { getFamilyAuth } from "@/services/family-auth";
import styles from "../app.module.css";
import {
  addNote,
  addPhoto,
  addScheduleEntry,
  createDeviceToken,
  deleteNote,
  deletePhoto,
  deleteScheduleEntry,
  deleteTopic,
  revokeDeviceToken,
  saveDefaultMode,
  savePerson,
  saveTopic,
  syncCalendarNow,
} from "../actions";

/**
 * Everything a family member can change, on one page. A daughter opens this on
 * a phone while standing in a corridor, so it is one scroll rather than a
 * navigation tree.
 */

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

interface PageProps {
  params: Promise<{ personId: string }>;
}

export default async function PersonPage({ params }: PageProps) {
  const { personId } = await params;
  if (!(await getFamilyAuth().canAccess(personId))) notFound();

  const repository = getRepository();
  const now = new Date();

  const person = await repository.getPerson(personId);
  if (!person) notFound();
  const facility = await repository.getFacility(person.facilityId);
  if (!facility) notFound();

  const [entries, notes, photos, voiceMessages, policy, devices, calendars] = await Promise.all([
    repository.listScheduleEntries(
      personId,
      new Date(now.getTime() - DAY_MS),
      new Date(now.getTime() + 7 * DAY_MS),
    ),
    repository.listNotes(personId),
    repository.listPhotos(personId),
    repository.listVoiceMessages(personId),
    repository.getAnswerPolicy(personId),
    repository.listDeviceTokens(personId),
    repository.listCalendarSubscriptions(personId),
  ]);

  const preview = buildRoomView({ person, facility, entries, notes, photos }, now);

  return (
    <>
      <section className={styles.section}>
        <h1 className={styles.sectionTitle}>{person.preferredName}</h1>
        <p className={styles.note}>
          The room screen is showing: <strong>{preview.dayAndPartOfDay}</strong>
          {preview.location ? ` ${preview.location}` : null}
          {preview.nextThing ? ` ${preview.nextThing}` : null}
        </p>
        <div className={styles.footerLinks}>
          <Link href={`/room?token=${devices[0]?.token ?? ""}`}>Open the room screen</Link>
          <Link href={`/room?token=${devices[0]?.token ?? ""}&wizard=1`}>
            Open it with the listening control
          </Link>
        </div>
      </section>

      <AboutSection person={person} facility={facility} />
      <AnswerPolicySection person={person} policy={policy} />
      <NotesSection person={person} notes={notes} facility={facility} />
      <ScheduleSection
        person={person}
        facility={facility}
        entries={entries}
        calendars={calendars}
      />
      <PhotosSection person={person} photos={photos} />
      <VoiceMessagesSection person={person} messages={voiceMessages} facility={facility} />
      <DevicesSection person={person} devices={devices} facility={facility} />
    </>
  );
}

/* Sections */

function AboutSection({ person, facility }: { person: Person; facility: Facility }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>About {person.preferredName}</h2>
      <form action={savePerson} className={styles.grid}>
        <input type="hidden" name="personId" value={person.id} />

        <label className={styles.field}>
          <span>The name they answer to</span>
          <input className={styles.input} name="preferredName" defaultValue={person.preferredName} />
        </label>

        <label className={styles.field}>
          <span>Room, at {facility.name}</span>
          <input className={styles.input} name="roomLabel" defaultValue={person.roomLabel} />
        </label>

        <label className={styles.field}>
          <span>What they should call the voice</span>
          <input className={styles.input} name="voiceName" defaultValue={person.voiceName} />
        </label>

        <label className={styles.field}>
          <span>Language on the screen</span>
          <select
            className={styles.select}
            name="primaryLanguage"
            defaultValue={person.primaryLanguage}
          >
            {LANGUAGES.map((language) => (
              <option key={language} value={language}>
                {language === "af" ? "Afrikaans" : "English"}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>How much the device does</span>
          <select className={styles.select} name="simplicity" defaultValue={person.simplicity}>
            {SIMPLICITY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {SIMPLICITY_LABELS[level]}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.field}>
          <span>Microphone</span>
          <label className={styles.checkRow}>
            <input type="checkbox" name="micEnabled" defaultChecked={person.micEnabled} />
            <span>The device may listen</span>
          </label>
        </div>

        <div className={styles.actions}>
          <button className={styles.button} type="submit">
            Save
          </button>
        </div>
      </form>
      <p className={styles.note}>
        Both languages are always understood when someone speaks. This setting only decides
        what is written on the screen.
      </p>
    </section>
  );
}

const SIMPLICITY_LABELS: Record<(typeof SIMPLICITY_LEVELS)[number], string> = {
  full: "Everything, including open conversation",
  guided: "The day, the next thing, and answers when asked",
  calm: "The same, but never speaks first",
  minimal: "Just the day and a face",
};

const MODE_LABELS: Record<(typeof ANSWER_POLICY_MODES)[number], string> = {
  "gentle-redirection": "Move gently past it, without saying anything untrue",
  validation: "Go along with what they believe, in words you write",
  truthful: "Tell them the truth, gently, when they ask",
};

const SITUATION_LABELS: Record<(typeof TOPIC_SITUATIONS)[number], string> = {
  deceased: "Has died",
  "moved-away": "Has moved away",
  estranged: "Is not in touch",
  "in-hospital": "Is in hospital",
  "in-care": "Is in care somewhere else",
  other: "Something else",
};

function AnswerPolicySection({
  person,
  policy,
}: {
  person: Person;
  policy: AnswerPolicy | null;
}) {
  return (
    <section className={`${styles.section} ${styles.policy}`}>
      <h2 className={styles.sectionTitle}>What to say about hard questions</h2>
      <p className={styles.policyWarning}>
        {person.preferredName} may ask where someone is many times a day. There is no right
        answer to this and families disagree about it. Whatever you choose here, the device will
        never bring a death up on its own, never add detail, and never say more than a sentence
        or two.
      </p>

      <form action={saveDefaultMode} className={styles.grid}>
        <input type="hidden" name="personId" value={person.id} />
        <label className={styles.field}>
          <span>When you have not written anything for a particular person</span>
          <select
            className={styles.select}
            name="defaultMode"
            defaultValue={policy?.defaultMode ?? DEFAULT_MODE}
          >
            {ANSWER_POLICY_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {MODE_LABELS[mode]}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.actions}>
          <button className={styles.button} type="submit">
            Save
          </button>
        </div>
      </form>

      <ul className={styles.list}>
        {(policy?.topics ?? []).map((topic) => (
          <li key={topic.id} className={styles.row}>
            <div className={styles.rowMain}>
              <strong>
                {topic.subjectName}
                {resolveText(topic.relationship, person.primaryLanguage)
                  ? `, ${resolveText(topic.relationship, person.primaryLanguage)}`
                  : ""}
              </strong>
              <span className={styles.rowMeta}>
                {SITUATION_LABELS[topic.situation]}. {MODE_LABELS[topic.mode ?? policy?.defaultMode ?? DEFAULT_MODE]}
              </span>
              {topic.familyWording ? (
                <span className={styles.rowMeta}>
                  Your words:{" "}
                  {resolveText(topic.familyWording, person.primaryLanguage, person.languages)}
                </span>
              ) : null}
            </div>
            <form action={deleteTopic}>
              <input type="hidden" name="personId" value={person.id} />
              <input type="hidden" name="topicId" value={topic.id} />
              <button className={styles.buttonQuiet} type="submit">
                Remove
              </button>
            </form>
          </li>
        ))}
      </ul>

      <form action={saveTopic} className={styles.grid}>
        <input type="hidden" name="personId" value={person.id} />
        <label className={styles.field}>
          <span>Who do they ask about?</span>
          <input className={styles.input} name="subjectName" placeholder="Jan" required />
        </label>
        <label className={styles.field}>
          <span>Who they are, in Afrikaans</span>
          <input className={styles.input} name="relationshipAf" placeholder="jou man" />
        </label>
        <label className={styles.field}>
          <span>Who they are, in English</span>
          <input className={styles.input} name="relationshipEn" placeholder="your husband" />
        </label>
        <label className={styles.field}>
          <span>What has happened</span>
          <select className={styles.select} name="situation" defaultValue="deceased">
            {TOPIC_SITUATIONS.map((situation) => (
              <option key={situation} value={situation}>
                {SITUATION_LABELS[situation]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>How to answer, for this person</span>
          <select className={styles.select} name="mode" defaultValue="">
            <option value="">Use the setting above</option>
            {ANSWER_POLICY_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {MODE_LABELS[mode]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>Your exact words, in Afrikaans</span>
          <textarea className={styles.textarea} name="wordingAf" />
        </label>
        <label className={styles.field}>
          <span>Your exact words, in English</span>
          <textarea className={styles.textarea} name="wordingEn" />
        </label>
        <div className={styles.actions}>
          <button className={styles.button} type="submit">
            Save this person
          </button>
        </div>
      </form>
      <p className={styles.note}>
        Keep it to one or two short sentences. If the words do not fit what you chose above, for
        instance if they suggest someone will be back when you asked for the truth, saving will
        stop and tell you.
      </p>
    </section>
  );
}

function NotesSection({
  person,
  notes,
  facility,
}: {
  person: Person;
  notes: FamilyNote[];
  facility: Facility;
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Something for today</h2>
      <p className={styles.note}>
        This takes the place of the next thing on the screen while it lasts. Use it for what the
        calendar does not know.
      </p>

      <ul className={styles.list}>
        {notes.map((note) => (
          <li key={note.id} className={styles.row}>
            <div className={styles.rowMain}>
              <span>{resolveText(note.text, person.primaryLanguage, person.languages)}</span>
              <span className={styles.rowMeta}>
                Written {formatWhen(note.createdAt, facility.timezone)}
                {note.expiresAt ? `, until ${formatWhen(note.expiresAt, facility.timezone)}` : ""}
              </span>
            </div>
            <form action={deleteNote}>
              <input type="hidden" name="personId" value={person.id} />
              <input type="hidden" name="noteId" value={note.id} />
              <button className={styles.buttonQuiet} type="submit">
                Remove
              </button>
            </form>
          </li>
        ))}
      </ul>

      <form action={addNote} className={styles.grid}>
        <input type="hidden" name="personId" value={person.id} />
        <label className={styles.field}>
          <span>In Afrikaans</span>
          <input className={styles.input} name="af" placeholder="Pa is by die werk." />
        </label>
        <label className={styles.field}>
          <span>In English</span>
          <input className={styles.input} name="en" placeholder="Pa is at work." />
        </label>
        <label className={styles.field}>
          <span>Show it for</span>
          <select className={styles.select} name="hours" defaultValue="12">
            <option value="4">4 hours</option>
            <option value="12">Today</option>
            <option value="24">A day</option>
          </select>
        </label>
        <div className={styles.actions}>
          <button className={styles.button} type="submit">
            Add
          </button>
        </div>
      </form>
    </section>
  );
}

function ScheduleSection({
  person,
  facility,
  entries,
  calendars,
}: {
  person: Person;
  facility: Facility;
  entries: ScheduleEntry[];
  calendars: CalendarSubscription[];
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>The days ahead</h2>

      <ul className={styles.list}>
        {entries.map((entry) => (
          <li key={entry.id} className={styles.row}>
            <div className={styles.rowMain}>
              <span>
                {entry.visitorName
                  ? `${entry.visitorName} visiting`
                  : resolveText(entry.title, person.primaryLanguage, person.languages)}
              </span>
              <span className={styles.rowMeta}>{formatWhen(entry.startsAt, facility.timezone)}</span>
            </div>
            <span className={styles.tag}>{entry.source === "family" ? "Yours" : facility.name}</span>
            {entry.source === "family" ? (
              <form action={deleteScheduleEntry}>
                <input type="hidden" name="personId" value={person.id} />
                <input type="hidden" name="entryId" value={entry.id} />
                <button className={styles.buttonQuiet} type="submit">
                  Remove
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>

      <form action={addScheduleEntry} className={styles.grid}>
        <input type="hidden" name="personId" value={person.id} />
        <label className={styles.field}>
          <span>What, in Afrikaans</span>
          <input className={styles.input} name="af" placeholder="Anna kom kuier" />
        </label>
        <label className={styles.field}>
          <span>What, in English</span>
          <input className={styles.input} name="en" placeholder="Anna is visiting" />
        </label>
        <label className={styles.field}>
          <span>Kind</span>
          <select className={styles.select} name="kind" defaultValue="visit">
            {SCHEDULE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>Who is coming, if anyone</span>
          <input className={styles.input} name="visitorName" placeholder="Anna" />
        </label>
        <label className={styles.field}>
          <span>When</span>
          <input className={styles.input} type="datetime-local" name="startsAt" required />
        </label>
        <label className={styles.field}>
          <span>For how long, in minutes</span>
          <input className={styles.input} type="number" name="durationMinutes" defaultValue={60} />
        </label>
        <div className={styles.actions}>
          <button className={styles.button} type="submit">
            Add
          </button>
        </div>
      </form>

      <div className={styles.actions}>
        <form action={syncCalendarNow}>
          <input type="hidden" name="personId" value={person.id} />
          <button className={styles.buttonQuiet} type="submit">
            Refresh from {facility.name}
          </button>
        </form>
        <span className={styles.rowMeta}>
          {calendars.length > 0
            ? calendars
                .map(
                  (calendar) =>
                    `${calendar.label}: ${
                      calendar.lastSyncedAt
                        ? formatWhen(calendar.lastSyncedAt, facility.timezone)
                        : "never refreshed"
                    }`,
                )
                .join(", ")
            : "No calendar connected."}
        </span>
      </div>
    </section>
  );
}

function PhotosSection({ person, photos }: { person: Person; photos: Photo[] }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Faces</h2>
      <p className={styles.note}>
        One at a time on the screen, with the name written underneath. A face without a name is a
        test, and the device never tests anybody.
      </p>

      <ul className={styles.list}>
        {photos.map((photo) => (
          <li key={photo.id} className={styles.row}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.thumb} src={photo.url} alt="" />
            <div className={styles.rowMain}>
              <strong>{photo.name}</strong>
              <span className={styles.rowMeta}>
                {resolveText(photo.relationship, person.primaryLanguage, person.languages)}
              </span>
            </div>
            <form action={deletePhoto}>
              <input type="hidden" name="personId" value={person.id} />
              <input type="hidden" name="photoId" value={photo.id} />
              <button className={styles.buttonQuiet} type="submit">
                Remove
              </button>
            </form>
          </li>
        ))}
      </ul>

      <form action={addPhoto} className={styles.grid}>
        <input type="hidden" name="personId" value={person.id} />
        <label className={styles.field}>
          <span>Name, written under the face</span>
          <input className={styles.input} name="name" required />
        </label>
        <label className={styles.field}>
          <span>Who they are, in Afrikaans</span>
          <input className={styles.input} name="af" placeholder="jou dogter" />
        </label>
        <label className={styles.field}>
          <span>Who they are, in English</span>
          <input className={styles.input} name="en" placeholder="your daughter" />
        </label>
        <label className={styles.field}>
          <span>Picture address</span>
          <input className={styles.input} name="url" placeholder="/fixtures/photo-anna.svg" required />
        </label>
        <div className={styles.actions}>
          <button className={styles.button} type="submit">
            Add
          </button>
        </div>
      </form>
      <p className={styles.note}>
        Uploading a picture from your phone is not built yet. Storage is not connected, so this
        takes an address for now.
      </p>
    </section>
  );
}

function VoiceMessagesSection({
  person,
  messages,
  facility,
}: {
  person: Person;
  messages: VoiceMessage[];
  facility: Facility;
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Recorded messages</h2>
      <ul className={styles.list}>
        {messages.map((message) => (
          <li key={message.id} className={styles.row}>
            <div className={styles.rowMain}>
              <strong>{message.fromName}</strong>
              <span className={styles.rowMeta}>
                {resolveText(message.transcript, person.primaryLanguage, person.languages) ??
                  "No transcript"}
              </span>
              <span className={styles.rowMeta}>
                {formatWhen(message.recordedAt, facility.timezone)}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <p className={styles.note}>
        Recording is not built yet. Storage is not connected, so nothing can be uploaded.
      </p>
    </section>
  );
}

function DevicesSection({
  person,
  devices,
  facility,
}: {
  person: Person;
  devices: DeviceToken[];
  facility: Facility;
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Screens in the room</h2>
      <ul className={styles.list}>
        {devices.map((device) => (
          <li key={device.token} className={styles.row}>
            <div className={styles.rowMain}>
              <strong>{device.label}</strong>
              <span className={styles.rowMeta}>
                {device.revokedAt
                  ? `Turned off ${formatWhen(device.revokedAt, facility.timezone)}`
                  : device.lastSeenAt
                    ? `Last seen ${formatWhen(device.lastSeenAt, facility.timezone)}`
                    : "Not seen yet"}
              </span>
            </div>
            {device.revokedAt ? null : (
              <form action={revokeDeviceToken}>
                <input type="hidden" name="personId" value={person.id} />
                <input type="hidden" name="token" value={device.token} />
                <button className={styles.buttonQuiet} type="submit">
                  Turn it off
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>

      <form action={createDeviceToken} className={styles.grid}>
        <input type="hidden" name="personId" value={person.id} />
        <label className={styles.field}>
          <span>Add another screen</span>
          <input className={styles.input} name="label" placeholder="Bedside tablet" />
        </label>
        <div className={styles.actions}>
          <button className={styles.button} type="submit">
            Add
          </button>
        </div>
      </form>
    </section>
  );
}

/** A normal date for a normal adult, in the facility's timezone. */
function formatWhen(at: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(at);
}
