---
description:
  Convene a proportionate panel of specialist subagents to adversarially review
  the current change. Sizes the diff, composes a panel scaled to it, fans the
  specialists out in parallel, and synthesizes their evidence-backed findings
  into one ranked list. Use before calling a Medium or larger change done.
argument-hint: "[scope path | tier=small|medium|large | agents=Name,Name]"
---

# /panel

You are convening a review panel of the specialists in `claude/agents/` to give this change an independent adversarial second opinion. The governing guide is [`claude/rules/agent-panel.md`](../rules/agent-panel.md). Read it; this skill executes it.

Arguments (`$ARGUMENTS`): an optional scope path, an explicit `tier=` to override auto-sizing, or an explicit `agents=` list to override composition. With no args, review the full working diff and size it yourself.

## 1. Scope and size

```bash
git diff --stat "$(git merge-base HEAD main)"...HEAD
git diff --stat
```

Read the actual diff for the changed files, not just the stat, so the briefing is concrete. Then assign a tier per `agent-panel.md`:

- **Trivial** (under about 15 lines, copy or config, no behaviour change): **stop.** Say a panel is not warranted and that `pnpm run check` plus self-review is enough. Do not spawn agents.
- **Small**: 0 to 1 reviewer. **Medium**: 2 to 3. **Large**: 3 to 5 plus synthesis.

**Escalate a tier regardless of size** when the change touches `src/domain/answer-policy/`, `src/domain/voice/`, `src/design/`, the room screen's rendered output, or anything a resident hears or reads.

Honour an explicit `tier=` or `agents=` override.

## 2. Compose

Pick for the surface actually touched; the full mapping is in `agent-panel.md`. In short: the room screen is anchored by a design lens plus Accessibility Auditor; anything a resident hears or reads gets Persona Walkthrough; the family app gets UX Researcher; the answer policy and voice path get Code Reviewer and Persona Walkthrough together; a large "is this done" gets Reality Checker. Copy goes to the `nora-copy` skill rather than an agent. Keep it to five or fewer.

State the composition and why, one line per agent, before fanning out.

## 3. Fan out in parallel

Spawn the chosen specialists **concurrently**, multiple Agent calls in one message, `subagent_type` set to the agent name. Brief each identically well:

- The **diff or exact `file:line` scope**. Paste it, do not describe it.
- **Nothing else.** Do not paste `claude/rules/*` or `PROJECT.md` into the briefing. Each agent names the files it must read and loads them itself. Pasting them again wastes context and drifts from the versioned source.
- The **mandate**: hunt for what is wrong. Return a ranked list, each finding with a concrete `file:line` citation and a severity (blocker / should-fix / nit). **A finding without evidence does not count.** Explicitly permit "no issues found in my area" so agreement is a real signal rather than filler.

For a Large-tier panel, tell each reviewer it is one of several independent reviewers and to trust its own read. Do not seek consensus at the reviewer stage.

## 4. Synthesize

Reconcile; do not concatenate.

- **Screen against the harness.** Drop or rewrite anything that contradicts a `claude/rules/*` rule or a requirement in PROJECT.md, and say so explicitly. A panel never overrides a rule. If an agent went off-stack, that is a defect in its definition: note it for `claude/agents/` rather than absorbing it every run.
- **Deduplicate** findings hitting the same `file:line`.
- **Rank** by severity. Where reviewers disagree, surface the disagreement and give your own adjudication with reasoning.
- **Drop** findings you can verify are wrong against the code, saying which and why. Reviewers can hallucinate; you have the repo.
- Present one ranked list: blockers, then should-fix, then nits, then any explicit clean sign-offs. End with a recommendation: ship, fix then ship, or rework.

Do **not** apply fixes as part of `/panel` unless asked. This skill produces a verdict; acting on it is a separate step.

If the panel found something in the voice path or the answer policy that a persona would have hit, offer to add it to `personas/scenarios.ts` and record it in `personas/FINDINGS.md`. That is how a one-off finding becomes a permanent test.
