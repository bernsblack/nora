# Patterns by surface

## Room screen line

Four things only: the day, the place, one next thing, one face with a name. Adding a fifth means removing one.

- **Day**: `It is Tuesday morning.` / `Dit is Dinsdagmiddag.` Full day name, never abbreviated, part of day always present.
- **Place**: `You are at Willowbrook, room 12.` The facility name and room come from data and are never written into the string. `roomLabel` deliberately holds the number without the word "room", so the word comes from the language file.
- **Next thing**: `Lunch at 12` / `Anna is coming at 3`. No trailing full stop; these are labels rather than sentences. Present tense. One item, never a list.
- **Photo caption**: `Anna, your daughter`. Name first, because the name is the thing being answered. Relationship is optional and omitted when it is not known.

Nothing on this screen is a question, an instruction, or an offer.

## Spoken answer

Same content as the screen, in a sentence, under two sentences and thirty words.

The rule that matters: **an answer never contradicts the screen.** Prefer building an answer from the same value the screen renders over composing a new sentence that happens to agree today. `what-happens-next` exists precisely so the spoken next-thing answer cannot drift from the visible one.

Structure: answer first, nothing after it. No preamble ("Well, let me see"), no follow-up offer ("Would you like me to remind you?"), no confirmation that a question was asked.

## When we did not understand

`didNotCatch` is `I am here.` / `Ek is hier.`

Not an apology, not a request to repeat, not an admission of failure. The person did not experience a failure; they said something and a voice answered. Asking them to repeat is a quiz.

Never write a variant that guesses. Between the two thresholds the correct behaviour is presence, not a best effort.

## Family app label

Sentence case, concrete, and about the resident rather than about the data.

| Not this | This |
| --- | --- |
| Person name | The name they answer to |
| Simplicity level | How much the device does |
| Microphone enabled | The device may listen |
| Submit | Put this on the screen |
| Save | Save these details |

Buttons say what will happen, specifically enough that two buttons on one page never share a name. Playwright matches button names by substring and has already asserted against the wrong form because of it, so a distinct verb phrase is a correctness property here, not only a clarity one.

## Family app error

An error tells them what happened, why, and what to do, in that order, without blame.

The important case is the answer policy refusing wording. That message explains which floor the wording crosses and leaves everything they typed on the page. It is the only place in the product where we tell a family member no about something they wrote carefully, so it is worth more words than anything else in the app.

Never: "Something went wrong", "Invalid input", "Error saving". Never a code.

## Family app empty state

Say what goes here and what it will do, then the action. No illustration, no encouragement, no "Get started!".

The room screen has no empty state, only the quiet day line. There is nowhere to go from the room screen and nobody there who could act on a prompt.

## The answer policy section

The highest-stakes copy in the product. It must:

1. **State the choice plainly**, all three modes, without recommending one. This is a family's decision and dementia care has argued it for decades without settling it.
2. **State what the device will never do regardless of the choice**, in the family member's own reading, not buried in a help link. The floors are the thing that makes the choice safe to make.
3. **Not congratulate.** No confirmation that reads as praise for a hard decision.
4. **Show their own words back to them** exactly as written.

Anna spent a week on this. The copy should read like it knows that.

## Notes on time

A note from a family member takes the place of the next thing and expires on its own. The copy around it says how long it will stay, in plain terms, because a note that outlives its truth is worse than no note. "Pa is at work, home tonight" is correct at four in the afternoon and cruel at ten the next morning.
