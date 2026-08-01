---
name: nora-copy
description: Writes and reviews every word a person reads or hears in Nora, in English and Afrikaans. Use whenever adding or changing a string in src/i18n/strings.ts, a spoken answer, a room screen line, a family app label, error, empty state or explanatory paragraph, or when translating between the two languages. Use even when the request does not mention tone. Do not use for code comments, commit messages, internal docs, or PROJECT.md.
---

# Nora copy

Two audiences with almost nothing in common, and one of them cannot tell you when a sentence went wrong.

**The resident** hears or glances at it. Moderate to late stage dementia, zero accumulated context, reading from a bed at three metres, possibly hallucinating. Every constraint on this side is a requirement from PROJECT.md section 3, not a style preference.

**The family member** reads it in an app on a phone, feeling guilty, in a hurry, three weeks since they last looked. This side is closer to ordinary product copy, with one difference: some of the decisions it asks for are the hardest a person will make about their parent.

Reference files, load per task:

- [reference/voice.md](reference/voice.md): the locked register for both audiences, the hard floors, and what is never said. Load for anything longer than a label.
- [reference/afrikaans.md](reference/afrikaans.md): Afrikaans register, address form, and what a second-language writer gets wrong. Load for **all** Afrikaans output.
- [reference/english.md](reference/english.md): English register, numerals, and the AI-tell banlist. Load for **all** English output.
- [reference/patterns.md](reference/patterns.md): per-surface structures. Room screen line, spoken answer, family app label, error, empty state, the answer policy section. Load when writing that surface.

## The floors, in short

These are absolute. Everything else is judgement.

**Resident-facing:**

1. **One or two sentences.** `MAX_SPOKEN_SENTENCES` is 2 and `MAX_SPOKEN_WORDS` is 30. Longer replies exceed working memory and the person loses the thread before the end.
2. **Never impatient.** No "as I mentioned", no "again", no "like I said", nothing that acknowledges the question has been asked before. There is no conversation history that affects tone. The fortieth time sounds exactly like the first.
3. **Never a quiz.** No "do you remember", no "can you tell me", no recall prompt of any kind.
4. **No scorekeeping.** No count, no checklist, no "you have not yet", no streak.
5. **Never phrase an absence as a lack.** An empty day is "A quiet day", never "Nothing scheduled" and never "You have no visitors today".
6. **Never volunteer a death, never elaborate on one, never imply someone is alive when the family chose truthfulness.** PROJECT.md section 6. This is enforced in code by `validateFamilyWording`, and copy you write must not need the enforcement to catch it.
7. **No clock times as the answer to what time it is.** The screen shows "Tuesday morning". A time appears only attached to an event: "Lunch at 12".
8. **Never abbreviate the day.** "Tuesday", never "Tue".

**Family-facing:**

1. **No cheerfulness the situation does not support.** No exclamation marks on anything to do with the resident's decline. No "Great!", no "All set!".
2. **Nothing infantilising.** No growth or garden metaphors, no diminutives, no cartoon warmth. PROJECT.md section 13 rejects exactly this in an existing brand document. The resident is an adult with a life behind them.
3. **No clinical or outcome claim.** Nothing about slowing decline, monitoring, cognitive benefit, or being clinically informed. PROJECT.md section 12 rules this out and it is not a wording problem, it is medical device territory.
4. **Hold the weight.** The answer policy section decides what a woman believes about her dead husband. Its copy states plainly what the device will never do, regardless of the setting.

**Both:**

- **No em dashes.** Restructure: comma, colon, parentheses, or two sentences.
- **Straight quotes only**, in prose and in source strings.
- **No emoji** in any string.
- **Never hardcode the product name.** It is unresolved. Brand strings come from `src/config/brand.ts`. The voice name is per-person and set by the family, so it arrives as a parameter and is never written into a sentence.

## Both languages live at once

English and Afrikaans are simultaneous, not a toggle, because speakers switch mid-sentence. Every string added to `src/i18n/strings.ts` needs both, in the same commit. A missing translation is not a gap that gets filled later, it is a person hearing a language they have lost.

Family-authored text does not pass through `strings.ts` and is used verbatim. Do not edit a family member's wording to improve it. Validation may refuse it; this skill does not rewrite it.

## Process

1. Identify the audience (resident or family) and the surface. Load `voice.md` plus the matching language file, plus `patterns.md` for that surface.
2. Write the English and the Afrikaans together, not one then the other. A line that only works in one of them is the wrong line.
3. Count the sentences and the words on anything spoken. Two and thirty.
4. Run the final check below.

## Final check, mandatory before delivering

1. **Length**: at most two sentences and thirty words on anything spoken aloud.
2. **Impatience**: no acknowledgement of repetition, in either language, in any form.
3. **Quiz, scorekeeping, lack**: none of the three.
4. **Death**: nothing volunteered, nothing elaborated, nothing implying life under truthfulness.
5. **Register**: calm and plain. Not cheerful, not clinical, not sweet. No exclamation marks on any resident-facing string.
6. **Punctuation**: no em dashes, no emoji, straight quotes.
7. **Both languages present**, and the Afrikaans is not a word-for-word calque of the English. Run the checklist in `afrikaans.md`.
8. **No AI tells**: no "unlock", "empower", "seamless", "peace of mind", no benefit triplets, no "it's not X, it's Y". Run the banlist in `english.md`.
9. **Names and brands**: the voice name is a parameter, the facility name is a parameter, the product name appears nowhere.
10. **Read it aloud.** Would a calm person say this to an 84 year old they were fond of? If it sounds like a receptionist, a nurse, or a machine, rewrite it.
