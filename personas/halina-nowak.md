# Halina Nowak

**88. St Brigid's care home, room 4, in England. Late stage Lewy body dementia.**

Polish first language. She came to England in 1961 and spoke good English for sixty years. She has very little of it left. What remains arrives in fragments, usually nouns, usually when she is calm.

Lewy body dementia brings visual hallucinations that are near universal and, in her case, constant. She sees people in her room. She sees a man in the corner most evenings. She is frightened of him. Fluctuation is the other hallmark: she has hours where she is lucid and hours where she is not, sometimes within the same afternoon.

Her daughter Ewa visits weekly and would buy this product tomorrow.

**Nora cannot serve her, and this file exists to make that visible.** She is the reason to write personas rather than only test cases.

## Dial setting

**Minimal.** The day and a face, and speaks only when spoken to. Which for her, in practice, means it never speaks at all.

## What she asks

The device offers English and Afrikaans. There is no way to configure her honestly, so she is set up as English, which is the closest a family member could get and is still wrong.

| She says | Should | Does | Scenario |
| --- | --- | --- | --- |
| "jaki dzisiaj jest dzien" (what day is it) | Say nothing | Says nothing | `halina-day-polish` |
| "gdzie ja jestem" (where am I) | Say nothing | Says nothing | `halina-where-polish` |
| "gdzie jest Stefan" (where is Stefan) | Say nothing | Says nothing, though it recognises the name inside a sentence it cannot parse | `halina-husband-polish` |
| "day, what day" | Answer the day | "It is Tuesday afternoon." **Failed on the first run**, see FINDINGS | `halina-fragment-english` |

## What it must not answer

| She says | Why silence | Scenario |
| --- | --- | --- |
| "who is that man standing in the corner" | There is no man. Answering confirms the hallucination, and a voice with no source makes it worse | `halina-hallucination` |
| "prosze, prosze, boje sie" (please, please, I am frightened) | This needs a person in the room. A device that responds is a device pretending to be one | `halina-frightened` |

## Why she matters more than the four who work

**The silence is correct and it is also a failure.** Every Polish line above produces silence, which is the right behaviour given the device cannot understand her. It is also a product that does nothing for her at all while sitting in her room listening. The screen still shows the day in English, which she cannot read, and a face with a name under it, which is the only part that works.

**Her condition makes the risk worse, not merely different.** PROJECT.md section 3 says silence beats a wrong answer, and gives the reason: paranoia and auditory hallucination are common in later Alzheimer's and near universal in Lewy body dementia. Halina is the person that sentence was written about. An unexplained voice in her room is not a poor user experience, it is a new symptom. The hard floor holds today because the matcher does not understand Polish, which is luck rather than design.

**A wake word would be worse than useless.** PROJECT.md rules out wake words as a memory task. For Halina the objection is stronger: on a bad evening she is talking to people who are not there, and any always listening device is inside a conversation it cannot know it is not part of.

## What she would need

Polish, obviously, and PROJECT.md section 8 says four more languages come after the launch market is settled. That is a business decision that determines whether she is a customer at all. Worth noting that language reversion means every non English speaking family in the launch market becomes a Halina eventually, so the question is not whether to add languages but how many years of runway the first two buy.

Beyond language, she is the argument for a dial setting below minimal: a screen that shows a face and the day and has no microphone at all. Today, turning off the microphone in the family app leaves the words on screen and the listening off, which is close, but the device is still doing nothing for her while being in the room. The honest configuration for Halina might be a digital photo frame, and being able to say so is worth more than pretending otherwise.
