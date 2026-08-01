/**
 * The shared vocabulary for both surfaces. These types are the contract between
 * the family app (which writes) and the room screen (which only ever reads).
 */

/**
 * Both v1 languages live at once rather than behind a toggle, because speakers
 * switch mid sentence. Four more follow once the launch market is settled, so
 * nothing may assume the set has exactly two members.
 */
export const LANGUAGES = ["en", "af"] as const;
export type Language = (typeof LANGUAGES)[number];

/**
 * Text a family member wrote, or a string we ship, in whichever languages it
 * exists. Never assume a key is present. Resolve through resolveText so the
 * fallback order stays in one place.
 */
export type LocalizedText = Partial<Record<Language, string>>;

/**
 * The simplicity dial (PROJECT.md section 7). One family controlled setting
 * that reduces what the device does as the disease progresses. Ordered from
 * least to most reduced. Capabilities are derived in domain/simplicity.ts, so
 * nothing branches on the raw level outside that file.
 */
export const SIMPLICITY_LEVELS = ["full", "guided", "calm", "minimal"] as const;
export type SimplicityLevel = (typeof SIMPLICITY_LEVELS)[number];

/**
 * How Nora answers a question that touches a hard truth (PROJECT.md section 6).
 * Set per person by the family as an explicit choice at setup, optionally
 * overridden per topic.
 */
export const ANSWER_POLICY_MODES = ["gentle-redirection", "validation", "truthful"] as const;
export type AnswerPolicyMode = (typeof ANSWER_POLICY_MODES)[number];

/** Why a person cannot be reached. Drives which wording the engine may use. */
export const TOPIC_SITUATIONS = [
  "deceased",
  "moved-away",
  "estranged",
  "in-hospital",
  "in-care",
  "other",
] as const;
export type TopicSituation = (typeof TOPIC_SITUATIONS)[number];

export interface Facility {
  id: string;
  /** Spoken and shown verbatim. "You are at Willowbrook." */
  name: string;
  /** IANA zone. Everything the room screen renders is derived in this zone. */
  timezone: string;
}

export interface Person {
  id: string;
  facilityId: string;
  /** The name they answer to, not their legal name. */
  preferredName: string;
  /**
   * The room label alone, "12" or "3B", without the word room. The word is
   * localised at render time, so this must not contain it.
   */
  roomLabel: string;
  /**
   * What the family chose to call the voice, localised to the person. Falls
   * back to config only if unset.
   */
  voiceName: string;
  /**
   * The language the room screen renders in. Changeable at any time, because
   * people revert to a mother tongue partway through the disease at a point
   * where they cannot tell us to.
   */
  primaryLanguage: Language;
  /** Every language we listen for. Always includes primaryLanguage. */
  languages: Language[];
  simplicity: SimplicityLevel;
  /**
   * The software microphone switch the family controls (PROJECT.md section 5).
   * When false the room device opens no microphone at all, and the screen says
   * so in words readable from across the room.
   */
  micEnabled: boolean;
}

export interface SensitiveTopic {
  id: string;
  personId: string;
  /** The person being asked about. "Jan". */
  subjectName: string;
  /** How the resident refers to them. "your husband". */
  relationship: LocalizedText;
  situation: TopicSituation;
  /** Overrides the person's default mode for this topic only. */
  mode?: AnswerPolicyMode;
  /**
   * Exact wording written by the family. Used verbatim when present, subject
   * to the hard floors in domain/answer-policy.
   */
  familyWording?: LocalizedText;
}

export interface AnswerPolicy {
  personId: string;
  /**
   * No implicit default at the data layer. The family makes this choice
   * explicitly at setup. domain/answer-policy supplies the fallback when a
   * record genuinely has none, and that fallback is gentle redirection.
   */
  defaultMode: AnswerPolicyMode;
  topics: SensitiveTopic[];
}

/** Where a schedule entry came from. Family entries win over calendar ones. */
export const SCHEDULE_SOURCES = ["family", "calendar"] as const;
export type ScheduleSource = (typeof SCHEDULE_SOURCES)[number];

export const SCHEDULE_KINDS = ["meal", "visit", "activity", "care", "rest"] as const;
export type ScheduleKind = (typeof SCHEDULE_KINDS)[number];

export interface ScheduleEntry {
  id: string;
  personId: string;
  title: LocalizedText;
  startsAt: Date;
  endsAt?: Date;
  kind: ScheduleKind;
  source: ScheduleSource;
  /** Set for visits. Lets the screen say "Anna is coming at 3". */
  visitorName?: string;
}

export interface Photo {
  id: string;
  personId: string;
  url: string;
  /** Written under the face, always. A face without a name is a quiz. */
  name: string;
  relationship: LocalizedText;
  /** Lower sorts first. The family decides who the person sees most. */
  order: number;
}

export interface VoiceMessage {
  id: string;
  personId: string;
  fromName: string;
  /** Family recorded and uploaded. Nothing captured in the room is stored. */
  audioUrl: string;
  recordedAt: Date;
  transcript?: LocalizedText;
}

/**
 * Free text from the family. "Pa is at work, home tonight." Shown as the next
 * thing when it is more current than anything on the schedule.
 */
export interface FamilyNote {
  id: string;
  personId: string;
  text: LocalizedText;
  createdAt: Date;
  /** After this, the note stops being true and stops being shown. */
  expiresAt?: Date;
}

/**
 * The room device never logs in. It holds a long lived token issued by the
 * family app and revocable there.
 */
export interface DeviceToken {
  token: string;
  personId: string;
  /** Human label so a family member can tell two devices apart. */
  label: string;
  createdAt: Date;
  lastSeenAt?: Date;
  revokedAt?: Date;
}

/** A read only calendar the family subscribed to. */
export interface CalendarSubscription {
  id: string;
  personId: string;
  url: string;
  label: string;
  /**
   * The language the facility writes its calendar in. Event titles arrive as
   * one string with no language tag, so this is the only way to file them
   * correctly, and guessing wrong puts Afrikaans text under the English key.
   */
  language: Language;
  lastSyncedAt?: Date;
}

/**
 * Resolve localised text. Falls back to the person's primary language, then to
 * any language present, then to null. Never throws, because a missing
 * translation must not blank the room screen.
 */
export function resolveText(
  text: LocalizedText | undefined,
  preferred: Language,
  fallbacks: Language[] = [],
): string | null {
  if (!text) return null;
  const order: Language[] = [preferred, ...fallbacks, ...LANGUAGES];
  for (const language of order) {
    const value = text[language]?.trim();
    if (value) return value;
  }
  return null;
}
