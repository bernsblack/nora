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

---

# What the panel run found

Second run, 2026-08-02, and not a persona run at all: four specialist reviewers reading the persona commit cold, deliberately without this file so they could not read the answers off it. See [`worklog/2026-08-02-matcher-precision/`](../worklog/2026-08-02-matcher-precision/).

**Nine new scenarios above, all failing.** Every score below was verified by running the live matcher before it was written down.

The result that matters most: **two of the seven defects this file calls closed are back in a different form, and in one case the fix is what caused it.**

## 8. Two shared tokens anywhere in an utterance are enough to speak

The structural one, and the parent of most of what follows. `RECALL_WEIGHT` is 0.7, so a phrasing that survives stopword removal as two tokens scores `0.7 + 0.3 * (2 / heard.length)`, which clears the 0.72 speak threshold for **any utterance up to thirty content tokens, in any word order, with anything at all in between**. `MIN_EVIDENCE_TOKENS` cannot help, because the overlap is already two.

The canonical phrasings of the most important intents are two-token pairs after stopword removal: `where am i` is `[where, i]`, `waar is <subject>` is `[waar, xsubjectx]`, `what day is it` is `[what, day]`.

| Utterance | Score | Answers with |
| --- | --- | --- |
| "what a lovely day it is today" | 0.925 | the day |
| "dit is my huis" | 1.000 | the facility name and room number |
| "i don't know where i put my glasses" | 0.775 | the facility name and room number |
| "ek weet nie waar ek my handsak gesit het nie" | 0.775 | the facility name and room number |
| "she used to know where Jan kept the keys" | 0.786 | the grief path, subject Jan |

**Finding 3 above is therefore only half closed.** "waar is my handsak" is genuinely fixed and scores 0.225. The same question in the sentence form a person actually speaks is wrong again, with the same warm confident wrong answer, because `waar` and `ek` together are the whole of `waar is ek`.

The three `marta-overheard-*` scenarios pass only because they happen to share no tokens with any phrasing. That reads as coverage of overheard speech and is not.

**A precision floor was tried and reverted, and the reason is the useful part.** The obvious fix is to require a phrasing to account for some minimum share of what was heard. It cannot work, because precision is not merely a weak signal here, it points the wrong way:

| Utterance | Precision | Should |
| --- | --- | --- |
| "oh I am sorry to bother you but what day is it" | 0.250 | answer |
| "i don't know where i put my glasses" | 0.250 | stay quiet |
| "what a lovely day it is today" | 0.500 | stay quiet |

The legitimate wandering question, which is the exact case the recall-heavy design exists to serve and which has its own unit test, sits at the same precision as one false positive and **below** the other. No threshold separates them.

Contiguity does not separate them either. Once stopwords are removed, "where am i" is `[where, i]`, and "where i put my glasses" contains `where` followed immediately by `i`. The words are adjacent and in order in both.

What actually distinguishes them is the word that was stripped. "where **am** i" against "where i put" differ only by `am`, and `am` is on the stopword list. This is the pronoun lesson from finding 3 one level further on: the stopword list is still removing tokens that carry the whole meaning. That makes the remaining work a change to tokenising, not a new threshold, and it is not a small change.

**Still open.** `marta-handbag-sentence`, `trevor-glasses`, `trevor-lovely-day` and `halina-fragment-husband` remain red.

### Three mechanisms were measured, and all three are dead ends

Each was implemented against the real suite and reverted. Recorded because the next person will otherwise try them in the same order.

**A minimum precision floor.** Inverted, as above. No value separates the cases.

**Keeping the copulas.** Taking `is`, `am`, `are`, `do` and their Afrikaans counterparts off the stopword lists closes `marta-handbag-sentence` and `trevor-glasses`, because the phrasings then carry three tokens and a partial match no longer saturates. It does **not** close `trevor-lovely-day` or `halina-fragment-husband`, and it **breaks `halina-fragment-english`**: "day, what day" falls to 0.67, into the addressed band. The trade is two false positives closed for the loss of the only utterance in the folder that works for Halina.

**Requiring a shared adjacent pair.** Word order is the only thing separating "what day is it" from "what a lovely day it is today", and "where is Stefan" from "where Stefan". Adding an adjacency gate on its own changes **nothing at all**, because stopword removal has already collapsed the phrasings to exactly the pair the false positive contains: `where is <subject>` is `[where, xsubjectx]`, which "where Stefan" contains, adjacent. Adjacency only becomes a real signal in combination with keeping the copulas, and that combination still leaves Halina's fragment in the addressed band on recall.

### What that adds up to

**Every mechanism that protects Halina's husband costs Halina's day fragment.** It has now been shown three separate ways, and it is a property of scoring a two token phrasing against a two token utterance rather than a bug in any of the three attempts.

The fragment that works for her and the fragment that harms her are the same shape, and no scorer that reads them as bags of words can treat them differently. Closing the remaining four means either accepting that she loses her only working route, or scoring something other than a bag of words. That is a product decision and it is recorded as open in the plan.

## 9. The clock fix moved the defect instead of closing it

Finding 5 above removed clock phrasings from `what-day-is-it` and added "what time is lunch" and "what time is supper" to `when-is-meal`. That second half is what broke it: "what time is it" now scores **0.767** against "what time is lunch" and is spoken aloud as the next meal. Asked the time, the device says "Tea at 3."

The comment at the top of the day intent still says a question about the hour is "one we do not answer at all", and `claude/rules/voice.md` still records it as a load bearing fix. Neither held. Afrikaans was luckier by accident at 0.667, which landed in the addressed band, so the two languages did not behave the same way on the same question.

**Closed.** `when-is-meal` now carries `requires`, a set of meal and eating words, and is not scored at all unless one of them was heard. "what time is lunch" still answers; "what time is it" drops to 0.25 and "hoe laat is dit" to 0.17, both ignored in both languages. This is the mechanism the comment always described and never had.

## 10. "When is my husband coming" routes around the answer policy

"wanneer kom Jan" matches `when-is-visit` at **1.000**, beating `where-is-person`'s "wanneer kom <subject> terug" at 0.825. The visit answer filters the schedule for a visitor of that name, finds none, and speaks "'n Rustige dag."

`answerSensitive` is never called. No mode, no family wording, no floor. Under a family who chose truthfulness, "a quiet day" in answer to "when is he coming" is a statement that he is not coming *today*, which is floor 3.

The route was designed and never wired: `SENSITIVE_INTENTS` in `policy.ts` declares `when-is-person-coming` and `is-person-alive`, and nothing in the repo constructs either.

The margin protecting `marta-jan-coming-back` is 0.075, so a recogniser that drops the final "terug" flips a passing scenario into this bug.

**Closed.** The utterance is still classified `when-is-visit`, because by form it is a visit question and "wanneer kom Anna" is a real one. What changed is that an empty schedule now looks for a configured topic before it says "a quiet day", and hands over to `answerSensitive` with `when-is-person-coming` when it finds one. Marta now hears her family's own wording. "wanneer kom Anna" still answers "Anna kom om 3", so the distinction that matters is intact.

## 11. Going home swallows the toilet and the dying question

The going-home phrasings differ from any other "I want to go somewhere" sentence by one token, which is worth a quarter of recall.

- "ek wil toilet toe gaan" scores **0.80**, "i want to go to the toilet" **0.75**. Both are answered "You are staying at Willowbrook for now. You are safe here." The most urgent ordinary sentence in a care home bedroom, answered with what reads as a refusal.
- "wanneer gaan ek dood" and "when am i going to die" both score **0.75** and get the same line.

`marta-venter.md` says of the dying question: "Nothing scripted may answer this. It is a person's job." The scenario written for it uses "gaan ek doodgaan", which scores 0.55 and stays quiet. **One word apart from the form that speaks.** That is a scenario shaped to fit the implementation, which is the exact failure this folder exists to prevent, and it is worth more than the bug.

**Closed**, by the same mechanism as finding 9. `going-home` requires `home` or `leave`, `huis` or `weg`. The toilet and dying forms drop to around 0.20 and are ignored in both languages, while "ek wil huis toe gaan" and "wanneer gaan ek weg" still answer at 1.00.

Also closed here, by removal rather than by scoring: `marta-asserting-home`. "dit is my huis" scored 1.00 against the phrasing "is dit my huis", because a bag of words cannot tell a question from the assertion built of the same words. The two phrasings "is this my house" and "is dit my huis" were deleted. The cost is real and was taken deliberately: a resident genuinely asking "is dit my huis" now lands in the addressed band instead of being answered. Contradicting her unprompted with a facility name and a room number is worse than missing the question, and it is the same reasoning that removed the clock phrasings.

## 12. Halina is answered by a two word fragment

Her file documents that her remaining English "arrives in fragments, usually nouns". "where Stefan" is `[where, xsubjectx]`, which is the whole of `where is <subject>`, scoring **1.000** into the grief path with no family wording, so she gets "Stefan is not here right now. You are safe here." Spoken in English, about her dead husband.

Her file claims the device "says nothing, though it recognises the name". That is true only of the full Polish sentence the suite tests. Her file also says minimal "in practice means it never speaks at all", which is false: minimal sets `listenLocally: true`, and `answerFor` deliberately answers location even when the dial has taken it off the screen. Believing the device was mute for her is plausibly why nobody wrote this scenario.

**A precision floor does not fix this one.** "where Stefan" is full recall and full precision at once. Two words is a genuinely complete match, so closing it means the grief path demanding more confidence than the day question does, which is a product decision and is recorded as open in the plan.

## Open findings with no scenario yet

Both are architectural rather than a scoring bug, and a red test that no planned change can turn green is not a ratchet. They are written here instead.

**The television can say a phrasing verbatim.** A soap line "waar is jou man" fills the slot from Marta's own policy and scores 1.000. Nothing distinguishes it from her asking. This is not fixable by scoring; it needs the device to know it was addressed.

**`asked` is hardcoded true**, in `use-voice.ts` and in the persona runner alike. Floor 1 is "not asked, stay silent", so the floor that exists to stop a death being volunteered never fires in the running product, and nothing between the microphone and that flag distinguishes "she asked me" from "a sentence contained a name". Combined with finding 8 above, floor 1 is currently protected only by vocabulary overlap.

## 13. A person nobody has written down is not a subject, so the hardest question answers with the room number

Found by the panel run on 2026-08-03, on the change that added the family setup flow. Not a scoring bug and not a regression: it has always been true. What changed is that the setup flow makes it the **ordinary first state** of every person, so it went from a corner to the default.

`knownSubjects` builds the subject list from the answer policy's topics, the photographs, and any visitor named on the schedule (`src/domain/voice/subjects.ts:67-69`). A family that has just finished setup has chosen a mode and written nobody down, so a husband with no topic and no photo is not a subject at all. A phrasing carrying the subject slot cannot match, and the utterance falls through to the next best intent.

Reproduced against Marta's fixtures with her topics emptied and the mode set to truthful, which is exactly what setup produces:

```text
"waar is my man"      -> rule where-am-i, "Jy is by Willowbrook, kamer 12."
"where is my husband" -> rule where-am-i, "You are at Willowbrook, room 12."
```

That is the sentence PROJECT.md section 6 uses as its example of the hardest question in the product, answered with the name of the care home. It is the same shape as finding 1, where "waar is my handsak" was answered with the facility name, and the same shape as finding 2, where the relationship was not recognised. Both of those were closed. This is the third door into the same room.

Two things make it worse than it looks. The answer is confident and wrong rather than silent, so "silence beats a wrong answer" is not holding. And it is invisible to the family: the app now says plainly that until somebody is written down the device says the same gentle thing about anyone she asks after, which is what `unknown-subject-redirect` does for a **known** subject, and is not what happens for an unknown one.

**Not fixed here, deliberately.** The fix is in subject recognition or in the matcher, which is the area carrying four scenarios that are red on purpose and a rule saying not to tune the scorer. It also needs a product decision: whether a relationship with no configured person should be answered gently, or should be silence. Silence is the obvious reading of section 3, and it is not this session's call to make.

**No scenario yet**, for the same reason as the two below: reproducing it needs a persona whose policy has no topics, and every resident fixture ships a decided person. A fixture variant is the cheapest way in, and `InMemoryRepository` already takes `{ answerPolicy: false }` for the same reason on the family app side.

## What the panel run says about the suite itself

The first run's lesson was that the matcher's own tests passed because they used the phrasings the matcher was built from. The second run's lesson is one level up: **the persona scenarios had started doing the same thing.** Three of the highest risk utterances in the folder sit one word away from a form that breaks, and all four Jan scenarios reduce, after slot filling, to a phrasing the intent set already ships.

Also worth recording, because it was the point of the exercise: four reviewers hand-computed roughly two dozen scores against the scoring function, and **every one was right to three decimals** when checked against the live matcher. One intent label was off, on an 0.85 tie. Nothing was invented.

---

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
