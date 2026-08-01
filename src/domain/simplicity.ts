import type { SimplicityLevel } from "./types";

/**
 * The simplicity dial as capabilities (PROJECT.md section 7). One family
 * controlled setting, resolved in exactly one place, so that reducing the
 * device as the disease progresses is a single decision and not a pile of
 * feature flags that drift apart.
 *
 * Nothing outside this file may branch on the raw level.
 */
export interface Capabilities {
  /** Day and part of the day. On at every level. It is the whole point. */
  showDayAndPartOfDay: boolean;
  showLocation: boolean;
  showNextThing: boolean;
  showPhoto: boolean;
  /** Mode one, always on and entirely local. */
  listenLocally: boolean;
  /** Nora may start talking without being asked first. */
  speakUnprompted: boolean;
  /** Mode two, invoked and cloud backed. */
  offerConversation: boolean;
  /** Family recorded voice messages are offered on the screen. */
  offerVoiceMessages: boolean;
}

const CAPABILITIES: Record<SimplicityLevel, Capabilities> = {
  full: {
    showDayAndPartOfDay: true,
    showLocation: true,
    showNextThing: true,
    showPhoto: true,
    listenLocally: true,
    speakUnprompted: true,
    offerConversation: true,
    offerVoiceMessages: true,
  },
  guided: {
    showDayAndPartOfDay: true,
    showLocation: true,
    showNextThing: true,
    showPhoto: true,
    listenLocally: true,
    speakUnprompted: true,
    offerConversation: false,
    offerVoiceMessages: true,
  },
  calm: {
    showDayAndPartOfDay: true,
    showLocation: true,
    showNextThing: true,
    showPhoto: true,
    listenLocally: true,
    speakUnprompted: false,
    offerConversation: false,
    offerVoiceMessages: false,
  },
  /**
   * "The day and a face, and speaks only when spoken to" (PROJECT.md section
   * 7). Location comes off here even though it is the strongest orientation
   * cue we have, because the brief is explicit about what remains. Worth
   * revisiting once we know whether orientation or presence is the primary
   * need, which is an open question in section 14.
   */
  minimal: {
    showDayAndPartOfDay: true,
    showLocation: false,
    showNextThing: false,
    showPhoto: true,
    listenLocally: true,
    speakUnprompted: false,
    offerConversation: false,
    offerVoiceMessages: false,
  },
};

export function capabilitiesFor(level: SimplicityLevel): Capabilities {
  return CAPABILITIES[level];
}
