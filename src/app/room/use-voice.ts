"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LIGHT_BEFORE_SOUND_MS } from "@/config/constants";
import { answerFor } from "@/domain/voice/answers";
import { RollingTranscriptBuffer } from "@/domain/voice/buffer";
import { decide, matchIntent } from "@/domain/voice/matcher";
import { knownSubjects } from "@/domain/voice/subjects";
import type { RoomData } from "@/domain/room-view";
import type { AnswerPolicy } from "@/domain/types";
import {
  MockRecognizer,
  WebSpeaker,
  WebSpeechRecognizer,
  cloudAsrAllowed,
  type SpeechRecognizer,
  type Speaker,
} from "@/services/speech";

/**
 * Mode one on the device: listen, match locally, answer from the same data the
 * screen shows, and stay quiet when unsure.
 *
 * Everything here runs in the browser. Nothing is sent anywhere, nothing is
 * stored, and the only state that outlives an utterance is the timestamp of the
 * last thing said out loud.
 *
 * Unprompted speech is deliberately not implemented. Whether a device that
 * answers before it is asked is comforting or unsettling is an open question
 * (PROJECT.md section 14), and the brief says to Wizard of Oz it with a human
 * listening before writing any of it. The capability flag exists and does
 * nothing yet, which is the honest state.
 */

export type VoiceState =
  | { kind: "off" }
  | { kind: "listening" }
  | { kind: "answering"; text: string; rule: string }
  | { kind: "addressed" };

export interface UseVoiceOptions {
  data: RoomData;
  policy: AnswerPolicy | null;
  /** From the simplicity dial and the family mic switch, combined upstream. */
  enabled: boolean;
  now: () => Date;
}

export interface UseVoiceResult {
  state: VoiceState;
  /** True when the recogniser in use sends audio off the device. */
  transmitsAudio: boolean;
  /** Feed the matcher by hand. The prototype's Wizard of Oz control. */
  say(text: string): void;
}

export function useVoice(options: UseVoiceOptions): UseVoiceResult {
  const { data, policy, enabled, now } = options;

  /**
   * Only what an utterance produced. Listening and off are derived below rather
   * than stored, so the hook never has to write state during an effect to keep
   * two representations of the same fact in step.
   */
  const [heard, setHeard] = useState<VoiceState | null>(null);

  const buffer = useMemo(() => new RollingTranscriptBuffer(), []);
  const speaker = useRef<Speaker | null>(null);
  const recognizer = useRef<SpeechRecognizer | null>(null);

  /**
   * Who the matcher may recognise being asked about, with the relationships
   * they get asked for by. See domain/voice/subjects.ts.
   */
  const subjects = useMemo(() => knownSubjects(data, policy), [data, policy]);

  const handle = useCallback(
    (heard: string) => {
      const at = now();
      buffer.push(heard, at.getTime());

      const match = matchIntent(buffer.read(at.getTime()), {
        subjects,
        languages: data.person.languages,
      });

      switch (decide(match)) {
        case "ignore":
          return;
        case "addressed-not-understood":
          // We believe we were spoken to and did not understand. That is a
          // screen event. Saying anything here would be guessing out loud.
          setHeard({ kind: "addressed" });
          return;
        case "answer":
          break;
      }
      if (!match) return;

      const answer = answerFor(match, { data, policy, now: at, asked: true });
      if (!answer.speak) {
        setHeard({ kind: "addressed" });
        return;
      }

      // Light before sound. The screen changes first so the voice has somewhere
      // visible to come from.
      setHeard({ kind: "answering", text: answer.show ?? answer.speak, rule: answer.rule });
      buffer.clear();

      const toSay = answer.speak;
      globalThis.setTimeout(() => {
        void speaker.current?.speak(toSay, match.language);
      }, LIGHT_BEFORE_SOUND_MS);
    },
    [buffer, data, subjects, now, policy],
  );

  useEffect(() => {
    if (!enabled) return;

    speaker.current = new WebSpeaker();

    // Default is the mock, which opens no microphone and transmits nothing. The
    // cloud backed recogniser is opt in, see services/speech.ts for why.
    const recogniser: SpeechRecognizer = cloudAsrAllowed()
      ? new WebSpeechRecognizer(data.person.primaryLanguage)
      : new MockRecognizer();
    recognizer.current = recogniser;

    recogniser.start((result) => {
      if (result.isFinal) handle(result.text);
    });
    const stopBuffer = buffer.start(() => now().getTime());

    return () => {
      recogniser.stop();
      stopBuffer();
      speaker.current?.cancel();
      buffer.clear();
      recognizer.current = null;
      setHeard(null);
    };
  }, [enabled, data.person.primaryLanguage, handle, buffer, now]);

  const say = useCallback(
    (text: string) => {
      const recogniser = recognizer.current;
      if (recogniser instanceof MockRecognizer) recogniser.emit(text);
      else handle(text);
    },
    [handle],
  );

  // Off and listening are facts about the configuration, not about anything
  // that was said, so they are derived rather than stored.
  const state: VoiceState = enabled ? (heard ?? { kind: "listening" }) : { kind: "off" };

  return { state, transmitsAudio: enabled && cloudAsrAllowed(), say };
}
