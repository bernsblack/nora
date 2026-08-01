# What the persona run found

First run: **7 of 39 scenarios failed.** All seven were defects in the device, not in the scenarios. This file records what they were, because a fixed bug with no account of it is indistinguishable from a bug that was never there.

Everything below is closed. The run is green.

---

## 1. "Where is my husband" produced silence

**Severity: the highest in the product.**

PROJECT.md section 6 opens with this exact sentence as the example of the hardest thing Nora has to handle. Asked by name, "waar is Jan", it worked. Asked by relationship, "waar is my man" or "where is my husband", the matcher recognised the intent perfectly at a score of 1.00 and then said nothing at all, because it could not work out who was being asked about.

The cause was that subject recognition matched names only. The doc comment above the function claimed it also matched relationship words. It did not, and had never been tested, so the comment had been quietly false since it was written.

This matters more than a missed question. As the name goes, the relationship is what remains: Marta says "my man" more often than she says "Jan", and increasingly so. The device was failing precisely the question it exists to answer, in the form it is most often asked.

**Fixed** by adding `src/domain/voice/subjects.ts`, which builds the set of people the device may recognise from the answer policy, the faces, and the expected visitors, and carries each person's relationship as an alias. The family writes the relationship from the device's side, "jou man", and the resident says it from her own, "my man", so aliases are generated with the possessive swapped.

The matcher now substitutes any recognised person for a slot token before scoring, which also means one phrasing covers every name.

## 2. Distress was answered with "I am Nora"

Marta says "ek weet nie wat aangaan nie, ek weet nie", which is not a question and wants a person, not a device. Nora answered "Ek is Nora. Ek is hier by jou." at a score of 0.77.

The cause was stopword removal reducing the phrasing "wat is jy" to the single token "wat". Any utterance containing "wat", which is a large share of everything anybody says in Afrikaans, matched it at full recall.

**Fixed** in two ways. A match now needs at least two content tokens in common before it can be acted on, because one shared word is a coincidence rather than evidence. And a test now fails any phrasing in the intent set that survives stopword removal with fewer than two content tokens, so this class cannot come back. Four phrasings were found to be that thin and were rewritten.

## 3. "Where is my handbag" was answered with the name of the care home

Marta asks where her handbag is. Nora replied "Jy is by Willowbrook, kamer 12." at 0.85.

The cause was that "ek" and "my" were on the stopword list, so "waar is ek" (where am I), "waar is my man" (where is my husband) and "waar is my handsak" (where is my handbag) all collapsed to the single token "waar".

**Fixed** by taking pronouns off the stopword lists in both languages. In Afrikaans and English alike the pronoun is the entire difference between those three questions. "it" stayed on the list, because a dummy subject in "what day is it" carries no signal in the way a real pronoun does.

This one is worth dwelling on: the device was not merely wrong, it was confidently wrong about a question it had no business answering, and it would have been wrong in a warm and plausible sounding voice.

## 4. "When is the physio coming" matched nothing

Trevor's physio is on his calendar as care, which is neither a meal nor a visit. The intent set had `when-is-meal` and `when-is-visit` and no way to ask about the appointment sitting between them, so the question scored 0.67 and fell into the middle band.

**Fixed** by adding a `what-happens-next` intent, which answers with the line already on the screen. That makes it impossible for this answer to disagree with the screen even in principle, and it covers a family of questions the intent set was missing entirely: what is happening today, what am I doing, when is the doctor coming.

## 5. "What time is supper" was matched as a question about the day

Score 0.67 against `what-day-is-it`, via the phrasing "what time of day is it", so it fell short of answering anything.

**Fixed** by removing clock questions from the day intent and adding "what time is lunch" and "what time is supper" to meals. The removal is the more principled half: the room screen deliberately never shows a clock face, so a question about the hour is one this device does not answer, and having phrasings that invited it was a bug in the intent set rather than in the scoring.

## 6. "Where is Dorothy" was matched as "where am I"

Trevor's wife is alive and in the next room. Asking after her matched `where-am-i`, because "where" alone carried the whole match once the stopwords were removed.

**Fixed** by the same subject slot work as finding 1. A recognised person in the utterance now makes `where-is-person` the obvious match.

## 7. Halina's fragmentary English was rejected

"day, what day" is close to the most she can produce. It scored 0.67 and got nothing, which for the one persona who has almost no route into the product at all was the worst place to lose a match.

**Fixed** as a side effect of the stopword work. It now answers.

---

## What the run did not find, and what that means

The hard floors held throughout. Across all 39 utterances from all three residents, nothing produced a death, nothing exceeded two sentences, and nothing was said to anybody speaking Polish. Those are the three properties that matter most and they were correct before the personas existed, which is what the unit tests in `src/domain/answer-policy/` were for.

The pattern in the seven failures is worth naming. Every one was a **precision or coverage failure in the matcher**, and none was a failure in the answer policy. The dangerous half of the product, what Nora says about the dead, was already well tested because it was written with tests. The matcher was written with tests too, and they all passed, because the test used the same phrasings the matcher was built from. It took utterances written from the other direction to find anything.

That is the argument for this folder existing, and it is also the argument for PROJECT.md section 8's instruction to test with real recordings before trusting mode one. These scenarios are written, not collected. They found seven defects. Real recordings will find more, and the ones they find will be the ones nobody thought to write down.

## Findings with no code fix

These came out of writing the personas rather than running them, and they are product decisions rather than bugs.

| Finding | Persona | Where |
| --- | --- | --- |
| The location line hardcodes the word "room", which is wrong for anybody in a flat | Trevor | `src/i18n/strings.ts` |
| A resident who can consent cannot turn off the microphone himself | Trevor | Family app only, by design, and the design is wrong for early stage |
| Nobody asked Trevor whether he wanted the device | Trevor | The ethics position assumes a person who cannot consent |
| Two family members with equal standing and opposite views on the answer policy, and whoever logs in wins | Pieter | `src/services/family-auth.ts` |
| No record of who changed a sensitive topic, or when | Pieter | |
| Language reversion is a dropdown somebody has to notice needs changing | Marta | |
| The product does nothing for a resident outside its two languages while still sitting in her room listening | Halina | |
| Refusing to report what a resident asks about is defensible and costs something real | Anna, Pieter | PROJECT.md section 12 |
