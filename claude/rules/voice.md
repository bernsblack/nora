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
- **No clock phrasings, and the mechanism is `requires` rather than absence.** The screen deliberately never shows a clock face, so the hour is a question this device does not answer. Deleting the phrasings from the day intent was not enough and made things worse: they were added to `when-is-meal` as the repair, and "what time is it" then scored 0.767 against "what time is lunch" and was answered aloud with the next meal. `Intent.requires` is what actually holds it. An intent that turns on specific words is not scored at all until one of them is heard, so "what time is lunch" still answers and "what time is it" never reaches it.
- **`Intent.requires` is for intents that are one noun away from an ordinary sentence.** `going-home` carries it because "ek wil toilet toe gaan" shares four words of five with "ek wil huis toe gaan" and was answered "you are staying here, you are safe" to a woman who needed the toilet. Use it only where the intent genuinely turns on specific words. On a question that can be asked many ways it is a recall bug waiting to happen.

### Three mechanisms that do not work, all measured

Do not spend a session rediscovering these. Each was implemented against the real suite and reverted, and the account is in `personas/FINDINGS.md` finding 8.

- **A minimum precision floor is inverted here.** The wandering question that has to keep working sits at 0.250, one false positive at 0.250, the other at 0.500. No value separates them.
- **Keeping the copulas** closes two false positives and breaks `halina-fragment-english`, dropping "day, what day" to 0.67.
- **Requiring a shared adjacent pair changes nothing on its own**, because stopword removal has already collapsed each phrasing to exactly the pair the false positive contains. `where is <subject>` is `[where, xsubjectx]`, and "where Stefan" contains that, adjacent.

The through line: **every mechanism that protects Halina's husband costs Halina's day fragment**, because both are a short fragment partially matching a short phrasing. No bag of words scorer can read them differently. Reason about the token arrays and not the phrasings as written; `tokenise` is exported and it is a two line probe.

### Four persona scenarios are red on purpose

`marta-handbag-sentence`, `trevor-glasses`, `trevor-lovely-day` and `halina-fragment-husband` fail, and are not to be fixed by tuning the scorer. They are the standing description of what this approach cannot do, and the acceptance criteria for whatever replaces it. Softening them is the one edit that is never acceptable here.

## The matcher may be replaced by a model. The answer policy may not

Decided 2026-08-03. The matcher is a candidate for replacement by a small model doing intent classification and subject extraction, because that is what it has repeatedly failed at and what a model is good at. See `worklog/2026-08-02-on-device-speech/`.

The line that matters is **classification is not generation**. A model may decide which intent was heard and who was named. It hands off to the scripted answer policy, which stays exactly as it is.

Nothing about the answer policy moves into a prompt. The three floors in `src/domain/answer-policy/` are branches with tests across every mode, and a prompt instruction is a probabilistic constraint on output nobody can prove. For the path that decides what a woman believes about whether her husband is alive, that is a change in kind rather than degree.

Two more things a model does not fix, so do not let it be sold as fixing them:

- **A cloud call cannot be mode one.** No network, and `LIGHT_BEFORE_SOUND_MS` is 700ms. On-device or not at all.
- **Silence is the wrong shape for a language model.** Its failure mode is fluency, and this product's required failure mode is saying nothing. Whatever replaces the matcher has to be able to abstain, and that is the property to test first.

## Answers come from the same data the screen renders

`answerFor` reads the room data, not a second source. `what-happens-next` deliberately answers with the line already on screen, which makes it impossible for the spoken answer to contradict the visible one even in principle. Keep new intents on that footing.

Length is capped by `MAX_SPOKEN_SENTENCES` and `MAX_SPOKEN_WORDS`, and `trimToSpokenLength` is not optional politeness.

## Light before sound

`LIGHT_BEFORE_SOUND_MS` before speaking, always, so the voice has somewhere visible to come from. In the room screen this is why ink dims to `MAX_INK_DIM` the moment an answer exists, ahead of the utterance.

## Unprompted speech is not built

The capability exists in the simplicity dial and does nothing. PROJECT.md section 14 says to Wizard-of-Oz it with a human listening before writing any of it, and that has not happened. `MIN_UNPROMPTED_GAP_MS` is there for when it does.
