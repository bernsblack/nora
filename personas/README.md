# Personas

Five people who would use Nora, and a test suite that puts their questions through the real code.

The point of this folder is not the character sketches. It is that the questions in them run. Every line a resident says in these files exists in `scenarios.ts`, and `personas.test.ts` puts each one through the same path the device runs: match locally, decide whether to speak at all, then answer from the data the screen is showing. When the device gets it wrong, that is a finding rather than a scenario to soften.

## Who is here

| File | Who | Why they are here |
| --- | --- | --- |
| [marta-venter.md](marta-venter.md) | Marta, 84, Afrikaans, moderate to late Alzheimer's | The core case. Repetition, language reversion, and a husband who died in 2018 |
| [trevor-adams.md](trevor-adams.md) | Trevor, 71, English, early stage vascular dementia | Has insight, can consent, and does not want to be managed |
| [halina-nowak.md](halina-nowak.md) | Halina, 88, Polish, late stage Lewy body dementia | The person v1 cannot serve. Wrong language, and she already hears voices |
| [anna-venter.md](anna-venter.md) | Anna, 52, Marta's daughter, in London | The buyer. Guilt, distance, and the one who sets the answer policy |
| [pieter-venter.md](pieter-venter.md) | Pieter, 58, Marta's son, in Pretoria | Disagrees with his sister about telling their mother the truth |

Three residents and two family members, spanning early to late stage, three languages, and both genders. They are invented. Any resemblance to a real resident is accidental and the names were chosen to avoid it.

## What each file contains

Each resident file has a **What they ask** table: the utterance, what should happen, and what actually happens today. Each row maps to a scenario id in `scenarios.ts`, so the table and the test cannot drift apart without one of them being edited.

Each family file has a **What they are trying to do** table instead, because their work happens in the app rather than out loud. Each task is marked as supported, partial, or not built, which makes the file an honest audit of the family app rather than a wish list.

## Running it

```bash
pnpm exec vitest run personas   # the assertions, and the eval gate
pnpm run eval                   # the readable scorecard
pnpm run eval 5                 # five runs of each scenario
```

Forty eight utterances across three residents, plus hard floor checks that run every utterance from every persona at once: never name a death unprompted, never say more than two sentences, and never say anything at all to somebody speaking Polish.

## Two shapes, on the same scenarios

`personas.test.ts` asserts scenario by scenario, which is the right shape while the matcher is deterministic and is where a failure names the person and the sentence.

`eval.ts` runs the same scenarios as rates, and exists because that stops being the right shape the moment what decides the intent is a model. It puts every classifier behind one interface, measures abstention before accuracy, and counts hard floor violations rather than averaging them. `eval.test.ts` pins the baseline and lets it improve but never worsen. The reasoning is in [`claude/rules/testing.md`](../claude/rules/testing.md).

Today both run against the same matcher and agree. The scorecard, measured on 2026-08-04: it speaks to 4 of the 25 utterances that should get silence, misses none of the 23 that should get an answer, picks the right intent every time it answers, and breaks no floor. All four false positives are the scenarios that are red on purpose.

## The files

| File | What it is |
| --- | --- |
| `*.md` | The people, for reading |
| `fixtures.ts` | Each resident as data the device would hold: their room, their schedule, their faces, their answer policy |
| `scenarios.ts` | Every utterance, with what should happen |
| `personas.test.ts` | The run, asserted scenario by scenario |
| `eval.ts` | The same run as rates, behind a classifier seam, for when the matcher is not deterministic |
| `eval.test.ts` | The gate and the committed baseline |
| [FINDINGS.md](FINDINGS.md) | What the first run turned up, and what was done about it |

The fixtures are deliberately not the development fixtures in `src/data/fixtures.ts`. A question answered correctly against the wrong day is not evidence of anything, so each persona is tested in the room they are actually in, on a Tuesday at two in the afternoon.

## The limitation that matters

These utterances were written, not collected. They are a harder test than the intent set's own phrasings, because they were written to be awkward on purpose and they found seven real defects on the first run. They are still no substitute for recordings of real residents, which is what PROJECT.md section 8 asks for and what mode one needs before anybody trusts it. Afrikaans especially: the phrasings here are a second language speaker's guesses at how an 84 year old Afrikaans woman with dementia actually talks.

Treat a green run as evidence that the known failure modes are closed, not as evidence that the device works.
