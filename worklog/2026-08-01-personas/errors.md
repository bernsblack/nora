# Errors: personas, and the seven defects they found

Backfilled. The seven product defects are in `personas/FINDINGS.md`, which is the right home for them because they are findings about the device rather than about the process. What follows is what went wrong in the **work**, which is a different list.

## A doc comment had been false since the day it was written

- **What went wrong:** `findSubject` matched people by name only. The doc comment above it said it also matched relationship words. "Where is my husband", the sentence PROJECT.md section 6 uses as its example of the hardest question in the product, recognised the intent at a score of 1.00 and then produced silence, because it could not work out who was being asked about.
- **Root cause:** the comment described the intent and the code implemented a subset. Nothing tested the difference, so the comment stayed plausible.
- **How it was caught:** a persona scenario. Nothing else would have: every existing matcher test asked by name, because the person who wrote the matcher wrote the tests.
- **Proposed guide or sensor:** treat a comment that claims more than the code does as a defect class, and check it explicitly in review.
- **Now enforced by:** `src/domain/voice/subjects.ts`, `matcher.test.ts` "picks up a subject only when it is a name we were given", and the persona scenarios. `claude/agents/code-reviewer.md` names this incident under "naming that misleads" and is told to look for it.

The general form is worth stating: an untested comment is a claim with no owner, and it decays into a lie without anybody editing it.

## Fixing the matcher broke tests that were themselves wrong

- **What went wrong:** adding a subject slot token to the intent phrasings broke the self match test, which asserts every phrasing matches its own intent. Then four phrasings failed a new minimum evidence check.
- **Root cause:** the self match test compared against phrasings that now contained a literal placeholder. The four thin phrasings ("is it monday", "is it morning", "where is this", "waar is dit") reduced to a single content token after stopword removal, which is exactly the condition that had just been made illegal.
- **How it was caught:** the test suite, correctly, on the first run after the change.
- **Proposed guide or sensor:** a test over the intent set itself, rather than over its behaviour.
- **Now enforced by:** the self match test substitutes a real name for the slot, and a guard test fails any phrasing that survives stopword removal with fewer than `MIN_EVIDENCE_TOKENS` content tokens. The four thin phrasings were rewritten.

This is the good kind of incident. A new invariant found existing violations of itself immediately, which is what an invariant is for.

## The stopword list had been tuned by a test that asserted the wrong thing

- **What went wrong:** an early test asserted `tokenise("Waar is ek?", "af")` produced `["waar"]`, treating the pronoun as noise. That assertion was written to match the implementation. Later, three completely different questions ("where am I", "where is my husband", "where is my handbag") were found to collapse to the same single token, and the device answered a question about a handbag with the name of the care home.
- **Root cause:** a test written to describe what the code did rather than what the product needs. In both languages the pronoun is the entire difference between those three questions.
- **How it was caught:** a persona scenario. The unit test was green the whole time and was itself the problem.
- **Proposed guide or sensor:** pronouns are not stopwords, with the reason written where somebody would otherwise remove them again as noise.
- **Now enforced by:** the stopword lists in `matcher.ts` with an explanatory comment, `matcher.test.ts` "keeps interrogatives, which carry the whole signal", the persona scenarios, and `claude/rules/voice.md`, which states it as a rule so the next person to tidy the list finds out first.

## A scenario was nearly softened instead of fixed

- **What went wrong:** the first instinct on one failing scenario, Halina's fragmentary "day, what day", was that the utterance was unreasonable rather than that the device was wrong.
- **Root cause:** it is easier to edit the expectation than the matcher, and the suite is the only one in the repo whose expectations are not derived from the code.
- **How it was caught:** noticing it before doing it.
- **Proposed guide or sensor:** state plainly that this suite is allowed to fail and that a failure means the device is wrong.
- **Now enforced by:** `claude/rules/testing.md` and `claude/rules/answer-policy.md` both say it, and `claude/agents/reality-checker.md` is told to diff `personas/scenarios.ts` and ask which direction the causation ran when an expectation changed in the same commit as the matcher.
