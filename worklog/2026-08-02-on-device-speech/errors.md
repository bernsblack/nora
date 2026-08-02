# Errors: on-device Afrikaans speech

No code was written, so these are findings about the harness rather than incidents in the work.

## The privacy floors are enforced only for TypeScript, and nothing says so

- **What went wrong:** `src/domain/voice/privacy.test.ts` is described in PROJECT.md section 5, in `claude/rules/voice.md` and in CLAUDE.md as the thing that makes the three privacy floors "literally code properties, not policy prose". It is a **source scan over `src/domain/voice/`**. Any audio path that leaves TypeScript, which is precisely what the reviewed spec proposes, is invisible to it. The claim would survive the mechanism by some margin.
- **Root cause:** the scan was written when the only possible audio path was a browser API, so the boundary of what it covers was never stated. It reads as "the floors are enforced" rather than "the floors are enforced in this directory, in this language".
- **How it was caught:** reviewing an external spec that would have crossed the boundary. **Not by a test, and not by anyone working in the repo.** If the spec had been implemented by someone who trusted the documentation, the floors would have become unenforced silently and every document would still have claimed otherwise.
- **Proposed guide or sensor:** state the scan's boundary in `claude/rules/voice.md` and in the test's own doc comment, in the form "this holds for TypeScript under `src/domain/voice/`, and nothing enforces it anywhere else." Then, if a native or WASM audio path is ever adopted, the first commit of it extends the scan or replaces it.
- **Now enforced by:** nothing yet. Worth doing regardless of whether this spec goes anywhere, because it is a claim in three documents backed by a mechanism narrower than the claim.

## An external spec arrived scoped to a platform the brief had already rejected

- **What went wrong:** the spec is an iOS and Android native plan. PROJECT.md section 9 puts the room device on a PWA in Android kiosk mode and lists "native app first" under what was rejected, with a reason. A reader who started from the spec would not learn that.
- **Root cause:** not a defect in the spec, which was written without the brief. Logged because it is the second time a plausible technical document has proposed something PROJECT.md settled, and the pattern is worth watching rather than the instance.
- **How it was caught:** review against the brief, which CLAUDE.md already requires before writing anything.
- **Proposed guide or sensor:** none proposed. Reading PROJECT.md first is already the rule and it worked here. If a third instance turns up, the answer is probably a short "decisions already taken" section in the brief that external documents can be checked against quickly.
- **Now enforced by:** CLAUDE.md, which already says to read PROJECT.md in full before writing anything.
