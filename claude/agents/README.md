# Specialist agents

Repo-local, version-controlled subagent definitions, symlinked into `.claude/agents/` by `scripts/setup-claude.sh`. Convened by `/panel`, governed by [`claude/rules/agent-panel.md`](../rules/agent-panel.md).

## Provenance

Ported from [`equip-platform/claude/agents/`](https://github.com/) and substantially rewritten for this product. That roster is itself derived from [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents) at `8ef49232e02431f7ca4792b487e5a85a7939ff3a` (MIT, Copyright (c) 2025 AgentLand Contributors).

| Agent | Ported from |
| --- | --- |
| `persona-walkthrough.md` | `design/design-persona-walkthrough.md` |
| `accessibility-auditor.md` | `testing/testing-accessibility-auditor.md` |
| `ux-researcher.md` | `design/design-ux-researcher.md` |
| `ui-finish-gate-reviewer.md` | `design/design-ui-finish-gate-reviewer.md` |
| `code-reviewer.md` | `engineering/engineering-code-reviewer.md` |
| `reality-checker.md` | `testing/testing-reality-checker.md` |

## Why six and not eleven

Equip's roster serves a multi-app frontend with generated API clients, wizards, tenancy and payments. This is one product with two surfaces and no backend of its own, so Frontend Developer, AppSec Reviewer, Product Manager and Feedback Synthesizer have nothing here they would not be inventing.

The four design and UX lenses are kept in full, because most of what can go wrong in this product goes wrong in front of a person rather than in a type signature.

## Why rewritten rather than copied

The equip agents inline non-negotiables for that stack: no Zod, token-only Tailwind colours, Radix primitives, `useResource` cache invalidation, the Wft advising line. Copied unchanged they would produce confident findings about a codebase that does not exist here.

More importantly the constraints in this product are different in kind. Equip's accessibility target is WCAG AA on a phone. This one targets AAA on a screen read from three metres by an eye that has lost blue-green discrimination, and it dims that screen at night without collapsing the contrast ratio. An auditor briefed on AA would sign off on something this product considers broken.

## Tool policy

Every agent declares `tools: Read, Grep, Glob`. Read-only, no exceptions.

Panels are advisory: they produce findings, never changes. Withholding `Bash`, `Write`, `Edit` and `WebFetch` means a bad instruction in one of these files, or in a file one of them reads, has no path to execution or mutation. `WebFetch` is withheld specifically because pulling untrusted web content into an agent context is the standard second-order prompt-injection route.

If one genuinely needs to execute something, widen it deliberately in its own commit with a stated reason.

## Rule loading

Subagents do not inherit the path-triggered `claude/rules/*.md`. Each definition names the rules it must `Read` before starting. That keeps the binding deterministic and versioned instead of dependent on the calling prompt getting it right every time.
