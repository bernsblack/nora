# What holds up the brief

PROJECT.md is a list of requirements. This is the map of what actually enforces each one, and it exists so that "the product principles are covered" stops being something anybody has to recall.

Status is one of:

- **enforced**: a test fails if this stops being true
- **partial**: something holds part of it, and the gap is named
- **nothing**: prose only. True today because somebody was careful, and nothing notices when they are not
- **failing**: a test holds it, and the test is red. The requirement is not met and everybody knows

Built by enumerating every test in the repo on 2026-08-01. Update it in the closing step of any task that adds a constraint or a test.

There is one **failing** row, and it is the most important requirement in section 3. Four persona scenarios covering "silence beats a wrong answer" are red on purpose: three attempts at fixing them are recorded in `claude/rules/voice.md`, and they are the acceptance criteria for whatever replaces the matcher rather than a backlog item. A red suite here is not a broken build, and it is also not a requirement that is met.

## Section 3, the product principles

| Requirement | Held up by | Status |
| --- | --- | --- |
| Never impatient | `policy.test.ts` never acknowledges that the question has been asked before; `room.voice.spec.ts` sounds the same on the fortieth ask as the first | enforced |
| No scorekeeping | nothing | **nothing** |
| One answer per screen | `room.spec.ts` shows exactly one next thing; `room.voice.spec.ts` shows only one answer at a time; `room-view.test.ts` shows one next thing, singular | enforced |
| Short spoken answers, one or two sentences | `MAX_SPOKEN_SENTENCES`, `MAX_SPOKEN_WORDS`; `answers.test.ts` stays within the spoken limits, per question; `policy.test.ts` keeps the generated truthful answer to two sentences; `personas.test.ts` never says more than two sentences | enforced |
| Never quiz | `room-view.test.ts` puts a name under the face, which covers the one manifestation that was thought about. Nothing forbids a recall prompt in a string | partial |
| Silence beats a wrong answer | `INTENT_SPEAK_THRESHOLD`, `INTENT_ADDRESSED_THRESHOLD`; `matcher.test.ts` ignores speech that is not addressed, treats a partial match as addressed rather than answering it, keeps the two thresholds ordered; `answers.test.ts` says nothing at all when nobody asked; `room.voice.spec.ts` stays quiet when it did not understand; the silence scenarios in `personas/scenarios.ts`. **Four of those scenarios currently fail**, deliberately: the device speaks to an overheard sentence, to a remark about the weather, and to a two word fragment about a dead husband | **failing** |
| Light before sound | `LIGHT_BEFORE_SOUND_MS`, used in `use-voice.ts`. No test | **nothing** |

## Section 4, the room screen

| Requirement | Held up by | Status |
| --- | --- | --- |
| Day and part of day, in words | `room-view.test.ts` says the day and part of the day in words; `time.test.ts` splits the day the way a care home does | enforced |
| Never abbreviate the day | `time.test.ts` never abbreviates the day; `room.spec.ts` never abbreviates the day | enforced |
| Where they are, by name | `room-view.test.ts` says where they are, by name | enforced |
| One next thing | see one answer per screen, above | enforced |
| A photo with the name under it | `room-view.test.ts` puts a name under the face, copes with no photos at all | enforced |
| Readable from a bed at three metres | `ROOM_MIN_TEXT_PX`; `room.spec.ts` size and weight, across day, location, next-thing, photo-caption and mic-state; `room-theme.test.ts` never drops below the minimum text size. The three metre claim itself is a derivation in a comment, never measured with a person | partial |
| Not blue dominant | `room-theme.test.ts` uses no blue dominant colour on the room screen | enforced |
| No thin fonts, tracking at 0 or positive | `ROOM_MIN_FONT_WEIGHT`, `ROOM_MIN_LETTER_SPACING_EM`; `room-theme.test.ts` carries the weight and tracking floors; `room.spec.ts` size and weight as rendered | enforced |
| WCAG AAA where achievable, AA as the floor | `room-theme.test.ts`, four pairings, undimmed and at the dim floor; `room.spec.ts` clears the contrast target as rendered | enforced |
| Auto-dim to ambient light | `lighting.test.ts`, six tests including never goes below the dim floor whatever the sensor says | enforced |
| No animation that reads as movement, slow crossfades only | `ROOM_CROSSFADE_MS`. Nothing asserts that nothing else animates | **nothing** |
| No navigation, no way to reach a broken state | `room.spec.ts` has no navigation, no links, and nothing to press; shows a quiet screen rather than an error; does not scroll | enforced |

## Section 5, the voice layer and privacy

| Requirement | Held up by | Status |
| --- | --- | --- |
| No audio written to disk, ever | `privacy.test.ts` source scan for `MediaRecorder`, `AudioContext`, `getUserMedia`, `indexedDB`, `localStorage`, `sessionStorage`, `writeFile`, `createWriteStream` | enforced |
| No audio transmitted in mode one | `privacy.test.ts` never calls fetch from the mode one path | enforced |
| The buffer is in memory for seconds and overwritten | `TRANSCRIPT_BUFFER_MS`, `TRANSCRIPT_BUFFER_MAX_ENTRIES`; `privacy.test.ts` holds text and only for the window, empties on silence without anybody reading it, is bounded, drops everything on clear | enforced |
| A microphone switch the family controls | `family.spec.ts` turning the microphone off says so on the room screen | enforced |
| Mic state visible from across the room | `room.spec.ts` says what the microphone is doing in words; `mic-state` is in the size and weight loop; does not claim to transmit when it is not | enforced |
| Works with no network | implied by the fetch ban plus serialising the day once. No test starts the room screen offline | partial |

## Section 6, what Nora says about the dead

| Requirement | Held up by | Status |
| --- | --- | --- |
| Default is gentle redirection, not correction | `policy.test.ts` falls back to gentle redirection when nothing is set | enforced |
| The family can write the exact wording | `policy.test.ts` uses the family's wording when they wrote some; `family.spec.ts` shows the family's own wording back to them, saves wording that holds | enforced |
| Set as an explicit choice at setup, not discovered later | `family.spec.ts` is set apart from the ordinary settings and says what it will not do. That tests the presentation, not that it is chosen during setup, because there is no setup flow yet | partial |
| Never volunteer a death | `policy.test.ts` says nothing unprompted, across all three modes; never names a death when the question is not about that subject; `personas.test.ts` never names a death unprompted, across every persona and utterance | enforced |
| Never elaborate on one | `wording.test.ts` keeps at most the sentence limit, never cuts mid sentence; `policy.test.ts` trims over long family wording rather than saying all of it. Length is enforced. "Elaborate" is broader than length and the rest rests on the wording being family authored | partial |
| Never imply a person is alive when the family chose truthfulness | `wording.test.ts` rejects wording that implies life under truthfulness, allows a living subject to be described as living; `policy.test.ts` drops family wording that implies the subject will be back, does not trip on a sentence about somebody else | enforced |

## Section 7, data and the simplicity dial

| Requirement | Held up by | Status |
| --- | --- | --- |
| The dial is a first class concept, not feature flags | `room-view.test.ts` shows everything when turned up, stops speaking first at calm, leaves the day and a face at minimal; `family.spec.ts` the simplicity dial takes things off the room screen | enforced |
| Nothing branches on the raw level outside `simplicity.ts` | a rule in `claude/rules/room-screen.md`. Nothing checks it | **nothing** |
| A family note outranks the schedule, and expires | `NOTE_OUTRANKS_SCHEDULE_MINUTES`; `room-view.test.ts` shows the note instead of the next event, ignores a note that has gone stale, ignores a note that has expired | enforced |
| Calendar import, read only, merged | `calendar.test.ts`, eleven tests; replaces calendar entries and leaves family entries alone | enforced |

## Section 8, languages

| Requirement | Held up by | Status |
| --- | --- | --- |
| Both languages live at once, not a toggle | `matcher.test.ts` hears Afrikaans and English without a toggle; `policy.test.ts` answers in the language the question came in; `room-view.test.ts` can be asked for the other language without changing the data | enforced |
| Never blank rather than fall back | `resolveText`; `room-view.test.ts` falls back to a language that exists rather than blanking the screen; `policy.test.ts` falls back to a language that exists rather than going silent | enforced |
| The voice name is per person and localised | it is a field on the person and reaches `whoAreYou` as a parameter. No test asserts two people get different names | partial |
| Language reversion partway through the disease | nothing. Designed for, not built. A family member changes a dropdown | **nothing** |

## Section 12, out of scope

Nothing enforces an absence, and mostly nothing can. Recorded so the list is visible rather than assumed: no medication reminders, no fall detection, no video calling, no care home integration, no claim about slowing decline or monitoring, no "clinically informed" claim.

The one worth a sensor eventually is monitoring. Not reporting what a resident asked about is a deliberate product position that costs something real, argued in `personas/anna-venter.md` and `personas/pieter-venter.md`, and it would be easy to erode one useful feature at a time.

## What nothing holds

Six rows, gathered so they are hard to miss.

1. **No scorekeeping.** Nothing would fail if a count, a checklist, or an unticked box appeared on the room screen.
2. **Light before sound.** The constant exists and is used. Nothing asserts the screen wakes before the voice starts, which is the one ordering that makes a voice in a dark room bearable.
3. **No animation beyond the crossfade.** A future component could animate freely.
4. **Nothing branches on the raw simplicity level.** A rule, unguarded. The first violation will look reasonable.
5. **Never quiz** is held only where a face without a name was thought of. A recall prompt written into a string would ship.
6. **Language reversion.** Known, and deliberately deferred.

The first four are cheap tests and worth writing. Five is a lint or a copy review rather than a test. Six is a product decision, not a gap.
