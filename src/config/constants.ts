/**
 * Product decisions expressed as numbers. Every value here came from a
 * constraint in PROJECT.md rather than from taste, so each one carries the
 * reason it exists. Changing one is a product change.
 */

/* Typography and contrast (PROJECT.md section 4) */

/**
 * Absolute floor for any text on the room screen, in CSS pixels at the room
 * screen's base viewport. Derived from reading at three metres: normal reading
 * distance is roughly 40cm, so three metres needs about 7x the angular size of
 * a 16px body face. We floor rather than compute per device because a tablet
 * that reports an odd viewport must still be legible.
 */
export const ROOM_MIN_TEXT_PX = 40;

/** Nothing below this weight. The ageing eye loses thin strokes first. */
export const ROOM_MIN_FONT_WEIGHT = 600;

/** Tracking at 0 or slightly positive, never negative. Value is in em. */
export const ROOM_MIN_LETTER_SPACING_EM = 0;

/** WCAG contrast ratios. AAA is the target on the room screen, AA the floor. */
export const WCAG_AAA_NORMAL_TEXT = 7;
export const WCAG_AAA_LARGE_TEXT = 4.5;
export const WCAG_AA_NORMAL_TEXT = 4.5;

/**
 * The room screen has no normal text, everything on it is large by WCAG's
 * definition. We still hold the room screen to the normal text AAA number,
 * because "large" in the spec means 24px and ours starts at 40px but is being
 * read from six times further away.
 */
export const ROOM_TARGET_CONTRAST = WCAG_AAA_NORMAL_TEXT;

/* Ambient light and dimming (PROJECT.md section 4) */

/**
 * Illuminance in lux below which the room is treated as dark and the screen
 * drops to its night palette. Roughly a dim bedroom at night. A bright screen
 * at 3am causes sleep disruption and disorientation.
 */
export const NIGHT_LUX_THRESHOLD = 12;

/** Illuminance above which the screen runs at full brightness. */
export const DAYLIGHT_LUX_THRESHOLD = 200;

/**
 * Floor for palette dimming, as a multiplier on the ink channels. Not chosen
 * for looks: below 0.7 the night palette's primary ink drops out of AAA against
 * the night surface. The surface is never dimmed, because dimming both ends of
 * a pair collapses the contrast ratio toward 1.
 *
 * This dims the pixels, not the backlight. Real backlight control is not
 * reachable from a PWA and lives behind the ScreenBrightness interface.
 */
export const MIN_INK_DIM = 0.7;
export const MAX_INK_DIM = 1;

/**
 * Floor for the native backlight, once there is a native shell to set it. The
 * screen never goes fully dark: an unlit rectangle in a dark room is a thing
 * that has stopped working, and this device is meant to be a presence.
 */
export const MIN_SCREEN_BRIGHTNESS = 0.15;

/**
 * Hours used to infer darkness when no ambient light sensor is available.
 * Most tablets do not expose one, so this is the common path, not the fallback.
 */
export const ASSUMED_DARK_START_HOUR = 20;
export const ASSUMED_DARK_END_HOUR = 6;

/* Motion (PROJECT.md section 4) */

/** Crossfade duration in ms. Slow enough that it does not read as movement. */
export const ROOM_CROSSFADE_MS = 1200;

/** How often the room screen re-derives what it shows. */
export const ROOM_TICK_MS = 15_000;

/**
 * How long a single face stays on screen before crossfading to the next, in
 * minutes. Slow, because the photo is presence rather than content, and a face
 * that changes while someone is looking at it is a moving thing in the room.
 */
export const PHOTO_ROTATION_MINUTES = 90;

/* Voice, mode one (PROJECT.md section 5) */

/**
 * How long the rolling transcript buffer retains anything, in ms. The buffer
 * holds text only, never audio, and is overwritten continuously.
 */
export const TRANSCRIPT_BUFFER_MS = 4_000;

/** Hard cap on buffer entries, so a talkative room cannot grow it without bound. */
export const TRANSCRIPT_BUFFER_MAX_ENTRIES = 12;

/**
 * Score at or above which a local intent match is acted on and spoken.
 * Silence beats a wrong answer, so this is deliberately high.
 */
export const INTENT_SPEAK_THRESHOLD = 0.72;

/**
 * Score at or above which we believe we were addressed but do not understand.
 * Between this and the speak threshold we show on screen or offer mode two,
 * and say nothing.
 */
export const INTENT_ADDRESSED_THRESHOLD = 0.45;

/** Maximum sentences in a spoken answer. Longer replies exceed working memory. */
export const MAX_SPOKEN_SENTENCES = 2;

/** Maximum words in a spoken answer, as a second guard on length. */
export const MAX_SPOKEN_WORDS = 30;

/**
 * Delay between waking the screen and starting to speak, in ms. Light before
 * sound, so the voice has somewhere visible to come from.
 */
export const LIGHT_BEFORE_SOUND_MS = 700;

/**
 * Minimum gap between two unprompted utterances, in ms. A device that talks
 * often enough to be noticed as a presence is a different product.
 */
export const MIN_UNPROMPTED_GAP_MS = 90_000;

/* Parts of the day (PROJECT.md section 4) */

/**
 * Boundaries between the four words we use for the part of the day. These are
 * institutional rhythms, not astronomical ones: a care home breakfast is early
 * and the evening meal is early too, so the words have to match the day the
 * person is actually living.
 */
export const MORNING_START_HOUR = 5;
export const AFTERNOON_START_HOUR = 12;
export const EVENING_START_HOUR = 17;
export const NIGHT_START_HOUR = 21;

/* Schedule (PROJECT.md sections 4 and 7) */

/**
 * How far ahead the room screen will look for the one next thing, in minutes.
 * Beyond this, an event is not "next", it is just the future, and showing it
 * invites a question we cannot answer well.
 */
export const NEXT_THING_HORIZON_MINUTES = 8 * 60;

/**
 * How long after an event starts it still counts as the current thing rather
 * than being skipped over, in minutes.
 */
export const EVENT_STILL_CURRENT_MINUTES = 30;

/**
 * How recently a family note must have been written to outrank the schedule,
 * in minutes. A note written this morning is the family telling us something
 * the calendar does not know. A note from last week is stale even if it has
 * not formally expired.
 */
export const NOTE_OUTRANKS_SCHEDULE_MINUTES = 12 * 60;
