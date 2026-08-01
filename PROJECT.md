# Nora

Project brief for Claude Code. Read this whole file before writing anything.

Nora is a working name, not a decided brand. See "Naming" near the end.

---

## 1. What we are building

A tablet that lives in the room of a person with dementia and always shows the answer to the questions they repeat: what day is it, where am I, who is coming, what happens next. A family member keeps it current from an app on their phone. The person in the room can also talk to it, and it can answer without being asked first.

Two surfaces, one system:

**The room screen.** Always on, no lock screen, no navigation, no way to reach a broken state. Mounted or on a bedside table. The person using it configures nothing and may not remember between glances that it exists.

**The family app.** Where a daughter or partner sets the schedule, uploads photos with names, records voice messages, and decides how Nora answers hard questions. This is also where the buyer lives, so it carries the brand and the subscription.

---

## 2. Who it is for

The person in the room is in moderate to late stage dementia, most likely living in a care home. They cannot install, charge, unlock, or configure anything. They will not remember a wake word. Assume every interaction starts from zero context on their side.

The buyer is an adult child or spouse. They feel the problem as guilt and helplessness: the same question every visit, phone calls that no longer work, a parent who is losing the thread of their own days.

Care staff are not users in v1. They didn't buy it and they have their own systems.

---

## 3. Product principles

These are requirements, not tone guidance. If a change violates one of these, it is wrong even if it works.

**Never impatient.** The fortieth time someone asks what day it is, the answer sounds exactly as warm as the first. No "as I mentioned", no "again", no acknowledgement that the question has been asked before. There is no conversation history that affects tone.

**No scorekeeping.** No checklists, no unticked boxes, no streaks, no "you missed your walk". A screen that shows four incomplete tasks tells someone every hour that they are failing. Show the next thing, singular.

**One answer per screen.** Not a dashboard. If a designer wants to add a second element, something has to come off.

**Short spoken answers.** One or two sentences. Long replies exceed working memory and the person loses the thread before the end.

**Never quiz.** No "do you remember?", no recall prompts, no testing.

**Silence beats a wrong answer.** A device that misses a question is a small failure. A device that talks to an empty room is a voice with no source, and paranoia and auditory hallucination are common in later Alzheimer's and near universal in Lewy body dementia. When confidence is low, stay quiet or show the answer on screen instead of speaking it.

**Light before sound.** Always wake the screen a beat before speaking so the voice has somewhere visible to come from.

---

## 4. The room screen

Default view, and for long stretches the only view:

- Day and part of day, in words. "Tuesday morning", not a clock face. Never abbreviate to "Tue".
- Where they are, by name. "You are at [facility], room 12."
- One next thing. "Lunch at 12" or "Anna is coming at 3."
- A photo of someone who loves them, with the name written under it.

Design constraints that come from the users, not from taste:

- Readable from a bed at three metres. Minimum body size far above normal web defaults.
- The ageing lens yellows, which desaturates blues and destroys blue-green discrimination first. Warm colours stay distinguishable longest. Do not build a blue-dominant room screen.
- No thin fonts. No tight letter spacing. Tracking at 0 or slightly positive.
- Contrast: WCAG AAA where achievable, AA as an absolute floor, on the room screen specifically. Verify with real numbers, not by eye.
- Auto-dim to ambient light. A bright screen at 3am causes sleep disruption and disorientation.
- No animation that could read as movement in the room. Slow crossfades only.

---

## 5. The voice layer

Always listening, in two modes. A wake word is a memory task, and memory is the thing that's gone, so invocation-only voice mostly does not work for this population.

**Mode one: always on, entirely local.** A narrow intent set covering the questions people actually repeat. What day is it. Where am I. When is lunch. When is someone coming. When am I going home. Who are you. Perhaps twenty phrasings each per language, matched on-device against a rolling in-memory buffer that is continuously overwritten. Answers are scripted and pulled from the same data the screen renders. Works with no network.

**Mode two: invoked, cloud-backed.** Open conversation and reminiscence. Reached by wake word, by a large on-screen button, or by the local matcher recognising it was addressed but not understanding. This is the layer for better days and earlier stages. If nobody ever uses it, the product still has to justify its price.

### Privacy is architectural, not a policy page

Continuous capture in the bedroom of someone who cannot consent is only defensible if the following are literally true at the code level:

- No audio is written to disk, ever.
- No audio is transmitted in mode one.
- The buffer exists in memory for a couple of seconds and is overwritten.

The sharper legal exposure is not the resident, it is everyone else in the room. Cleaners, nurses, physios, visiting relatives, other residents. None of them consented to anything. The only answer that survives a care home compliance officer is that no recording exists.

Also required: a physical or software microphone switch the family controls, and a mic state indicator visible from across the room.

### Open question to resolve before building mode two

Whether the invoked path sends audio or sends text transcribed on-device. Text is far more defensible. On-device ASR costs hardware and is the harder engineering problem, especially for Afrikaans. Do not decide this by default. Flag it and get a real cost number.

---

## 6. The hard one: what Nora says about the dead

"Where is my husband?" when he died eight years ago.

Reality orientation causes fresh grief every single time it is delivered, and this device will deliver it dozens of times. Validation avoids the harm but means saying something untrue. Dementia care has argued about this for decades and there is no settled answer.

Implementation:

- The family sets the policy per person during setup, as an explicit choice, not a default they discover later.
- The family can write the exact wording for specific topics.
- Default when nothing is set: gentle redirection, not correction.
- Hard floor regardless of setting: Nora never volunteers a death, never elaborates on one, and never says anything that implies a person is alive when the family has chosen truthfulness.

Treat this as the highest-risk code path in the product. It gets tests.

---

## 7. Data and content

Two inputs feeding one screen.

**Family app.** Photos with names, recorded voice messages, free-text notes ("Pa is at work, home tonight"), the answer policy, the facility name and room number, the person's preferred language and the name they answer to.

**Shared calendar.** Recurring structure: meals, physio Thursdays, the hairdresser. Read-only import, iCal to start.

The device will sometimes be wrong because the facility changed the day's activities and nobody told the family. That is a known limitation of v1. Instrument how often it happens before deciding whether staff access is v2.

**The simplicity dial.** One family-controlled setting that reduces what the device does as the disease progresses. Turned up, Nora is a real assistant. Turned down, it shows the day and a face and speaks only when spoken to. Build this as a first-class concept from the start, not a pile of feature flags added later.

---

## 8. Languages

English and Afrikaans in v1. Both live at once, not a settings toggle, because speakers switch mid-sentence and nobody in late-stage dementia is going to operate a language picker.

Four more later, chosen once the launch market is settled. Design for two things now even though they ship later:

- Language reversion. People frequently lose a second language and revert to a mother tongue, sometimes one the family does not speak. The device may need to change primary language partway through the disease, at a point when the person cannot tell us to.
- The voice name is per-person and localised, chosen by the family at setup. A Turkish grandmother should not be addressed by something with a Dutch name.

ASR quality on elderly voices with dysarthria, in Afrikaans, is the technical risk that could sink mode one. Published benchmarks are built on younger, clearer speakers. Test early with real recordings before committing to an approach.

---

## 9. Stack

TypeScript throughout.

| Layer | Choice | Why |
| --- | --- | --- |
| App | Next.js, App Router | One repo, two surfaces, shared data layer |
| Hosting | Vercel | Per-PR preview deploys are the stakeholder feedback loop |
| Database | Postgres on Neon | Branch per PR pairs with preview deploys |
| Data access | Drizzle | Migrations and types. Prefer raw SQL where a query is clearer as SQL |
| Auth | Family app only | Room device authenticates with a long-lived device token, never a login |
| Room device | PWA in Android kiosk mode | Prototype in web, defer native until the interaction is validated |
| Speech (prototype) | Web Speech API | Throwaway. Good enough to test whether the interaction works |
| LLM (invoked path) | Vercel AI SDK | Small surface, no framework needed yet |
| Browser tests | Playwright | So the agent can verify and screenshot its own work |

Routes: `/app` for family, `/room` for the kiosk display.

### What we rejected and why

**BuilderIO agent-native.** Good framework, wrong shape for this product. Its value is that the agent and UI are equal citizens and anything clickable is also askable. Nora's resident never mutates app state through conversation, and the family app is a small CRUD surface. It would mean adopting a framework's conventions to get help with the easy part while doing nothing for the hard part, which is local offline audio.

Do take its skills without the framework:

```
npx @agent-native/core@latest skills add visual-plan
```

That gives `/visual-plan` and `/visual-recap`. A visual recap link is the right artifact to hand a care home manager who will never open GitHub.

**Mastra.** Not yet. The invoked path is a few lines of AI SDK and the local intent set is a match statement, not a workflow. Revisit when we need an eval harness, which we will, because tone and the grief policy need regression tests.

**Native app first.** Premature. Nothing is validated yet.

---

## 10. Conventions

- No em dashes anywhere, including code comments and docs. Use commas, parentheses, hyphens, or two sentences.
- Save magic numbers into named constants. Especially true here: minimum font sizes, contrast ratios, dim thresholds, buffer length, confidence thresholds. These are product decisions and they should be readable as such.
- SQL status codes in kebab-case.
- Prefer `<div>` over `<article>` for non-standalone components.
- Console methods overridden globally for richer logs, server side only.
- Commit messages in imperative mood, scoped by surface where it helps (`room:`, `app:`, `db:`).
- Prose in this repo follows the human-prose rules: no filler openers, no "in conclusion", no over-bolding, vary sentence length, straight quotes only.

---

## 11. What to build first

Do not build the whole thing. Build in this order and stop for review between each.

**Step 0.** Scaffold. Next.js, TypeScript, Drizzle, Neon, Vercel, Playwright. Get a hello-world preview deploy working on a PR before anything else. The loop matters more than the code.

**Step 1. The room screen, static and fake.** Hardcoded data, no database, no auth. Day and part of day, location, one next thing, one photo with a name. Get the typography and contrast right against the constraints in section 4. This is the artifact we put on a real tablet in a real room to find out whether an always-on screen gets looked at or becomes furniture. That test is worth more than the next three months of code.

**Step 2. Schema and the family app.** Person, facility, schedule entries, photos, voice messages, answer policy, simplicity level, device tokens. Family app screens to edit them. Room screen reads from the database.

**Step 3. Calendar import.** iCal, read-only, merged into the schedule view.

**Step 4. Voice, mode one only.** Local intent matching against the narrow set, scripted answers from the same data the screen renders. Web Speech API is fine here. Prove the interaction, not the engineering.

**Step 5. The answer policy engine.** Grief handling, per-person settings, family-authored wording, tests on every branch.

Mode two and anything cloud-backed comes after all of the above, and only once the audio-versus-text question in section 5 is answered.

---

## 12. Explicitly out of scope for v1

- Medication reminders. Regulatory exposure and getting it wrong is dangerous.
- Fall detection.
- Video calling, until we know a person at this stage can manage one.
- Care home system integration.
- Any claim about slowing cognitive decline, monitoring, or clinical outcomes. That is medical device territory and we are not going there.
- Any "clinically informed, built with healthcare expertise and evidence" claim until it is true.

---

## 13. Naming

Nora is a placeholder chosen because it works across several likely languages and reads as a person rather than a product.

Forget-Me-Not is ruled out. It collides with at least two existing dementia apps in the same category, the Alzheimer's Society UK fundraising appeal, a dementia training company, a caregiver book, a research outreach project, and a registration in Nice class 9. It is also a plea, and naming the device after the thing the user is frightened of is the wrong move.

Likely structure: an abstract, language-neutral company and family app brand, plus a per-person voice name the family chooses at setup. This is unresolved. Do not hardcode brand strings, put them behind a config.

There is an existing brand guideline document (Forget-Me-Not AI) with good craft and a few problems worth carrying forward as lessons: the palette promises WCAG AA but the primary blue is roughly 2:1 on white and only the darkest blue is usable for text, "never use thin fonts" contradicts "icons should be thin line", and the garden metaphor set (seed, sprout, bloom) is infantilising for an 82-year-old in a care home.

---

## 14. Open questions

Carry these visibly. Do not silently pick answers.

- Launch market. Undecided. The language choice was not a market thesis.
- Whether orientation or family presence is the primary need. Both are instinct, neither is researched. Needs actual work with care staff and families.
- Whether a device that answers unprompted is comforting or unsettling. Wizard-of-Oz it with a human listening before writing any intent matching.
- Audio versus on-device text for the invoked path.
- Whether always-on screens get looked at after week one.

Ethics review is not optional. The user cannot consent, the family consents on their behalf, and this device shapes what a vulnerable person believes about their own life. Get a clinician or ethicist involved early.

---

## 15. Starting prompt

Suggested first instruction to the agent:

> Read PROJECT.md in full. Then run /visual-plan for step 0 only: scaffold Next.js with TypeScript, Drizzle, Neon, Vercel and Playwright, with a placeholder page at /room and /app, and get a preview deploy working from a pull request. Do not build product features yet. Show me the plan before writing code.

After step 0 lands, work one step at a time from section 11, opening a PR per step with a visual recap, and stopping for review before starting the next.
