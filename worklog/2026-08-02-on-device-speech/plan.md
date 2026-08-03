# Plan: on-device Afrikaans speech, evaluation before commitment

## What this is

A review of `afrikaans_voice_mobile_spec.md` (supplied 2026-08-02, external, not committed here) and the task it should become.

The spec proposes `whisper.cpp` for STT and `piper` via ONNX Runtime for TTS, compiled natively for iOS and Android and bridged to TypeScript over JSI. It is competent on its own terms and aimed at the right problem: [PROJECT.md section 8](../../PROJECT.md) names Afrikaans ASR on elderly voices as "the technical risk that could sink mode one", and `claude/rules/voice.md` calls on-device ASR "the single largest unresolved engineering risk in the product".

**It is not a plan this project can adopt as written.** What it is, is a strong argument for one half of an open question the brief says explicitly not to answer by default. So this is an evaluation task with a decision at the end, not an implementation task.

## The critique

### It reverses a stack decision the brief made explicitly

The spec is an iOS and Android native plan. PROJECT.md section 9 puts the room device on a **PWA in Android kiosk mode**, and states the reason: "prototype in web, defer native until the interaction is validated." The same section lists **"Native app first"** under what was rejected, with the reason "premature, nothing is validated yet."

Adopting the spec reverses that, and CLAUDE.md is explicit that PROJECT.md wins. The interaction is not validated: section 14 still carries "whether always-on screens get looked at after week one" and "whether a device that answers unprompted is comforting or unsettling" as open questions. Building a native audio stack now spends the most expensive budget in the project on the layer underneath a product nobody has confirmed works.

This is a sequencing error, not a technical one. Nothing in the spec is wrong about whisper.cpp.

### Whisper hallucinates on silence, and this device is mostly silence

This is the finding that should stop the spec being adopted unexamined. Whisper is known to emit fluent, confident, entirely invented text when fed silence, breathing, background noise or music. It is a generative decoder with no reliable way to abstain.

Nora is an always-on microphone in a bedroom. The overwhelming majority of its input is silence and non-speech. Feed that into the current matcher, which the panel run on 2026-08-02 established will speak on **two shared tokens appearing anywhere in an utterance of up to thirty** (`personas/FINDINGS.md` finding 8), and the failure mode is a device that answers questions nobody asked, at three in the morning, in the room of someone with visual and auditory hallucinations. "A voice with no source" is not a tone problem in PROJECT.md section 3, and this combination manufactures one.

The spec does propose VAD, but proposes it as a **battery optimisation**. Here it is a correctness control and it is load bearing. Any evaluation has to measure hallucination rate on room silence, not only word error rate on speech.

### It asserts Afrikaans accuracy and cites nothing

"The `tiny` model is generally too inaccurate for Afrikaans. `base` provides a strong trade-off" is the whole evidence base for the central model choice. No benchmark, no source, no number.

Afrikaans is a low-resource language in Whisper's training mix and its published error rates are poor next to English. More importantly, PROJECT.md section 8 already anticipated exactly this: "published benchmarks are built on younger, clearer speakers." The population here is 84 with dysarthria. Whatever the published Afrikaans figure is, it is not the figure that applies, and the spec does not acknowledge that the gap exists.

### It never mentions that both languages are live at once

PROJECT.md section 8 requires English and Afrikaans simultaneously, "not a settings toggle, because speakers switch mid-sentence". Marta does exactly this, and the matcher scores both languages on every utterance.

Whisper does not work that way. It takes a language, or auto-detects per window, and auto-detection on a short buffer is unreliable and cannot follow a switch inside a sentence. The spec's architecture has nowhere to put this requirement, and it is not a detail. It is how the resident actually speaks.

### It would remove the mechanism that makes the privacy floors true

The spec says "absolute data privacy" and means it. But `src/domain/voice/privacy.test.ts` enforces the three floors **by scanning TypeScript source** for `MediaRecorder`, `getUserMedia`, `writeFile`, `fetch` and the rest. A native C++ module is invisible to that scan.

So adopting this spec silently deletes the enforcement while keeping the claim. PROJECT.md section 5 says the floors are defensible only if they are "literally true at the code level"; afterwards they would be true only as long as somebody remembered. The spec is also silent on the floors themselves: it specifies capturing raw PCM and says nothing about never writing it to disk, and the common whisper.cpp integration path writes wav files.

Adoption needs the privacy scan extended to the native layer, or a different mechanism entirely, settled before the code lands rather than after.

### It gives no latency budget and no cost number

`LIGHT_BEFORE_SOUND_MS` is 700ms and the whole interaction rests on the screen changing before the voice arrives. The spec offers no STT latency figure at all, and "minimising perceived latency" for TTS without a number. If Whisper `base` takes three seconds on the target hardware, the interaction is a different shape and several product decisions move with it.

And PROJECT.md section 5's open question asks for one specific thing: "On-device ASR costs hardware and is the harder engineering problem, especially for Afrikaans. **Do not decide this by default. Flag it and get a real cost number.**" The spec proposes roughly 180MB of resident models plus CoreML and NNAPI acceleration, and never names a device, a specification, or a price. That is the deliverable the brief asked for, and it is the one thing absent.

### Smaller things

- **The Piper Afrikaans voice is treated as solved.** It is a community-trained model, and its provenance, training-data licensing and voice identity are all unexamined. PROJECT.md section 8 makes the voice a per-person family choice for a stated reason. One community voice of unknown age and gender is not obviously acceptable to a family choosing what will speak to their mother.
- **VAD decides whose speech gets transcribed**, not merely when the CPU wakes. In a shared room that means cleaners, nurses, physios and visitors, the people PROJECT.md section 5 identifies as the sharper legal exposure. The spec frames this purely as battery.
- **No evaluation plan and no corpus.** PROJECT.md section 8 says test early with real recordings before committing to an approach. There is no corpus here, and obtaining one carries an ethics problem the spec does not touch: the residents cannot consent. Staff and volunteer recordings have to come first.
- **Nothing on addressing.** Whisper transcribes everything, which makes the open finding at the end of `personas/FINDINGS.md` worse rather than better. `asked` is currently hardcoded true, so more transcription means more input reaching a floor that never fires.

### What it gets right, and it is not nothing

It answers PROJECT.md section 5's open question in the defensible direction: **transcribe on device, send text, never audio.** That is the right answer, and the spec assembles the case for it without ever claiming the credit. The technology choices are sensible for the problem as stated, the concurrency and out-of-memory warnings are real and specific, and preferring a quantised local model to a cloud round trip is exactly what floor 2 demands.

The disagreement is about when, on what platform, and on what evidence. Not about whether.

## The matcher question turned out to be this question

Added 2026-08-03. This task started as speech in and speech out. It now also carries **what does the matching**, because the two collapsed into one question.

`worklog/2026-08-02-matcher-precision/` closed three blockers and then hit a wall: four persona scenarios that no bag of words scorer can close, demonstrated by implementing and reverting three separate mechanisms. Every one that protects Halina's dead husband costs Halina's day fragment, because both are a short fragment partially matching a short phrasing.

That is not a tuning problem. Intent classification from noisy, wandering, code-switched speech by an elderly person with dysarthria is a thing models are good at and hand-written token overlap is bad at, and the four red scenarios are the evidence.

**The decision taken, and its boundary:**

- The matcher is a candidate for replacement by a small model doing **intent classification and subject extraction**.
- **The answer policy is not.** Classification is not generation. A model may decide which intent was heard and who was named; it hands off to the scripted policy in `src/domain/answer-policy/` unchanged. The three floors stay branches with tests, because a prompt instruction is a probabilistic constraint on output nobody can prove, and this is the path that decides what a woman believes about whether her husband is alive.
- **A cloud call cannot be mode one.** No network, and `LIGHT_BEFORE_SOUND_MS` is 700ms. So this is an on-device model question, which is the same hardware and cost question this task already had, for a second model alongside Whisper and Piper.
- **Silence is the wrong shape for a language model.** Its failure mode is fluency and this product's required failure mode is saying nothing. Whether a candidate can abstain is the first property to measure, ahead of accuracy.

**Mastra.** PROJECT.md section 9 rejected it conditionally: "Not yet. The invoked path is a few lines of AI SDK and the local intent set is a match statement, not a workflow. Revisit when we need an eval harness, which we will, because tone and the grief policy need regression tests." **That condition has now been met.** `personas/` is an eval harness that grew by hand, and it is the most valuable thing in the repo. Revisit Mastra for that, not for the matcher.

Worth stating plainly: replacing the matcher makes the persona suite non-deterministic. Forty-nine crisp pass and fail scenarios become a scored eval. That is normal for model work and it is a real change to how this repo knows it is correct, and it is the strongest argument for having an eval harness before making the swap rather than after.

**No evidence yet** on how a small on-device model handles Afrikaans intent classification for elderly dysarthric speech. That needs measuring exactly like Whisper does. Asserting it would repeat the mistake this task was opened to criticise.

## Steps

- [x] Review the spec against PROJECT.md and the harness, and write the critique above
- [x] Record the decision that the matcher is a model candidate and the answer policy is not, and promote it into `claude/rules/voice.md`
- [x] **Settle the platform question first.** Native is a reversal of PROJECT.md section 9 and has to be taken deliberately or not at all. **Decided by Bernard on 2026-08-03: the room device stays a PWA and native is parked**, not rejected, until the interaction is validated. PROJECT.md section 9 stands as written. Everything below is measurement, and none of it needs a native shell to produce a number
- [ ] Build a small Afrikaans evaluation corpus from **consenting adults**, staff and volunteers, including elderly and dysarthric speech. No resident recordings
- [ ] Measure Whisper `base` and `small`, quantised, for word error rate on that corpus **and for hallucination rate on room silence and non-speech**. The second number is the one that decides this
- [ ] Measure end-to-end latency on candidate hardware against `LIGHT_BEFORE_SOUND_MS`
- [ ] Produce the hardware cost number PROJECT.md section 5 asks for: a named device, a specification, a unit price
- [ ] Evaluate the Piper Afrikaans voice with a family member rather than an engineer, and check provenance and licensing
- [ ] Decide how the three privacy floors are enforced if any audio path leaves TypeScript, before such code exists
- [ ] **Measure a small model on intent classification**, against the four red persona scenarios plus all 45 that currently pass. Measure its ability to abstain first and its accuracy second. On-device, since a cloud call cannot be mode one
- [x] **Revisit Mastra for the eval harness**, which is the condition PROJECT.md section 9 deferred it on and which has now been met. Not for the matcher. **Done 2026-08-03 in [`worklog/2026-08-03-eval-harness/`](../2026-08-03-eval-harness/plan.md), and the answer was to build it here instead.** The condition was pointed at the wrong layer: under the boundary that the answer policy stays scripted, nothing in mode one ever produces prose for a judge to grade. The harness exists, the baseline is committed, and the matcher now sits behind a `Classifier` seam a model can implement
- [ ] Write the result up as an answer to PROJECT.md section 5's open question, and amend section 14
- [ ] Closing step, below

## Current state

- **Done:** the critique, the decision that this task now also owns what does the matching, the platform decision, and the eval harness. No speech code, no model dependency, no spike run.
- **Next:** the corpus. Everything remaining on the speech half is measurement, and every measurement needs recordings from consenting adults that do not exist yet. That is the one thing blocking all four remaining Whisper steps, and it is procurement and ethics rather than engineering.
- **What is no longer blocked.** The platform question is settled and the eval harness exists, so the matcher measurement step can run as soon as there is a candidate model. `personas/eval.ts` is the seam and the baseline to beat.
- **Open decisions:**
  - Whether to evaluate Whisper at all before the interaction is validated, or park the question entirely. Parking it is defensible: the brief asks for a cost number, and a cost number does not require a working integration.
  - How the privacy floors are enforced outside TypeScript. Less urgent now that native is parked, since no audio path leaves TypeScript until it is unparked, but it has to be answered before such code exists rather than after. `privacy.test.ts` is a source scan over TypeScript and three documents describe it as making the floors true at code level.
  - **Whether replacing the matcher is worth the cost at all.** Still open, deliberately. Bernard's 2026-08-03 call was to build the eval harness first rather than to commit either way, so the swap is now a measurement against a committed baseline instead of a leap.
  - The maximum false speech rate a replacement has to clear. Today's matcher sits at 4/23 and every one of those four is a known acceptance criterion. Setting a target number before there is a candidate would be inventing it.

## Closing step

Promote the durable part out of this folder before marking the task done in `worklog/INDEX.md`.

- [ ] A constraint on how the code may change becomes a rule in `claude/rules/`. If native audio is ever adopted, `voice.md` needs its privacy enforcement story rewritten
- [ ] A product number becomes a constant in `src/config/constants.ts`, with its reason
- [ ] Anything a resident might say becomes a scenario in `personas/scenarios.ts`
- [ ] A PROJECT.md principle with nothing behind it becomes a row in `docs/traceability.md`
- [ ] Incidents in `errors.md` reviewed, and anything recurring turned into one of the above
- [ ] Status set to done in `worklog/INDEX.md`, with a summary worth finding in three months
