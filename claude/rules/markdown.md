---
paths:
  - '**/*.md'
---

# Markdown and prose

## Prose rules, from PROJECT.md section 10

These apply to every document in the repo, including this harness, code comments, and commit messages.

- **No em dashes.** Anywhere. Use a comma, a colon, parentheses, or two sentences.
- **Straight quotes only.** No curly quotes, in prose or in source strings.
- **No filler openers.** Not "In today's fast-paced world", not "Let's dive in", not "In conclusion".
- **No over-bolding.** Bold the term being defined, not the sentence explaining it. A paragraph with four bold phrases has none.
- **Vary sentence length.** Uniform medium-length sentences read as generated.
- **State the reason, not the reassurance.** "Because the ageing lens desaturates blues" beats "for accessibility reasons".

## Structure

Markdownlint defaults, with one deliberate exception.

- **MD041**: the first line is a top-level `# Heading`, or the first line after the closing `---` of frontmatter is.
- Heading levels are sequential. Never `#` straight to `###`.
- **MD040**: every fenced code block declares a language. `bash`, `typescript`, `text`, `json`.
- **MD031 / MD032**: a blank line before and after every heading, fence, and list.
- **MD047**: the file ends with exactly one newline.

**MD013 (line length) does not apply here.** Equip's repos hard-wrap prose at 80. This one does not, and `PROJECT.md` and `personas/*.md` are written one line per paragraph. Reflowing them would be a large diff for no reader benefit, so the convention is one line per paragraph throughout. Do not introduce hard wrapping into a file that does not have it.

There is no markdownlint in `pnpm run check`. These hold by discipline.

## Documents that are not prose

`personas/*.md` files carry tables whose rows map to ids in `personas/scenarios.ts`. `personas/FINDINGS.md` records defects that were found and closed. Neither is decorative: editing a persona table without editing the scenario is how the two drift apart, and the whole point of that folder is that they cannot.

`PROJECT.md` is the brief and is never edited to match the code. When the code and the brief disagree, that is a finding.
