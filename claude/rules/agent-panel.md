---
paths:
  - '**/*.ts'
  - '**/*.tsx'
  - '**/*.css'
---

# Specialist agent panels

This repo ships six read-only specialist reviewers in [`claude/agents/`](../agents/README.md), symlinked into `.claude/agents/` by `scripts/setup-claude.sh`. They exist so that non-trivial work gets an independent adversarial second opinion from the right domain expert instead of only the main agent's self-review.

**The point of a panel is disagreement.** A reviewer that agrees with everything added no information. Every briefing says: look for what is wrong, cite `file:line`, and a finding without evidence does not count. "No issues found in my area" is a valid answer and a real signal.

A panel complements `pnpm run check` and `pnpm run e2e`. It never replaces them.

## Why this repo needs one more than most

Two of the product's requirements cannot be checked by any test that exists.

The first is tone. "Never impatient", "never quiz", "no scorekeeping" and "one answer per screen" are requirements in PROJECT.md section 3, and nothing in CI can fail a screen for breaking them. A reviewer reading the screen as a specific person can.

The second is that the user cannot report a defect. There is no support ticket from a woman in a care home who was told the wrong thing at three in the morning. The persona panel is the closest thing to a user telling us, and it is the only one there will be before a clinician is involved.

## Harness binding

Subagents do **not** inherit the path-triggered `claude/rules/*.md`. Each agent definition names the rule files it must `Read` before starting, so the binding is versioned rather than dependent on the calling prompt.

A briefing therefore contains the diff or exact `file:line` scope and the mandate. **Do not paste rules into it.**

Two things always hold:

1. **A panel is a lens on top of the harness, never an alternative to it.** A panel never overrides a `claude/rules/*` rule or a requirement in PROJECT.md. At most it flags one as worth revisiting, which is a backlog item and never an in-flight deviation.
2. **If a reviewer goes off-stack, that is a defect in its definition.** Drop the finding, say so, and fix the agent file rather than absorbing the same wrong advice every run.

Panels are advisory and read-only. Every agent declares `tools: Read, Grep, Glob`. They produce findings; acting on them is the main agent's job.

## Proportionality

| Tier | Rough size | Review |
| --- | --- | --- |
| **Trivial** | under about 15 lines, copy or config, no behaviour change | No panel. `pnpm run check` and self-review |
| **Small** | one focused change, single concern | 0 to 1 reviewer, only if the concern is non-obvious |
| **Medium** | a feature, a multi-file change, a new component or intent | 2 to 3 reviewers in parallel |
| **Large** | a new surface, the room screen, the answer policy, the voice path | 3 to 5 independent reviewers, then synthesis |

**Escalate a tier regardless of size** when the change touches any of these, because each one is a place where green tests have already coexisted with a real defect:

- `src/domain/answer-policy/**`, the highest-risk path in the product
- `src/domain/voice/**`, where all seven persona defects were
- `src/design/**` or the room screen's rendered output, where a hashed class name once silently collapsed every font size and contrast ratio
- anything a resident hears or reads

## Composing a panel

Pick for the surface actually touched. Keep it to five or fewer; more reviewers means more reconciliation and less signal.

- **The room screen** is anchored by a design lens: **UI Finish-Gate Reviewer** or **UX Researcher**, plus **Accessibility Auditor**, which is not optional here. This is a screen designed for an 84 year old reading from a bed at three metres, so accessibility is the product rather than a compliance layer.
- **Anything a resident hears or reads** gets **Persona Walkthrough**. It is the only reviewer that reads a screen as Marta rather than as a designer.
- **The family app** gets **UX Researcher**, because its user is guilty, interrupted, and nine thousand kilometres away, plus **Accessibility Auditor** at 390px.
- **The answer policy or the voice path** gets **Code Reviewer** and **Persona Walkthrough** together. Correctness and consequence are different questions here and both have been wrong.
- **"Is this actually done"** on a large change gets **Reality Checker**, which defaults to NEEDS WORK.
- **Copy, anything a person reads or hears**, goes to the `nora-copy` skill rather than a panel agent.

## Two modes

- **Critical review** (`/panel`): something exists. Reviewers hunt for what is wrong and return a ranked findings list. Run it before calling a Medium or larger change done.
- **Ad hoc**: spawn one specialist with the Agent tool for a Small check without the ceremony.

There is no generative discovery skill here yet. PROJECT.md section 11 already sequences the work, so the missing piece is review rather than exploration.
