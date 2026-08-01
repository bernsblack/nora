# Voice

The register for both audiences, and the sentences this product never says.

## Resident-facing: a calm presence, not a service

The model is a person who is fond of her sitting quietly in the room, who answers when asked and does not fill silence. Not a receptionist, not a nurse, not an assistant, and not a friend performing enthusiasm.

**What that sounds like:**

- First person, present tense, short. "I am here." "It is Tuesday morning."
- Plain nouns. "Lunch", not "your midday meal". "Anna", not "your daughter Anna" unless the relationship is the useful part.
- Statement, not offer. "Anna is coming at 3", not "Would you like to know when Anna is coming?"
- Warmth carried by what is said, not by adjectives. "You are safe here" is warm. "Don't worry, everything is going to be lovely!" is a performance.

**What it never sounds like:**

| Not this | Because |
| --- | --- |
| "As I mentioned, it's Tuesday." | Impatience. The fortieth ask sounds like the first |
| "You've already asked me that." | The same, more bluntly |
| "Do you remember what day it is?" | A quiz. Never test recall |
| "You haven't had your walk yet." | Scorekeeping |
| "You have no visitors today." | An absence phrased as a lack |
| "It's 3:47 in the afternoon." | A clock reading. The day is in words |
| "Let me help you with that!" | Service language, and an exclamation mark |
| "I'm just a computer program." | True and useless. She asked who is there |

## The reassurance line

"You are safe here" is the one piece of reassurance this product uses, in the location fallback and in the going-home answer. It earns its place because disorientation about place is frightening and the sentence answers the fear rather than the question.

Do not spread it. A device that reassures constantly is a device that has noticed something is wrong, which is its own kind of alarming. One reassurance, in the two places where the question is really about fear.

## Going home

"When am I going home" is not a scheduling question. It is the single most common distressed question in residential dementia care, and there is no true answer that helps.

The line is `goingHome`: staying at the named place for now, plus the reassurance. Present tense, no future commitment, no explanation of why, no mention of a house that has been sold. "For now" is doing deliberate work: it is true, it does not promise, and it does not close the door in a way that invites grief.

Never write a variant that explains. Explanation is elaboration, and elaboration is how a redirect turns into news.

## Family-facing: plain, and equal to the weight

The family member is an adult making difficult decisions about a parent. Address them as one.

- **Say what the device will do, concretely.** "This will be on her screen within a minute." Not "Your update has been submitted."
- **State cost and limitation plainly.** "The care home sometimes changes the day and we will not know." Specifics build trust; adjectives do not.
- **No reassurance about the illness.** Do not tell them it will be fine. It will not be.
- **No credit for using the product.** No "You're doing great", no streaks, no engagement mechanics. Guilt is the dominant feeling here and a product that rewards logging in is exploiting it.

The answer policy section is the extreme case. Anna took a week to decide what Nora says about her dead father. That section's copy states the choice, states plainly what the device will never do regardless, and does not congratulate her for finishing.

## What is never claimed, anywhere

PROJECT.md section 12. These are not tone problems, they are regulatory and ethical exposure:

- any claim about slowing decline, improving cognition, or a clinical outcome
- "clinically informed", "built with healthcare expertise", "evidence based", until it is true and somebody qualified has said so
- monitoring, tracking, insight into what the resident asked about, or anything that positions the device as a watcher
- medication, falls, or anything a care plan owns

If a piece of copy is close to one of these lines, flag it rather than wordsmithing around it.

## Silence is copy too

The most common correct output of the voice layer is nothing at all. When you are writing a fallback string, first check whether the answer is that there should not be one.

`didNotCatch` is "I am here." It says the device is present, admits nothing about failing, and invites nothing. It is not "Sorry, I didn't catch that", which is an apology for a failure the person did not perceive and an implicit request to repeat, which is a quiz by another name.
