# Pieter Venter

**58. Marta's son. Lives in Pretoria, an hour from Willowbrook. Visits monthly.**

He is not the buyer and he is the one who is actually there. He deals with the home, the fees, the GP, and the afternoon two years ago when his mother did not know who he was. His sister chose the product and configured it from London.

He thinks the answer policy is a lie being told to his mother, and he thinks his sister chose it because it is easier for her.

He is not necessarily right. Dementia care has argued this for decades and PROJECT.md section 6 says as much. But he is the persona the product needs because he is the disagreement, and the disagreement is a feature question, not a support question.

## What he is trying to do

| Task | State today |
| --- | --- |
| Add the visits he actually makes | **Supported**, if Anna gives him her login |
| Change what the device says about his father | **Supported, and that is the problem.** Anyone with the app can change it |
| See what his sister set, without changing it | **Not built.** There is no read only access and no record of who set what |
| Understand why the device said something | **Partial.** Every answer carries a rule id internally, and nothing surfaces it |
| Be told when his sister changes something | **Not built** |
| Have his own account | **Not built.** One account, full access |

## The argument

Anna chose gentle redirection. Pieter wants truthfulness, gently, when asked. His case:

> She asks because she wants to know. Telling her he is "not here right now" so she asks again in ten minutes is not kindness, it is a machine keeping her comfortable for our benefit. She was a person who wanted the truth.

Anna's case:

> He died once. I am not going to build a machine that tells her he died forty more times.

Both of these are defensible. The product's current position is that it is the family's decision, which is correct and incomplete, because "the family" is two people who disagree and the app gives it to whoever logs in.

## What this means for the product

**Whoever holds the phone decides.** `src/services/family-auth.ts` is a mock with one user and full access, and the note at the top of it flags exactly this. The real implementation has to answer a question the mock does not: who may change the answer policy. It is the setting that decides what a vulnerable person believes about her own husband, and it should not be editable by whoever happens to have the app installed.

**A change with no record is a change nobody can question.** If Pieter switches the policy to truthfulness on a Sunday, Anna has no way to know until she notices the device saying something new. Sensitive topic changes need to be attributable and visible, at minimum.

**Someone has to be able to break the tie.** Two children with equal standing and opposite views is the ordinary case, not the edge case, and it is not a software problem. It is a question about who holds the account, which is a question the sales conversation has to raise rather than discover. PROJECT.md's call for a clinician or an ethicist early is the right instinct, and this is one of the specific things to put in front of them.

## What he would ask for that nobody has thought about

He would want to know what she asked for, and he would be right to want it, and the product should probably still refuse. He is closer to the day to day decline than Anna is, and a spike in asking for Jan genuinely is clinically meaningful. Refusing to report it is a defensible position that costs something real, and the cost should be stated rather than hidden behind "we do not monitor".
