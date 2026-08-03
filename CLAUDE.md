# Nora

**Start with [handoff/NEXT.md](handoff/NEXT.md).** It is short, it is the last session's note to this one, and it says whether anything is in flight. A `SessionStart` hook normally injects it above, already carrying a staleness verdict computed from git. If it is not there, read it, and check the commit in its header against `git log` yourself.

**Then read [PROJECT.md](PROJECT.md) in full before writing anything.** It is the brief and it wins over this file, over the harness in `claude/`, and over anything a reviewer says.

End a session with `/goodbye`, which updates the active worklog and writes the next handoff.

## The harness

| Where | What |
| --- | --- |
| `claude/rules/*.md` | Rules, each declaring `paths:` frontmatter |
| `claude/agents/*.md` | Six read-only specialist reviewers, convened by `/panel` |
| `claude/skills/*.md` | `/panel` for review, `/goodbye` to end a session, `nora-copy` for anything a person reads or hears |
| `handoff/NEXT.md` | The last session's note to this one. Read first, written by `/goodbye` |
| `claude/hooks/` | `SessionStart` injects the handoff, `SessionEnd` leaves a breadcrumb after an ungraceful exit. Merged into `.claude/settings.json` by the setup script |
| `worklog/` | One folder per non-trivial task: `plan.md` to resume from, `errors.md` to ratchet from. `INDEX.md` is the ledger |
| `docs/traceability.md` | Which PROJECT.md requirement is held up by which test, and the six that nothing holds |
| `scripts/setup-claude.sh` | Symlinks the above into `.claude/`, from the pnpm `prepare` hook |

`claude/` is committed. `.claude/` is generated and gitignored. Change a rule in `claude/`, never in `.claude/`.

The hook fires on a fresh clone. pnpm skips it when an install is a complete no-op, so run `pnpm run prepare` after pulling a change that adds a rule or an agent.

### Read the rule before you edit the path

The rules declare `paths:` frontmatter so they can load automatically. **Do not rely on that.** Before editing a file under one of these paths, read the rule yourself:

| Editing | Read first |
| --- | --- |
| `src/domain/answer-policy/**`, `src/app/app/actions.ts`, `personas/**` | [`claude/rules/answer-policy.md`](claude/rules/answer-policy.md) |
| `src/domain/voice/**`, `src/app/room/use-voice.ts`, `src/services/speech.ts` | [`claude/rules/voice.md`](claude/rules/voice.md) |
| `src/app/room/**`, `src/design/**`, `src/lib/contrast.ts` | [`claude/rules/room-screen.md`](claude/rules/room-screen.md) |
| any `*.test.ts`, `*.spec.ts`, `e2e/**`, `personas/**` | [`claude/rules/testing.md`](claude/rules/testing.md) |
| any `*.md` | [`claude/rules/markdown.md`](claude/rules/markdown.md) |
| `worklog/**` | [`claude/rules/worklog.md`](claude/rules/worklog.md) |
| `handoff/**` | [`claude/rules/handoff.md`](claude/rules/handoff.md) |
| deciding how much review a change needs | [`claude/rules/agent-panel.md`](claude/rules/agent-panel.md) |

Each rule carries the reason a constraint exists, and most of them exist because something already went wrong in exactly that file. They are worth the read even when the change looks small.

## Commands

```bash
pnpm dev                      # http://localhost:3000
pnpm run check                # typecheck, lint, unit tests
pnpm run e2e                  # browser tests
pnpm run test:db              # repository contract suite against a real Postgres
pnpm run screenshots          # writes screenshots/
pnpm exec vitest run personas # the persona stress test alone
```

## The non-negotiables

These are the ones that are cheap to violate by accident. The full set is PROJECT.md sections 3 to 6.

- **Never impatient.** The fortieth ask sounds like the first. No "as I mentioned", no acknowledgement that the question has been asked before, no conversation history that affects tone.
- **No scorekeeping.** No checklists, no unticked boxes, no streaks. The next thing, singular.
- **One answer per screen.** To add a second element, something comes off.
- **Silence beats a wrong answer.** A missed question is a small failure. A voice with no source is not.
- **The three privacy floors are literal code properties**, not policy prose: no audio written to disk ever, no audio transmitted in mode one, the buffer is in memory for seconds and overwritten. `src/domain/voice/privacy.test.ts` enforces them by scanning source.
- **The three answer-policy floors**: never volunteer a death, never elaborate on one, never imply a person is alive when the family chose truthfulness.
- **No em dashes anywhere**, including code comments and commit messages. Straight quotes only.
- **Magic numbers become named constants** in `src/config/constants.ts`, with the reason beside them. Font floors, contrast ratios, dim thresholds, buffer length, confidence thresholds are product decisions and should read as such.

## Working on something non-trivial

1. Copy `worklog/_template/` to `worklog/YYYY-MM-DD-slug/`, write `plan.md`, add a row to `worklog/INDEX.md`. Trivial work skips this.
2. Work the plan. Log incidents to `errors.md` as they happen, not afterwards.
3. `pnpm run check`, and `pnpm run e2e` if anything rendered changed.
4. Run `/panel` before calling a Medium or larger change done. Sizing and composition are in `claude/rules/agent-panel.md`. A panel is advisory and never overrides a rule.
5. Run the closing step in `plan.md`: promote the durable part out of the folder, then set the status in `INDEX.md`.
6. `/goodbye` before stopping. It rewrites `plan.md`'s **Current state** and writes the next handoff.

A fresh session must be able to resume from `handoff/NEXT.md`, `PROJECT.md`, and the active `plan.md` alone. If it cannot, the session did not end properly.
