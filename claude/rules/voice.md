---
paths:
  - 'src/domain/voice/**'
  - 'src/app/room/use-voice.ts'
  - 'src/services/speech.ts'
---

# Mode one: the voice layer

PROJECT.md section 5. Always on, entirely local, narrow intent set, works with no network.

## Privacy is architectural

Continuous capture in the bedroom of someone who cannot consent is defensible only if these are literally true at the code level:

- **No audio is written to disk, ever.**
- **No audio is transmitted in mode one.**
- **The buffer exists in memory for a couple of seconds and is overwritten.**

The exposure that matters is not the resident. It is the cleaners, nurses, physios and visiting relatives who consented to nothing. The only answer that survives a care home compliance officer is that no recording exists.

`src/domain/voice/privacy.test.ts` enforces this by scanning the source of this directory for `MediaRecorder`, `AudioContext`, `createMediaStreamSource`, `getUserMedia`, `indexedDB`, `localStorage`, `sessionStorage`, `writeFile`, `createWriteStream`, and any `fetch(`. If you need one of those here, you are building a different product and the conversation is with a human, not with the test.

`fetch` is on that list for two reasons at once: it would transmit, and it would make mode one require a network.

## The Web Speech API cannot ship

Chrome and Firefox both stream microphone audio to a cloud service, which cannot coexist with floor two. It is gated behind `NEXT_PUBLIC_ALLOW_CLOUD_ASR`, defaults off, and exists only for testing with the team's own voices. The default `MockRecognizer` opens no microphone at all.

On-device ASR is flagged in the brief as an open question for mode two. It is a mode one problem too, and that is the single largest unresolved engineering risk in the product.

## Silence beats a wrong answer

Two thresholds, both named in `src/config/constants.ts`:

- At or above `INTENT_SPEAK_THRESHOLD`, answer aloud.
- Between that and `INTENT_ADDRESSED_THRESHOLD`, we believe we were addressed and did not understand. Show something, offer mode two, say nothing.
- Below, ignore. Not "ask them to repeat". Ignore.

A device that misses a question fails small. A device that talks to an empty room is a voice with no source, and auditory hallucination is common in later Alzheimer's and near universal in Lewy body dementia.

## What the matcher learned the hard way

Read `personas/FINDINGS.md` before changing `matcher.ts`, `intents.ts` or `subjects.ts`. All seven defects the persona run found were here, and the fixes are load bearing:

- **Pronouns are not stopwords.** In both languages the pronoun is the entire difference between "where am I", "where is my husband" and "where is my handbag". With them removed all three collapse to one token and the device answers the wrong question warmly. `it` stays on the list because a dummy subject carries no signal.
- **`MIN_EVIDENCE_TOKENS` is 2.** One shared token is a coincidence, not evidence. A phrasing that reduces to a single content token matches a large share of everything anybody says.
- **Every phrasing must survive stopword removal with at least two content tokens.** There is a test that fails the intent set otherwise. Four phrasings were that thin when it was added.
- **Subjects carry their relationship as an alias, with the possessive swapped.** The family writes "jou man" from the device's side, the resident says "my man" from her own. As the name goes, the relationship is what remains, so this is the form the hardest question in the product usually arrives in.
- **No clock phrasings.** The screen deliberately never shows a clock face, so the hour is a question this device does not answer. Inviting it in the intent set was a bug in the intent set.

## Answers come from the same data the screen renders

`answerFor` reads the room data, not a second source. `what-happens-next` deliberately answers with the line already on screen, which makes it impossible for the spoken answer to contradict the visible one even in principle. Keep new intents on that footing.

Length is capped by `MAX_SPOKEN_SENTENCES` and `MAX_SPOKEN_WORDS`, and `trimToSpokenLength` is not optional politeness.

## Light before sound

`LIGHT_BEFORE_SOUND_MS` before speaking, always, so the voice has somewhere visible to come from. In the room screen this is why ink dims to `MAX_INK_DIM` the moment an answer exists, ahead of the utterance.

## Unprompted speech is not built

The capability exists in the simplicity dial and does nothing. PROJECT.md section 14 says to Wizard-of-Oz it with a human listening before writing any of it, and that has not happened. `MIN_UNPROMPTED_GAP_MS` is there for when it does.
