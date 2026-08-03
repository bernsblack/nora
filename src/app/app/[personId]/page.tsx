import { notFound, redirect } from "next/navigation";
import { getRepository, usingDatabase } from "@/data";
import { setupComplete } from "@/domain/setup";
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
import { zonedParts } from "@/domain/time";
import { getFamilyAuth } from "@/services/family-auth";
import styles from "../app.module.css";
import { ActionForm, RemoveForm } from "../action-form";
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
 *
 * Each section shows what is set now. Adding something is folded away behind a
 * disclosure, so the page reads as the current state of a person's day rather
 * than as a form to fill in.
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

  // Setup is not a screen a family member can walk past. PROJECT.md section 6
  // requires the answer policy to be an explicit choice at setup rather than a
  // default discovered later, and settings pages are where defaults go to be
  // discovered later. setupComplete narrows, so everything below has a policy.
  const policy = await repository.getAnswerPolicy(personId);
  if (!setupComplete(policy)) redirect(`/app/${personId}/setup`);

  const [entries, notes, photos, voiceMessages, devices, calendars] = await Promise.all([
    repository.listScheduleEntries(
      personId,
      new Date(now.getTime() - DAY_MS),
      new Date(now.getTime() + 7 * DAY_MS),
    ),
    repository.listNotes(personId),
    repository.listPhotos(personId),
    repository.listVoiceMessages(personId),
    repository.listDeviceTokens(personId),
    repository.listCalendarSubscriptions(personId),
  ]);

  const liveDevice = devices.find((device) => !device.revokedAt);

  return (
    <>
      <PreviewSection person={person} facility={facility} device={liveDevice} />
      <AnswerPolicySection person={person} policy={policy} />
      <NotesSection person={person} notes={notes} facility={facility} />
      <ScheduleSection
        person={person}
        facility={facility}
        entries={entries}
        calendars={calendars}
      />
      <PhotosSection person={person} photos={photos} />
      <AboutSection person={person} facility={facility} />
      <VoiceMessagesSection person={person} messages={voiceMessages} facility={facility} />
      <DevicesSection person={person} devices={devices} facility={facility} />
    </>
  );
}

/* Sections, in the order a family member cares about them. */

/**
 * The room screen itself, scaled down. A written description would drift away
 * from what the device renders, and the reason this is here is so a daughter
 * can see what her mother is actually looking at.
 */
function PreviewSection({
  person,
  facility,
  device,
}: {
  person: Person;
  facility: Facility;
  device?: DeviceToken;
}) {
  const token = device?.token ?? "";

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h1 className={styles.sectionTitle}>On the screen in {person.preferredName}&apos;s room</h1>
        <p className={styles.note}>{facility.name}, room {person.roomLabel}</p>
      </div>

      {device ? (
        <div className={styles.preview}>
          <div className={styles.previewFrame}>
            <iframe
              className={styles.previewInner}
              src={`/room?token=${token}`}
              title={`Live view of the screen in ${person.preferredName}'s room`}
              tabIndex={-1}
            />
          </div>
          <div className={styles.previewSide}>
            <p className={styles.note}>
              This is the live screen, not a picture of one. Anything you change below shows up
              here when you reload.
            </p>
            <div className={styles.links}>
              <a href={`/room?token=${token}`}>Open it full size</a>
              {/*
                Only offered where it works. `?lux=` is honoured on fixtures and
                ignored once a database is configured, because a query parameter
                that dims a resident's screen at midday is a stranger changing
                what they see. Left in place, this link would quietly render the
                daytime screen and tell a daughter that is what her mother's
                room looks like at three in the morning.
              */}
              {usingDatabase() ? null : (
                <a href={`/room?token=${token}&lux=2`}>See it at night</a>
              )}
              <a href={`/room?token=${token}&wizard=1`}>Try talking to it</a>
            </div>
          </div>
        </div>
      ) : (
        <p className={styles.empty}>
          No screen is switched on for {person.preferredName}. Add one further down and point the
          tablet at the address it gives you.
        </p>
      )}
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

const KIND_LABELS: Record<(typeof SCHEDULE_KINDS)[number], string> = {
  meal: "A meal",
  visit: "A visit",
  activity: "Something to do",
  care: "Care or an appointment",
  rest: "Rest",
};

function AboutSection({ person, facility }: { person: Person; facility: Facility }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>About {person.preferredName}</h2>
        <p className={styles.note}>
          Both languages are always understood when someone speaks. The setting below only
          decides what is written on the screen.
        </p>
      </div>

      <ActionForm
        action={savePerson}
        submitLabel="Save these details"
        note="Turn the microphone off and the device opens none at all, and says so on the screen in words readable from across the room."
      >
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
      </ActionForm>
    </section>
  );
}

function AnswerPolicySection({
  person,
  policy,
}: {
  person: Person;
  /*
   * Never null. PersonPage redirects to setup while it is, so this section only
   * ever renders for a family who decided. The type says so on purpose: it used
   * to be nullable with a `?? DEFAULT_MODE` fallback, which is the defect this
   * flow removed, a select pre-selecting gentle redirection and presenting it
   * as the family's decision.
   */
  policy: AnswerPolicy;
}) {
  const topics = policy.topics;
  const fallbackMode = policy.defaultMode;

  return (
    <section className={`${styles.section} ${styles.policy}`}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>What to say about hard questions</h2>
        <p className={styles.policyWarning}>
          {person.preferredName} may ask where someone is many times a day. There is no right
          answer to this and families disagree about it, so it is yours to decide. Whatever you
          choose, the device will never raise a death on its own, never add detail, and never say
          more than a sentence or two.
        </p>
      </div>

      <ActionForm action={saveDefaultMode} submitLabel="Save this choice">
        <input type="hidden" name="personId" value={person.id} />
        <label className={styles.field}>
          <span>When you have not written anything for a particular person</span>
          <select className={styles.select} name="defaultMode" defaultValue={fallbackMode}>
            {ANSWER_POLICY_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {MODE_LABELS[mode]}
              </option>
            ))}
          </select>
        </label>
      </ActionForm>

      {topics.length === 0 ? (
        <p className={styles.empty}>
          {/*
            This used to say the choice above was applied to anyone she asked
            about, which is not what happens: answerSensitive returns
            unknown-subject-redirect for a subject with no topic, before the
            mode is read. The choice matters once somebody is written down.
          */}
          Nobody written down yet. Until you add someone, {person.voiceName} says the same gentle
          thing about anyone {person.preferredName} asks after, whichever choice you made above.
        </p>
      ) : (
        <ul className={styles.list}>
          {topics.map((topic) => {
            const relationship = resolveText(topic.relationship, person.primaryLanguage);
            const wording = resolveText(
              topic.familyWording,
              person.primaryLanguage,
              person.languages,
            );
            return (
              <li key={topic.id} className={styles.row}>
                <div className={styles.rowMain}>
                  <strong>
                    {topic.subjectName}
                    {relationship ? `, ${relationship}` : ""}
                  </strong>
                  <span className={styles.rowMeta}>
                    {SITUATION_LABELS[topic.situation]}.{" "}
                    {MODE_LABELS[topic.mode ?? fallbackMode]}
                  </span>
                  {wording ? <p className={styles.quote}>{wording}</p> : null}
                </div>
                <RemoveForm action={deleteTopic}>
                  <input type="hidden" name="personId" value={person.id} />
                  <input type="hidden" name="topicId" value={topic.id} />
                </RemoveForm>
              </li>
            );
          })}
        </ul>
      )}

      <details className={styles.disclosure}>
        <summary className={styles.disclosureSummary}>
          Set up someone {person.preferredName} asks about
        </summary>
        <ActionForm
          action={saveTopic}
          submitLabel="Save what Nora says"
          note="Keep it to one or two short sentences. If the words do not match what you chose, for instance if they suggest someone will be back when you asked for the truth, saving stops and says why."
        >
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
              <option value="">Use the choice above</option>
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
        </ActionForm>
      </details>
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
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Something for today</h2>
        <p className={styles.note}>
          This takes the place of the next thing on the screen while it lasts. Use it for what the
          care home calendar does not know.
        </p>
      </div>

      {notes.length === 0 ? (
        <p className={styles.empty}>Nothing written for today.</p>
      ) : (
        <ul className={styles.list}>
          {notes.map((note) => (
            <li key={note.id} className={styles.row}>
              <div className={styles.rowMain}>
                <span>{resolveText(note.text, person.primaryLanguage, person.languages)}</span>
                <span className={styles.rowMeta}>
                  Written {formatWhen(note.createdAt, facility.timezone)}
                  {note.expiresAt
                    ? `, comes off at ${formatWhen(note.expiresAt, facility.timezone)}`
                    : ""}
                </span>
              </div>
              <RemoveForm action={deleteNote} label="Take it off">
                <input type="hidden" name="personId" value={person.id} />
                <input type="hidden" name="noteId" value={note.id} />
              </RemoveForm>
            </li>
          ))}
        </ul>
      )}

      <ActionForm action={addNote} submitLabel="Put this on the screen">
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
            <option value="12">The rest of today</option>
            <option value="24">A day</option>
          </select>
        </label>
      </ActionForm>
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
  const lastSynced = calendars
    .map((calendar) => calendar.lastSyncedAt)
    .filter((at): at is Date => Boolean(at))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>The days ahead</h2>
        <p className={styles.note}>
          Times are as they are at {facility.name}. Only one of these is ever on the screen: the
          one happening next.
        </p>
      </div>

      {entries.length === 0 ? (
        <p className={styles.empty}>Nothing in the next week.</p>
      ) : (
        groupByDay(entries, facility.timezone).map((day) => (
          <div key={day.key} className={styles.day}>
            <h3 className={styles.dayTitle}>{day.title}</h3>
            <ul className={styles.list}>
              {day.entries.map((entry) => (
                <li key={entry.id} className={styles.row}>
                  <span className={styles.time}>
                    {formatTime(entry.startsAt, facility.timezone)}
                  </span>
                  <div className={styles.rowMain}>
                    <span>
                      {entry.visitorName
                        ? `${entry.visitorName} visiting`
                        : resolveText(entry.title, person.primaryLanguage, person.languages)}
                    </span>
                  </div>
                  {entry.source === "family" ? (
                    <>
                      <span className={styles.tag}>Yours</span>
                      <RemoveForm action={deleteScheduleEntry}>
                        <input type="hidden" name="personId" value={person.id} />
                        <input type="hidden" name="entryId" value={entry.id} />
                      </RemoveForm>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      <details className={styles.disclosure}>
        <summary className={styles.disclosureSummary}>Add something of your own</summary>
        <ActionForm
          action={addScheduleEntry}
          submitLabel="Add to the days ahead"
          note={`The time you enter is the time at ${facility.name}, whatever time it is where you are.`}
        >
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
            <span>What kind of thing</span>
            <select className={styles.select} name="kind" defaultValue="visit">
              {SCHEDULE_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {KIND_LABELS[kind]}
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
        </ActionForm>
      </details>

      <ActionForm
        action={syncCalendarNow}
        submitLabel={`Refresh from ${facility.name}`}
        pendingLabel="Refreshing"
        variant="quiet"
        note={
          calendars.length === 0
            ? "No care home calendar is connected."
            : lastSynced
              ? `Last refreshed ${formatWhen(lastSynced, facility.timezone)}.`
              : "Not refreshed yet."
        }
      >
        <input type="hidden" name="personId" value={person.id} />
      </ActionForm>
    </section>
  );
}

function PhotosSection({ person, photos }: { person: Person; photos: Photo[] }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Faces</h2>
        <p className={styles.note}>
          One at a time on the screen, with the name written underneath. A face without a name is
          a test, and the device never tests anybody.
        </p>
      </div>

      {photos.length === 0 ? (
        <p className={styles.empty}>No faces yet. The screen shows the words on their own.</p>
      ) : (
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
              <RemoveForm action={deletePhoto}>
                <input type="hidden" name="personId" value={person.id} />
                <input type="hidden" name="photoId" value={photo.id} />
              </RemoveForm>
            </li>
          ))}
        </ul>
      )}

      <details className={styles.disclosure}>
        <summary className={styles.disclosureSummary}>Add a face</summary>
        <ActionForm
          action={addPhoto}
          submitLabel="Add this face"
          note="Uploading from your phone is not built yet, because storage is not connected. For now this takes a picture address."
        >
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
            <input
              className={styles.input}
              name="url"
              placeholder="/fixtures/photo-anna.svg"
              required
            />
          </label>
        </ActionForm>
      </details>
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
      {messages.length === 0 ? (
        <p className={styles.empty}>Nothing recorded.</p>
      ) : (
        <ul className={styles.list}>
          {messages.map((message) => (
            <li key={message.id} className={styles.row}>
              <div className={styles.rowMain}>
                <strong>{message.fromName}</strong>
                <span className={styles.rowMeta}>
                  {formatWhen(message.recordedAt, facility.timezone)}
                </span>
                <p className={styles.quote}>
                  {resolveText(message.transcript, person.primaryLanguage, person.languages) ??
                    "No transcript"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className={styles.note}>
        Recording is not built yet, because storage is not connected.
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
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Screens in the room</h2>
        <p className={styles.note}>
          Turning a screen off makes it go quiet straight away, wherever it is.
        </p>
      </div>

      {devices.length === 0 ? (
        <p className={styles.empty}>No screens set up.</p>
      ) : (
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
              {device.revokedAt ? (
                <span className={styles.tag}>Off</span>
              ) : (
                <RemoveForm action={revokeDeviceToken} label="Turn it off">
                  <input type="hidden" name="personId" value={person.id} />
                  <input type="hidden" name="token" value={device.token} />
                </RemoveForm>
              )}
            </li>
          ))}
        </ul>
      )}

      <details className={styles.disclosure}>
        <summary className={styles.disclosureSummary}>Add another screen</summary>
        <ActionForm action={createDeviceToken} submitLabel="Add this screen">
          <input type="hidden" name="personId" value={person.id} />
          <label className={styles.field}>
            <span>What to call it</span>
            <input className={styles.input} name="label" placeholder="Bedside tablet" />
          </label>
        </ActionForm>
      </details>
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

function formatTime(at: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(at);
}

/**
 * A week of meals is ten rows of nearly the same thing. Grouped under a day it
 * reads as days, which is how anybody thinking about a visit is thinking.
 */
function groupByDay(
  entries: ScheduleEntry[],
  timezone: string,
): { key: string; title: string; entries: ScheduleEntry[] }[] {
  const now = new Date();
  const today = zonedParts(now, timezone);
  const tomorrow = zonedParts(new Date(now.getTime() + DAY_MS), timezone);

  const days = new Map<string, ScheduleEntry[]>();
  for (const entry of entries) {
    const parts = zonedParts(entry.startsAt, timezone);
    const key = `${parts.year}-${parts.month}-${parts.day}`;
    days.set(key, [...(days.get(key) ?? []), entry]);
  }

  return [...days.entries()].map(([key, dayEntries]) => {
    const parts = zonedParts(dayEntries[0].startsAt, timezone);
    const sameDay = (other: typeof parts) =>
      parts.year === other.year && parts.month === other.month && parts.day === other.day;

    const title = sameDay(today)
      ? "Today"
      : sameDay(tomorrow)
        ? "Tomorrow"
        : new Intl.DateTimeFormat("en-GB", {
            timeZone: timezone,
            weekday: "long",
            day: "numeric",
            month: "long",
          }).format(dayEntries[0].startsAt);

    return { key, title, entries: dayEntries };
  });
}
