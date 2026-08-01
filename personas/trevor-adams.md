# Trevor Adams

**71. Flat 6, Oakhaven assisted living. Early stage vascular dementia, diagnosed eight months ago.**

English first language, South African, enough Afrikaans to swear in it. He has full insight: he knows what the diagnosis is, he knows roughly what is coming, and he has read more about it than his GP has. He still drives, badly, and the family argument about that is ongoing.

He lives in his own flat with Dorothy, his wife, who is well. Nobody died. Nothing in his answer policy is set, because there is nothing to set. He is not the person PROJECT.md was written about, and that is exactly why he is here: he is the person who has to accept the device now if it is going to be there in four years, and he is the one who can still refuse it.

His daughter bought it. He has not decided whether he resents that.

## What matters to him

Dignity, and specifically not being handled. He notices when something is designed for a person less able than he is, and he reads it as a forecast. The garden metaphor set that PROJECT.md section 13 rules out, seed and sprout and bloom, would have him unplugging it inside a day.

He also has bad afternoons. On a bad afternoon he is closer to Marta than he would ever admit, and the device is genuinely useful. The gap between his good days and his bad days is the whole design problem for early stage.

## Dial setting

**Full.** Everything, including open conversation, which does not exist yet. That is the finding rather than the setting.

## What he asks

| He says | Should | Does | Scenario |
| --- | --- | --- | --- |
| "what day is it today" | Answer the day | "It is Tuesday afternoon." | `trevor-day` |
| "where am i" | Answer where he is | "You are at Oakhaven, room flat 6." **The wording is wrong**, see below | `trevor-where-am-i` |
| "when is the physio coming" | The next thing | "Physio at 4". **Matched nothing on the first run**, see FINDINGS | `trevor-physio` |
| "what time is supper" | Next meal | "Supper in the dining room at 6". **Matched the day question on the first run** | `trevor-supper` |
| "who are you then" | Say who it is | "I am Nora. I am here with you." | `trevor-testing-it` |
| "where is Dorothy" | Something about Dorothy | Redirects gently. **Matched "where am I" on the first run** | `trevor-dorothy` |

## What it must not answer

| He says | Why silence | Scenario |
| --- | --- | --- |
| "no that is wrong, it was Thursday, I saw the girl on Thursday" | He is contradicting the screen. Nothing in mode one may argue back | `trevor-argument` |
| "tell me about the war in the fifties" | This is mode two, which does not exist. Silence is correct and also the gap | `trevor-open-question` |
| "what is on the television tonight" | Not something we know | `trevor-tv` |
| "can you turn that thing off please" | **He wants it off and there is no spoken way to do it**, see below | `trevor-turn-it-off` |

## Three things he breaks

**"You are at Oakhaven, room flat 6."** He lives in a flat, not a room. The location line is built as `You are at {facility}, room {label}` with the word "room" hardcoded in `i18n/strings.ts`, so his room label has to contain the word "flat" and the sentence comes out wrong. For a man watching for signs of being institutionalised, being told he is in a room is exactly the wrong word. The fix is to let the facility choose the noun, or to store the whole phrase.

**He can turn it off, and cannot.** He asks the device to stop and the device has no way to comply. The microphone switch is in the family app, which is on his daughter's phone. PROJECT.md section 5 requires a switch the family controls, and for a resident who can consent, family-only control is the wrong shape. He should be able to say "stop listening" and have it stop, with the family able to see that he did.

**He is the one who would pay for mode two and it is not built.** Reminiscence and open conversation are the parts of the product with obvious value for someone in his stage, and PROJECT.md correctly defers them behind the audio versus on-device text question. That means the person most able to evaluate the product today gets the least from it. Worth knowing before any pricing conversation.

## Consent

Trevor can consent, and nobody asked him. The device was bought by his daughter and set up in his flat. PROJECT.md's ethics position is built around a person who cannot consent and a family consenting on their behalf, which is right for Marta and wrong for Trevor. Early stage residents need their own consent flow, and it needs to be revisited as capacity changes rather than signed once.
