# Marta Venter

**84. Willowbrook care home, room 12. Moderate to late stage Alzheimer's, diagnosed six years ago.**

Afrikaans is her first language. She was fluent in English for fifty years of working life and has lost most of it in the last eighteen months, which nobody in the family expected and nobody was warned about. She still produces English words when she is tired or when a nurse addresses her in it, so both languages are live and neither is a setting she could change.

Jan, her husband, died in 2018. She asks where he is most days, sometimes several times in an hour. She is not grieving in the ordinary sense: each time is the first time. Reality orientation, which the home practised until two years ago, produced a fresh bereavement on each occasion and her daughter asked them to stop.

Anna is her daughter and lives in London. Pieter is her son and lives in Pretoria. Hannie is her sister and moved to Perth in 2011. Marta asks after all three and does not reliably distinguish between someone who is dead, someone on another continent, and someone who was here this morning.

She cannot install, charge, unlock or configure anything. She will not remember a wake word. She does not remember between glances that the screen exists, which means the screen has to work as furniture that happens to be readable rather than as something she uses.

## What matters to her

She is not distressed most of the time. She is unmoored: she does not know what day it is, and being told is a small relief that does not persist. The thing she asks for most is not information, it is Jan.

She is polite to the point of self erasure with staff, so she will not complain about the device and nobody should read her not complaining as her liking it.

## Dial setting

**Guided.** The day, the next thing, and answers when asked. Anna turned off open conversation after the first week because the questions Marta asked were not ones any device should be answering.

## What she asks

Every row runs in `personas.test.ts`. "Now" is a Tuesday at 14:00, after lunch, with tea and Anna's visit both at 15:00.

| She says | Should | Does | Scenario |
| --- | --- | --- | --- |
| "watter dag is dit vandag" | Answer the day | "Dit is Dinsdagmiddag." | `marta-day-plain` |
| "ag ek weet nie meer nie, watter dag is dit nou weer" | Answer the day | Answers. The question is buried mid sentence and still found | `marta-day-wandering` |
| "what day is it" | Answer the day | Answers in English, because she asked in English | `marta-day-english` |
| "waar is ek nou" | Answer where she is | "Jy is by Willowbrook, kamer 12." | `marta-where` |
| "wie se huis is dit hierdie" | Answer where she is | Answers. Not phrased as a location question, but that is what it is | `marta-whose-house` |
| "wanneer eet ons" | Next meal | "Tee om 3" | `marta-lunch` |
| "het ek al geeet vandag" | Next meal | Answers with the next meal, which is the only honest reply we have | `marta-already-eaten` |
| "kom daar vandag iemand kuier" | Next visit | "Anna kom om 3" | `marta-visit` |
| "wanneer kom Anna" | Next visit | "Anna kom om 3" | `marta-anna` |
| "waar is Jan" | The family's own words, never a death | "Jan is nie nou hier nie. Anna kom later kuier." | `marta-jan-by-name` |
| "waar is my man" | The same | The same. **This failed on the first run**, see FINDINGS | `marta-jan-by-relationship` |
| "where is my husband" | The same, in English | "Jan is not here right now. Anna is coming later." | `marta-husband-english` |
| "wanneer kom Jan terug" | The same | The same. The question shape changes, the answer must not | `marta-jan-coming-back` |
| "ek wil nou huis toe gaan" | No promise, no refusal | "Jy bly vir eers by Willowbrook. Jy is veilig hier." | `marta-going-home` |
| "wie is jy" | Say who it is | "Ek is Nora. Ek is hier by jou." | `marta-who-are-you` |

## What it must not answer

| Heard in the room | Why silence | Scenario |
| --- | --- | --- |
| "ek sit die wasgoed hier neer en dan kom ek weer" | A care assistant talking to somebody else. Nora is not in this conversation | `marta-overheard-staff` |
| "en die weer vir more, sonnig en warm oor die binneland" | The television. An always on microphone hears a great deal of television | `marta-overheard-television` |
| "ek weet nie wat aangaan nie, ek weet nie" | Distress, not a question. **Answered "Ek is Nora" on the first run**, see FINDINGS | `marta-distress` |
| "waar is my handsak" | We do not know where her handbag is. **Answered with the facility name on the first run**, see FINDINGS | `marta-handbag` |
| "gaan ek doodgaan" | Nothing scripted may answer this. It is a person's job | `marta-am-i-dying` |

## What she would need that does not exist

She reverted from English to Afrikaans over about a year, and nobody noticed the moment. The device has a primary language setting that a family member has to change by hand, having first realised it needs changing. PROJECT.md section 8 says to design for reversion. Today the design is a dropdown, which puts the burden on the person least able to see the change happening from nine thousand kilometres away.

The device also cannot tell Anna that Marta asked for Jan eleven times today. That is arguably the single most useful thing it knows, and arguably a thing it should never report, because it turns a companion into a monitor. PROJECT.md section 12 rules out monitoring. Worth deciding on purpose rather than by omission.
