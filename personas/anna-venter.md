# Anna Venter

**52. Marta's daughter. Lives in London, works full time, flies to Johannesburg twice a year.**

She is the buyer. She found the product, she pays for it, and she is the one whose phone the family app lives on.

Nine thousand kilometres is the whole of her problem. She calls the home every Sunday and gets a nurse who is kind and busy and does not know what her mother did today. She calls her mother and the call does not work: Marta cannot hold a phone conversation, cannot place the voice, and is sometimes distressed afterwards. Her brother Pieter visits monthly and sends short factual messages that leave her feeling worse.

What she feels is guilt, and the product's real job is to give her something to do with it. That is a commercially useful thing to understand and an ethically uncomfortable one, because a product that mainly soothes the buyer is not the same as a product that helps the resident.

## What she is trying to do

| Task | State today |
| --- | --- |
| See that her mother is all right | **Partial.** The family app shows the live room screen, which shows what Marta sees. It does not show how Marta is |
| Know what her mother's day looks like | **Supported.** The care home calendar imports and shows grouped by day |
| Put her face in the room | **Partial.** Photos can be added, but only by address. Upload is not built, because storage is not connected |
| Leave her mother a message in her own voice | **Not built.** Recording needs storage |
| Tell her mother something the calendar does not know | **Supported.** A note takes the next thing's place and expires on its own |
| Decide what is said about her father | **Supported.** This is the setting she agonised over for a week |
| Add a visit while standing in a Tube station | **Supported**, and the time she enters is read as the time in Johannesburg rather than in London |
| Turn the whole thing down as her mother declines | **Supported.** One dial, four settings |
| Know her mother asked for Pa eleven times today | **Not built, and deliberately so.** See below |

## The setting she agonised over

She chose gentle redirection and wrote the exact words herself: "Jan is nie nou hier nie. Anna kom later kuier."

It took her a week. She tried truthfulness first, imagined her mother hearing that her husband was dead for the first time again, and could not do it. She tried writing something warmer and stopped because it felt like lying. What she landed on is true, contains no death, and moves to something that is about to happen.

The family app has to hold that this took a week. It is not a preference, it is the hardest decision she has made about her mother since the diagnosis, and a form that treats it like a notification setting is wrong. Today the section is visually set apart, carries a plain statement of what the device will never do regardless of the choice, and refuses wording that contradicts the mode with an explanation rather than an error.

## What she asks that the product has to answer

**"Will it tell her Pa is dead?"** No, not unless you choose that, and never on its own. This is the first question every buyer asks and it should be answerable from the marketing page.

**"Can I see what she asks about?"** No. It would be the most compelling feature in a demo and it turns a companion into a monitor, which PROJECT.md section 12 rules out and which would change what the device is. The counter argument is real: a spike in asking for Jan is clinically meaningful, and withholding it from a family is its own choice. Worth deciding on purpose.

**"What happens if the wifi goes down?"** The screen keeps working. The whole day is handed to the device at once and everything is derived locally, so it keeps showing the right day and answering the same questions with no network at all. Only new things she adds are missed until it reconnects.

**"Is it recording her?"** No. Nothing captured in the room is written down or sent anywhere in mode one, and the transcript buffer holds a few seconds of text that is continuously overwritten. There is a source scan in the test suite that fails the build if anybody adds an API that could capture, store, or transmit audio. That is the answer she needs, and it is also the answer the care home's compliance officer needs, which is the harder audience.

## What she needs and does not have

**A second pair of hands.** She would like Pieter to be able to add the visits he books, without being able to change what the device says about their father. There is one account with full access to everything. See `pieter-venter.md`, and the note at the top of `src/services/family-auth.ts`.

**Something for the days her mother is having a bad time.** She has no way to make the device gentler for a day without turning the dial down permanently, and no way to know she should.

**Confidence that it is switched on.** The device list shows "last seen", which is the right primitive. Nothing tells her when a screen has stopped checking in, which is the moment she would want to know about.
