# Errors: the eval harness

<!--
Written for a future harness pass, not for debugging. Log every incident during
the work: wrong assumptions, checks that passed while the thing was broken,
rework caused by a missing rule, a comment that turned out to be false.

Copy the block below per incident.

## <short incident title>

- **What went wrong:**
- **Root cause:**
- **How it was caught:** human review / a test / the linter / a browser / luck
- **Proposed guide or sensor:** what would prevent or auto-catch this next time
- **Now enforced by:** fill in once it has been promoted, or leave as "nothing yet"

"How it was caught" carries the most information in this file. If the answer is
luck, write luck. It is the strongest argument a sensor can have, and it is the
field that quietly gets rounded up to "review".
-->

## The persona README undercounted the scenarios by six

- **What went wrong:** `personas/README.md` said "Forty utterances across three residents" while `scenarios.ts` held 46. The panel run on 2026-08-02 added six scenarios and updated the persona markdown tables, `FINDINGS.md`, `voice.md`, `testing.md` and `traceability.md`, but not the count in the README.
- **Root cause:** the number was prose in a file nothing derives from. Every other artifact touched that day either contains the scenarios or names them individually, so all of them were forced to stay correct. A total is the one shape that can drift silently, because no reader has the other number in front of them.
- **How it was caught:** luck. The new harness prints its scenario count in the scorecard header, and 46 happened to land next to a README that had been read minutes earlier saying forty. Nobody was looking for it, and nothing would have looked for it.
- **Proposed guide or sensor:** stop stating totals in prose, or derive them. The scorecard header is now the only place the count is produced by a machine, and the README quotes the measured scorecard rather than a remembered number.
- **Now enforced by:** partially. `eval.test.ts` asserts `scenarios` against `BASELINE.scenarios`, so adding a scenario now fails a test and forces the baseline to be re-measured deliberately rather than drifting. Nothing reads the README, so that sentence can still rot. Considered and rejected as too much machinery for one sentence.

## A framework was nearly evaluated on its feature list rather than against the need

- **What went wrong:** nothing shipped, but the inherited framing of this task was "adopt Mastra for the eval harness", which is how both the handoff and the on-device-speech plan phrased it. Working forward from that framing means installing it first and discovering only afterwards that `runEvals` takes an Agent as its target while the thing under test is a pure function.
- **Root cause:** PROJECT.md section 9 recorded a deferral with a condition, "revisit when we need an eval harness", and a later session met the condition and read it as a decision already taken. The condition named a need rather than a solution, and the decision taken in between, that the answer policy stays scripted, had quietly removed the reason the condition existed at all. Nothing connected the two.
- **How it was caught:** human review, by checking what `runEvals` actually accepts and what the built-in scorers actually grade before writing anything. Putting `@mastra/core`'s 31 dependencies next to this repo's nine made the size of the trade concrete rather than theoretical.
- **Proposed guide or sensor:** a deferred decision carries a condition, and when the condition is met the condition itself has to be re-derived rather than just re-checked, because the thing that made it true may have moved. Restate the condition in the same pass that answers it.
- **Now enforced by:** `claude/rules/testing.md`, which carries both the answer and the restated condition naming mode two as the layer where an LLM judge earns its place, so a future session hits it before re-opening the question for mode one.
