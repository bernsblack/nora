# Plan: a tablet in a real room

## What this is

The next major milestone, and the first one that is not a coding task.

[PROJECT.md section 11](../../PROJECT.md) step 1 says of the room screen: "This is the artifact we put on a real tablet in a real room to find out whether an always-on screen gets looked at or becomes furniture. That test is worth more than the next three months of code."

Steps 0 to 5 are all done and section 11 stops there. Everything since has gone deeper into engineering: matcher precision, the on-device speech review, the eval harness. All defensible, and none of it is this. Three of section 14's five open questions cannot be answered by any amount of code, and this milestone is what answers them.

**Done means:** a real tablet has been in a real room with a real person for long enough to answer whether the screen gets looked at after week one, and the answer is written down.

## What this milestone does not need

Worth stating first, because the natural assumption is that voice comes first and it does not.

- **No Whisper, no Piper, no on-device ASR.** `/room?token=...&wizard=1` already ships a text box where a human types what they heard someone say. PROJECT.md section 14 says to Wizard-of-Oz the interaction with a human listening before writing any intent matching, and that has never been done. The rig is built and unused, and it is the correct instrument for this milestone.
- **No matcher replacement.** The four red persona scenarios stay red. They describe what the matcher cannot do, and a wizard driven test does not exercise the matcher at all.
- **No native shell.** Parked on 2026-08-03, and the PWA in Android kiosk mode is what section 9 asks for anyway.
- **No mode two.** It comes after the audio versus text question, which this milestone does not touch.

[`worklog/2026-08-02-on-device-speech/`](../2026-08-02-on-device-speech/plan.md) therefore stays blocked for the whole of this milestone, and that is correct rather than a problem. It becomes unblocked as a side effect: a facility relationship is what the consenting-adult corpus needs too.

## The tension to settle before anybody measures anything

The question is whether the screen gets looked at. The obvious way to find out is to instrument the device, and this product refuses to do that.

There is deliberately **zero instrumentation anywhere in `src/`**. PROJECT.md section 12 rules out monitoring. `personas/anna-venter.md` answers "can I see what she asks about?" with no, and says it would be the most compelling feature in a demo and would turn a companion into a monitor. `personas/pieter-venter.md` argues the refusal costs something real and that the cost should be stated rather than hidden.

Section 7 then asks, for a different purpose, to "instrument how often it happens" when the facility changes the day's activities without telling the family. That is the one measurement the brief explicitly requests, and it points the opposite way from section 12.

Three ways to resolve it, and this is a decision for Bernard rather than an implementation detail:

1. **Human observation and interview only.** Nothing is built. A person sits in the room during visits, and staff and family are interviewed. Cheapest, most defensible, weakest data, and it cannot see week three at two in the morning.
2. **A temporary instrumented build that is explicitly not the product.** Time boxed, consented to by name, removed afterwards, and never merged to the shipped branch. Answers the question properly and creates exactly the artifact section 12 says this product does not have.
3. **Instrument the screen and not the person.** Log that the screen rendered and what it showed, never what was asked or answered. Sidesteps most of section 12, and still does not tell you whether anybody looked.

**Not decided.** Nothing in phase 4 should start until it is, because the choice changes what phase 1 has to build.

## Phase 1: make the device survivable in a room

**All of this is code, none of it is blocked on anybody, and it can start immediately.** It is also the largest block of engineering since step 2, which the first draft of this plan undersold by leading with the gates.

The ordering principle: do not discover any of this with a vulnerable person in the room.

- **The night contrast defect.** Four `test.fixme` cases in `e2e/room.spec.ts` hold a real defect: the room screen does not clear AAA at night as rendered. `MIN_INK_DIM` was set against one pairing and applied to all of them, and `room-theme.test.ts` computes every pairing and passes anyway, which is the same shape as the hashed class name incident. A tablet in a bedroom at three in the morning is the exact scenario the constant exists for, so this is the one code defect that genuinely blocks the milestone. It is a product decision under `claude/rules/room-screen.md`.
- **There is no PWA.** No manifest, no service worker, nothing. Section 9's stack table says the room device is "a PWA in Android kiosk mode" and what exists is a server rendered Next.js page. This is not a checkbox: `personas/anna-venter.md` answers the buyer's "what happens if the wifi goes down?" with "the screen keeps working", and `docs/traceability.md` marks works-with-no-network as partial with "no test starts the room screen offline". Within one live page session the claim is true, because the whole day is handed over at once and derived locally. Across a reload it is false, and a tablet that is on for weeks will reload. **A care home wifi drop plus an overnight kiosk browser restart is a blank screen in the morning**, which is a week one failure and one of the few that would end the trial early. Needs a manifest, a service worker caching the last good room payload, and an e2e test that loads the room screen offline.
- **Run the database once.** The Drizzle schema and the Postgres repository are written and the first migration is generated, and neither has ever run against a real database. This is the largest source of unknown defects in the repo: `src/data/drizzle/repository.ts` is 446 lines implementing a 29 method interface across 10 tables, and not one of those methods has executed. It needs an integration suite against a real Neon branch, not a smoke test. A real room means a family member editing from a phone and the device reading it back, which is the first time Postgres is actually on the path.
- **Real family authentication.** `MockFamilyAuth` returns one fixed signed in user. The interface is two methods and swapping the provider is small, but its own doc comment names the part that is not: "which family member is allowed to change the answer policy. That is the setting that decides what a person believes about whether their husband is alive, and it should not be editable by whoever happens to have the app installed." Anna and Pieter disagree about truthfulness in their own persona files, so this is authorization design on the highest risk path in the product rather than a login page.
- **Real media storage.** Photos and voice messages are data URLs held in process memory and lost on restart. The `MediaStore` interface is two methods, so the swap itself is genuinely small: real object storage, signed URLs, content type and size limits. Section 4 puts a photo of someone who loves them on the screen, so this is not optional for the thing being tested.
- **A setup flow.** `docs/traceability.md` records that the answer policy is presented well but that nothing tests it is chosen during setup, "because there is no setup flow yet". PROJECT.md section 6 requires the family set the policy during setup as an explicit choice and not discover it later. For a real family this is the first thing they touch and it does not exist. **This is the largest single piece of work in the phase**, and it is a new surface rather than an edit: `src/app/app/[personId]/page.tsx` is 809 lines of edit-everything settings backed by 385 lines of actions, and a setup flow is the opposite shape, ordered and first run with a step that cannot be skipped. Large under `claude/rules/agent-panel.md`, so it gets a panel.
- **Check the device token default before any production deploy.** `src/app/room/page.tsx` defaults a missing token to `FIXTURE_DEVICE_TOKEN`. That is right for a prototype with no database and wrong the moment a real resident's data is behind it. Verify what it does with `DATABASE_URL` set.
- **A production deploy and Android kiosk mode.** Step 0 got per-PR previews working. Neither a production deploy nor kiosk configuration exists.

## What phase 1 turned out to need, once it was done

Written 2026-08-03, after building it. Five of the eight items are done and three are blocked on a purchase or an account, which is the honest split.

**Done:** the PWA and offline reload, the night contrast defect, Postgres exercised for real, the setup flow, and the device token. Details are in `worklog/INDEX.md` and the incidents are in `errors.md` beside this file.

**Blocked, and what is actually blocked about each:**

- **A production deploy and kiosk configuration.** Needs a Vercel account and a device. No code stands in the way.
- **Family authentication.** Swapping `MockFamilyAuth` for a bought provider is small, and it is not the hard part. Its own doc comment names the hard part: "which family member is allowed to change the answer policy. That is the setting that decides what a person believes about whether their husband is alive, and it should not be editable by whoever happens to have the app installed." `canAccess(personId)` is the only permission that exists, so today anyone with access can change it. **Anna and Pieter disagree about truthfulness in their own persona files**, which makes this a product decision about who decides, not an authorization refactor. Deliberately not invented here.
- **Photo and voice message storage.** The scope was misread when this plan was written. `MediaStore` has **zero call sites**: nothing imports it, and `addPhoto` takes a pasted URL, with a validation message that already says "until uploading is built". So the work is not swapping a mock for a vendor, it is building an upload path that does not exist, and the vendor choice gates it. The README said "data URLs in memory", which implied a working upload, and now says what is actually true.

No speculative validation or upload scaffolding was written for a flow that does not exist and whose vendor is undecided.

## The panel run, and what it changed

A five specialist `/panel` on the phase 1 diff (Accessibility Auditor, Persona Walkthrough, UX Researcher, Code Reviewer, Reality Checker). Verdict was NEEDS WORK and it was right. Two of the three blockers were found independently by two reviewers each, which is the roster working.

**Blockers, all fixed and all falsified before being believed:**

1. **The service worker could serve one resident's room screen to another.** The offline fallback matched on pathname alone, so a re-issued token or a tablet moved between rooms could restore another person's room number, schedule and photographs, and a Wizard-of-Oz session could restore a text box and a Say button onto Marta's screen after a reboot. Now keyed on the device token, with wizard and lighting renders refused. Three new browser tests, each confirmed to fail with the protection removed.
2. **A refused setup submit rewrote all three radio values.** `ActionForm`'s restore special-cased checkboxes and assigned `value` to everything else, so three options with three labels all submitted one mode and the next click saved something never chosen. Falsified: with the fix removed the new test reports three radios collapsed to one distinct value.
3. **`saveTopic` created the answer policy record with a hardcoded gentle-redirection**, which ends setup, since the record's existence is the whole signal. That is the column default the schema deliberately refuses, relocated into an action. Both it and `saveDefaultMode` now refuse when no record exists.

**Claims the panel showed were overstated, now corrected:**

- The photograph was not cached, so an offline reload rendered the words with a broken image, and the test asserted the caption rather than the picture. Images are cached and the test checks `naturalWidth`.
- `RoomFallback` renders with a 200, so the quiet screen was cached as a good render and outlived the outage that caused it. Non-ok responses also bypassed the cache entirely. Both fixed.
- The four night contrast tests never asserted it was night, and `?lux=` is now gated to fixtures, so with a `DATABASE_URL` set they would silently have measured the day palette and passed. That is the 2026-08-02 clock dependence incident returning through a door this change built. Both loops now assert `data-lighting`.
- **The setup copy described three behaviours that do not differ yet.** `answerSensitive` returns `unknown-subject-redirect` before the mode is read, so until a family writes somebody down all three choices behave identically. The screen now says so, and the settings page's claim that the choice applied to anyone she asked about is gone.

**Deliberately not fixed, with reasons:**

- **`saveAnswerPolicy` is a non-transactional delete then reinsert**, so a real Postgres has a window where a person has a policy and no topics, and two concurrent saves can interleave. Real, and unreachable today because nothing runs with a `DATABASE_URL`. Not fixed because Drizzle's neon-http driver is the production path and its transaction support is not something this session could test; shipping an untested change to that path is worse than a recorded gap.
- **The microphone switch sits behind the setup gate.** Considered and judged not a live defect: a device token can only be created from the page the gate protects, so before setup there is no device, and therefore no microphone. Worth revisiting the moment a person can be created any other way.
- **The manifest's `start_url` carries no device token**, so an installed kiosk would launch to the quiet screen. Part of the kiosk configuration work, which is blocked on a device.
- **CI is red on every push**, because `ci.yml` runs `pnpm run test` and four persona scenarios are red on purpose. Pre-existing since those scenarios were made deliberate, and the fix is a decision rather than an edit: a permanently red pipeline is a signal nobody reads, but the alternatives all touch the persona suite, which `claude/rules/testing.md` protects. **Bernard's call.**
- Accessibility raised several pre-existing items outside this diff: pinch zoom disabled app-wide by the root viewport, the room screen's Afrikaans inside an `en` document, focus dropped to `<body>` on every submit, and the transmitting mic dot being colour-only and identical to the off state at night because `accent` and `inkSoft` are the same hex. All real, none introduced here, all worth a follow-up.

**One new finding, written and then withdrawn on 2026-08-04.** It claimed that straight after setup "waar is my man" is answered with the facility name and room number. It is not: the device stays silent at 0.225, and the probe behind the claim had skipped `decide`. `personas/FINDINGS.md` finding 13 records the withdrawal rather than deleting it, and the two scenarios written from it are kept, green, because they pin that the device says nothing in the ordinary first state of every person. What survives is the panel's original and smaller point: the chosen mode is inert until a family writes somebody down, and both screens now say so.

## Phase 2: a dry run, in a room, with nobody vulnerable in it

A tablet mounted in a team member's home or with a consenting healthy older adult. No ethics review, because no vulnerable person is involved.

This phase exists to spend the boring failures somewhere they cost nothing. It catches what no test can: the kiosk browser crashing overnight, the tablet being unplugged, glare from a window, the mounting height being wrong, whether the crossfade reads as movement in a real room, and whether the night dim is right when the room is actually dark rather than when `lux` is a query parameter.

It also produces the hardware cost number PROJECT.md section 5 demands ("Do not decide this by default. Flag it and get a real cost number"), because a device has to be bought to run it. A named device, a specification, a unit price.

## Phase 3: ethics and access

Long lead time, and independent of phases 1 and 2, so **start it on day one and run it in parallel**. It is the critical path even though it involves no code.

- **Ethics review.** PROJECT.md section 14: "Ethics review is not optional. The user cannot consent, the family consents on their behalf, and this device shapes what a vulnerable person believes about their own life. Get a clinician or ethicist involved early." Not started.
- **A facility.** Which also settles section 14's open question about the launch market, since the first facility is in a country.
- **A family, and their consent on the resident's behalf.**
- **The compliance conversation.** The answer a care home compliance officer needs is that no recording exists, and here that is already true and demonstrable rather than a policy claim: `src/domain/voice/privacy.test.ts` fails the build if any API that could capture, store or transmit audio appears. Carry the honest caveat with it, which is that the scan covers TypeScript only.

## Phase 4: the real room

Runs on the wizard rig, with the measurement approach chosen above.

What it is trying to answer, from section 14:

- Whether always-on screens get looked at after week one.
- Whether a device that answers unprompted is comforting or unsettling.
- Whether orientation or family presence is the primary need.

And from section 7, how often the device is wrong because the facility changed the day and nobody told the family.

## Steps

Phase 3 runs in parallel with 1 and 2, and it is the critical path in calendar time. Phase 1 is the critical path in work, and every item in it can start today.

**Engineering, none of it blocked on anybody:**

- [x] Make the room screen a PWA that survives a reload with no network: manifest, service worker caching the last good room payload, and an e2e test that loads `/room` offline. Closes the works-with-no-network row in `docs/traceability.md` and makes `anna-venter.md`'s answer to the buyer true
- [x] Settle `MIN_INK_DIM` and the ink the night lines use, and turn the four `test.fixme` cases green. Closed by making the location line primary ink, not by moving the constant
- [x] Run the migration against a real Postgres and write the contract suite for `src/data/drizzle/repository.ts`, all 29 methods. Nothing in that file had ever executed
- [x] Build the setup flow, so the answer policy is an explicit choice at setup rather than a setting discovered later
- [ ] Replace `MockFamilyAuth`, including who is allowed to change the answer policy, which is the part that is not a login page. **Blocked on a product decision and a vendor**, see above
- [ ] Build the photo upload path and put real object storage behind it. **Blocked on a vendor**, and larger than it looked, see above
- [x] Make a missing or unknown device token fail rather than resolve to `FIXTURE_DEVICE_TOKEN`, and gate the lighting override the same way
- [ ] Production deploy, and Android kiosk mode configuration. **Blocked on an account and a device**
- [x] Verify: `pnpm run check` passes
- [x] Verify: `pnpm run e2e` passes, including the four cases that were `fixme` and the new offline and setup cases
- [x] Verify: `pnpm run test:db` passes against a real Postgres

**Decisions and access, which run alongside the above rather than in front of it:**

- [ ] **Decide how "does it get looked at" is measured**, against section 12. Blocks phase 4 only, and shapes what phase 1 builds if the answer is option 2 or 3. **Human decision**
- [ ] Begin phase 3 on day one: find a clinician or ethicist, and a facility. **Human, long lead**
- [ ] Buy a device. Produce the section 5 cost number: named device, specification, unit price

**Then the rooms:**

- [ ] Phase 2 dry run, at least a full week including nights
- [ ] Fix what the dry run finds, then repeat until a week passes without an incident
- [ ] Ethics review passed, facility agreed, family consented
- [ ] Phase 4, the real room, on the wizard rig
- [ ] Write the answer down, and amend PROJECT.md section 14 with what is no longer open
- [ ] Closing step, below

## Current state

- **Done:** all of phase 1 that is not blocked on a purchase or an account, plus the panel round on top of it. Five items: the PWA and offline reload, the night contrast defect, Postgres exercised for real with a contract suite, the setup flow, and the device token. Then a five specialist `/panel`, whose three blockers and four overstated claims are all closed, and three accessibility findings it raised that predate this work.
- **Verified at the end of the session, watched rather than remembered:** `pnpm run check` is 512 passing with the 4 persona scenarios that are red on purpose and 25 skipped, `pnpm run e2e` is 59 passing with none skipped, `pnpm run test:db` is 50 passing against a real Postgres. Committed and pushed.
- **Next:** the three blocked items, in the order their blockers clear. A Vercel account and a device unblock the deploy and produce the section 5 cost number at once. The answer policy permission needs Bernard. The upload path needs a storage vendor.
- **Then:** phase 3 is the long pole in calendar time and nothing in it has started. Worth beginning before the three above clear, not after.
- **Open decisions:**
  - **How the milestone is measured**, against section 12's refusal to monitor. Described above. Nothing in phase 4 starts without it.
  - **Who may change the answer policy.** Not who may sign in, which is a vendor question, but which family member may change the setting that decides what a person believes about whether their husband is alive. Anna and Pieter disagree in their own persona files, so a single shared permission means whichever edits last wins, silently. Today `canAccess` is the only check and that is what happens.
  - **Which object storage**, which gates building the photo upload path at all.
  - **Whether CI should stay red.** `ci.yml` runs `pnpm run test` and four persona scenarios are red on purpose, so every push is red and has been since they became deliberate. A permanently red pipeline is a signal nobody reads, and every fix touches the persona suite, which `claude/rules/testing.md` protects.
  - **Finding 13 in `personas/FINDINGS.md`.** Straight after setup, "where is my husband" is answered with the facility name and room number, because a person nobody has written down is not a subject. Whether it should answer gently or stay silent is a product decision, and the fix lands in the matcher, which carries four deliberate reds and a rule against tuning.
  - **Whether phase 2 uses a team member's home or a consenting healthy older adult.** The second is much better evidence and takes longer to arrange.
  - **Launch market**, which the first facility decides in practice.
  - ~~`MIN_INK_DIM` and which ink the night lines use~~. Settled 2026-08-03. The location line became primary ink rather than the dim floor moving, because raising the floor brightens the screen at three in the morning and that constant exists to prevent exactly that.

## Closing step

Promote the durable part out of this folder before marking the task done in `worklog/INDEX.md`.

- [ ] A constraint on how the code may change becomes a rule in `claude/rules/`
- [ ] A product number becomes a constant in `src/config/constants.ts`, with its reason. The hardware cost number is not a constant, it belongs in PROJECT.md section 5's open question
- [ ] Anything a resident might say becomes a scenario in `personas/scenarios.ts`. A real room will produce utterances no one invented, and they are worth more than every scenario in there today
- [ ] A PROJECT.md principle with nothing behind it becomes a row in `docs/traceability.md`
- [ ] Incidents in `errors.md` reviewed, and anything recurring turned into one of the above
- [ ] Status set to done in `worklog/INDEX.md`, with a summary worth finding in three months
