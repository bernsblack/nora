---
paths:
  - 'src/app/room/**'
  - 'src/design/**'
  - 'src/lib/contrast.ts'
  - 'e2e/room*.spec.ts'
---

# The room screen

PROJECT.md sections 3 and 4. The person reading this screen configures nothing, may not remember between glances that it exists, and is reading from a bed at three metres. Every constraint below comes from that, not from taste.

## What may be on it

Day and part of day in words, where they are by name, one next thing, one photo with a name under it. That is the list.

- **One answer per screen.** To add a second element, something comes off. This is a requirement in the brief, not an aspiration.
- **No clock face.** "Tuesday morning", never a time readout, and never "Tue". `spokenClock` exists for answers like "lunch at 12" and is not a clock.
- **No scorekeeping.** No checklist, no unticked box, no streak, no count of anything. A screen showing four incomplete tasks tells someone every hour that they are failing.
- **Never a lack.** An empty horizon renders `quietDay`, not "nothing scheduled".
- **No navigation, no lock screen, no reachable broken state.** There is nowhere to go from here.

## The numbers are in `src/config/constants.ts`

Never inline one. `ROOM_MIN_TEXT_PX`, `ROOM_MIN_FONT_WEIGHT`, `ROOM_MIN_LETTER_SPACING_EM`, `ROOM_TARGET_CONTRAST`, `MIN_INK_DIM`, `ROOM_CROSSFADE_MS`, `PHOTO_ROTATION_MINUTES` all carry the reason they hold that value. Changing one is a product change and the comment beside it has to change too.

## Colour and contrast

- **AAA is the target, AA is the absolute floor**, verified with real numbers rather than by eye. `src/design/room-theme.test.ts` computes every pairing, dimmed and undimmed.
- **Not blue dominant.** The ageing lens yellows, which desaturates blues and destroys blue-green discrimination first. Warm hues stay distinguishable longest. There is a test that fails if the palette drifts blue.
- **Dim the ink, never the surface.** Applying `brightness()` to both ends of a pair collapses the contrast ratio toward 1. The night palette goes from 14.69:1 to 2.47:1 that way, which is how this was found. `MIN_INK_DIM` is the exact point where the night palette's primary ink leaves AAA.
- The photograph dims with the ink. It carries no text and is the brightest thing in a dark room.

## The theme is TypeScript, and the selector is an attribute

`roomThemeCss` emits custom properties under `ROOM_THEME_SELECTOR`, which is `[data-room]` and not a class.

This is not stylistic. CSS Modules hashes class names at build time, so a rule written against `.room` silently matches nothing: font sizes fall back to 16px and contrast to 1:1 while every unit test still passes. A test asserts the emitted CSS starts with the attribute selector. Do not change it back.

## Motion

Slow crossfades only. Nothing that could read as movement in the room, because a moving thing in the room of someone with visual hallucinations is not a design detail. `ROOM_CROSSFADE_MS` is the only duration.

## The simplicity dial

Nothing outside `src/domain/simplicity.ts` may branch on the raw `SimplicityLevel`. Ask `capabilitiesFor(level)` for a named capability. The dial is a first-class concept from the start rather than a pile of feature flags, and the moment a component reads the level directly it becomes the second kind of thing.

## Test ids are a contract

`day`, `location`, `next-thing`, `photo`, `photo-caption`, `spoken`, `addressed`, `mic-state`, plus `data-room`, `data-lighting`, `data-rule`, `data-transmitting`. The browser tests and the family app's live preview both read them. Rename one and say so.

## Offline is a property, not a hope

The page serialises the whole day and hands it to the client once. Every tick derives locally. Introducing a fetch, a router refresh, or a server action into the render path breaks mode one in a care home with bad wifi, which is most care homes.
