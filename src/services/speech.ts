import type { Language } from "@/domain/types";

/**
 * Speech in and speech out, behind interfaces because the real implementations
 * are not decided and the prototype one cannot be shipped.
 *
 * A finding worth carrying loudly. PROJECT.md section 9 lists the Web Speech
 * API as the throwaway prototype choice for speech, and PROJECT.md section 5
 * requires that in mode one no audio is transmitted. Those two cannot both be
 * true: Chrome's SpeechRecognition streams microphone audio to Google servers,
 * and so does Firefox's. The Web Speech path is therefore fine for testing
 * whether the interaction works, with the team's own voices, and must never run
 * in a room with a resident in it.
 *
 * That is why the cloud backed recogniser is opt in through
 * NEXT_PUBLIC_ALLOW_CLOUD_ASR rather than being the default. Default is the
 * mock, which transmits nothing.
 */

export interface SpeechResult {
  text: string;
  isFinal: boolean;
  /** 0 to 1, as reported by the recogniser. Mocks report 1. */
  confidence: number;
}

export interface SpeechRecognizer {
  /** Whether this recogniser can run here at all. */
  readonly available: boolean;
  /**
   * True when using this recogniser means audio leaves the device. The room
   * screen shows a different mic indicator when it does, and refuses mode one
   * unless it has been explicitly allowed.
   */
  readonly transmitsAudio: boolean;
  start(onResult: (result: SpeechResult) => void): void;
  stop(): void;
}

export interface Speaker {
  readonly available: boolean;
  speak(text: string, language: Language): Promise<void>;
  cancel(): void;
}

export function cloudAsrAllowed(): boolean {
  return process.env.NEXT_PUBLIC_ALLOW_CLOUD_ASR === "true";
}

/* Mocks. These are what runs by default, and what the tests drive. */

/**
 * Fed by hand or by a test. Nothing is captured, nothing is transmitted, and
 * the microphone is never opened.
 */
export class MockRecognizer implements SpeechRecognizer {
  readonly available = true;
  readonly transmitsAudio = false;
  private listener: ((result: SpeechResult) => void) | null = null;

  start(onResult: (result: SpeechResult) => void): void {
    this.listener = onResult;
  }

  stop(): void {
    this.listener = null;
  }

  /** Test and dev hook: pretend the room said this. */
  emit(text: string, isFinal = true): void {
    this.listener?.({ text, isFinal, confidence: 1 });
  }

  get listening(): boolean {
    return this.listener !== null;
  }
}

/** Records what it was asked to say, so tests can assert on it. */
export class MockSpeaker implements Speaker {
  readonly available = true;
  readonly spoken: { text: string; language: Language }[] = [];

  async speak(text: string, language: Language): Promise<void> {
    this.spoken.push({ text, language });
  }

  cancel(): void {}
}

/* Browser implementations. */

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<
    ArrayLike<{ transcript: string; confidence: number }> & { isFinal: boolean }
  >;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const BCP47: Record<Language, string> = { en: "en-ZA", af: "af-ZA" };

/**
 * Web Speech API. Cloud backed, see the note at the top of this file. Only
 * constructed when cloudAsrAllowed() is true.
 */
export class WebSpeechRecognizer implements SpeechRecognizer {
  readonly transmitsAudio = true;
  private recognition: SpeechRecognitionLike | null = null;
  private restart = false;

  constructor(private language: Language = "en") {}

  get available(): boolean {
    return Boolean(constructorFor());
  }

  start(onResult: (result: SpeechResult) => void): void {
    const Recognition = constructorFor();
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = BCP47[this.language];
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const alternative = result[0];
        if (!alternative) continue;
        onResult({
          text: alternative.transcript,
          isFinal: result.isFinal,
          confidence: alternative.confidence,
        });
      }
    };
    recognition.onerror = () => {};
    // Browsers stop the stream on their own schedule. Always on means restarting.
    recognition.onend = () => {
      if (this.restart) recognition.start();
    };

    this.restart = true;
    this.recognition = recognition;
    recognition.start();
  }

  stop(): void {
    this.restart = false;
    this.recognition?.stop();
    this.recognition = null;
  }
}

function constructorFor(): SpeechRecognitionConstructor | undefined {
  const scope = globalThis as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
}

/** speechSynthesis. Local on most platforms, and does not carry the ASR problem. */
export class WebSpeaker implements Speaker {
  get available(): boolean {
    return typeof globalThis !== "undefined" && "speechSynthesis" in globalThis;
  }

  async speak(text: string, language: Language): Promise<void> {
    if (!this.available) return;
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = BCP47[language];
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      speechSynthesis.speak(utterance);
    });
  }

  cancel(): void {
    if (this.available) speechSynthesis.cancel();
  }
}
