/*
 * The room device's service worker.
 *
 * Why this exists. PROJECT.md section 9 puts the room device on "a PWA in
 * Android kiosk mode", personas/anna-venter.md answers the buyer's "what
 * happens if the wifi goes down?" with "the screen keeps working", and until
 * this file existed both were true only for as long as the page stayed loaded.
 * A care home with bad wifi is most care homes, and a tablet that is on for
 * months will reload: the kiosk browser restarts, the power blips, Android
 * kills the tab. Without a cache that reload is a blank screen in the morning.
 *
 * What makes the stale copy safe to serve, which is the part worth
 * understanding before changing any of this:
 *
 * - The day is not baked into the cached HTML. room-screen.tsx starts on the
 *   server's clock so the first paint matches the server render, then follows
 *   the device clock from the first tick, which is ROOM_TICK_MS later. So a
 *   page cached three days ago shows the correct day within fifteen seconds.
 * - Schedule entries are cached for a day either side of when the page was
 *   fetched. Offline for longer than that, the horizon empties and the screen
 *   renders "a quiet day" rather than a wrong next thing. Never a lack, and
 *   never a stale appointment.
 * - Location, language and the photographs are person facts, not day facts.
 *   They do not go stale in any way that matters.
 *
 * So the failure mode of this cache is a device that gradually knows less,
 * which is the right direction. It is never a device that is confidently wrong
 * about what day it is, and that is the only thing that would be worse than a
 * blank screen.
 *
 * The rules below exist because a review found each of them broken. Read them
 * before loosening anything here.
 */

/* Bump when the strategy changes. Activation drops every other cache. */
const VERSION = "v2";
const ROOM_CACHE = `nora-room-${VERSION}`;
const ASSET_CACHE = `nora-assets-${VERSION}`;
const CURRENT = [ROOM_CACHE, ASSET_CACHE];

/* Only these are ever cached. Everything else falls through untouched, which
 * matters most for the family app: a daughter editing the schedule from her
 * phone must never be served yesterday's form. */
const ROOM_PATH = "/room";
const IMMUTABLE_PREFIX = "/_next/static/";

/**
 * Cap on cached build assets. Names are content hashed, so old ones are never
 * wrong, only dead weight, and a tablet that is on for months across many
 * deploys would otherwise grow until the origin's quota evicts something. The
 * thing eviction takes might be the room screen, so this is bounded here
 * rather than left to the browser.
 */
const MAX_ASSETS = 120;

/**
 * Query parameters that change what the screen *is* rather than which room it
 * shows. A cached render carrying one of these must never be served for a
 * request without it: `wizard` puts a text box and a Say button on the screen,
 * and `lux` forces a palette, either of which arriving unbidden after a reboot
 * is a broken state on a screen whose rule is that none is reachable.
 */
const MODAL_PARAMS = ["wizard", "lux"];

self.addEventListener("install", () => {
  // No precache list. The build hashes its own asset names, so the honest way
  // to warm this cache is the first successful load of the real page.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !CURRENT.includes(key)).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith(IMMUTABLE_PREFIX)) {
    event.respondWith(cacheFirst(event, request));
    return;
  }

  // Photographs. PROJECT.md section 4 puts a face on this screen and it is one
  // of the four things on it, so an offline reload that renders the words and
  // a broken image has not kept working. Cross origin object storage cannot be
  // cached without CORS, and when storage arrives this needs revisiting.
  if (request.destination === "image") {
    event.respondWith(cacheFirst(event, request));
    return;
  }

  // The room screen itself, and only when it is the document being navigated
  // to. Next prefetches `/room` as an RSC payload from the index page, and
  // handing one of those back for a navigation renders nothing.
  if (url.pathname === ROOM_PATH && request.destination === "document") {
    event.respondWith(networkFirst(event, request));
  }
});

/**
 * Build assets carry a content hash in the name, so a hit is always the right
 * file and a miss is always a new build. Cheapest correct strategy.
 */
async function cacheFirst(event, request) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;

  const response = await fetch(request);
  if (response.ok) {
    event.waitUntil(cache.put(request, response.clone()).then(() => trim(cache)));
  }
  return response;
}

/**
 * The room screen. Network first, because the family changing today's schedule
 * from a phone has to reach the device, and a cache first strategy would show
 * them a screen that ignores them for as long as it stayed warm.
 */
async function networkFirst(event, request) {
  const cache = await caches.open(ROOM_CACHE);
  try {
    const response = await fetch(request);
    if (await worthKeeping(response)) {
      event.waitUntil(cache.put(request, response.clone()));
      return response;
    }
    // A server error, or the quiet fallback screen. Both are the outage this
    // cache exists for, so prefer the last good render and only hand back the
    // bad response when there is nothing better.
    return (await bestCached(cache, request)) ?? response;
  } catch {
    const cached = await bestCached(cache, request);
    if (cached) return cached;
    throw new Error("offline and no cached room screen");
  }
}

/**
 * Whether a response is a real render worth keeping.
 *
 * Status is not enough. `RoomFallback` is the quiet screen shown for an unknown
 * device or missing data and it renders with a perfectly ordinary 200, so
 * caching on `ok` alone lets one transient failure replace the last good render
 * and outlive the outage that caused it, permanently and silently. The real
 * screen carries `data-room`; the fallback does not.
 */
async function worthKeeping(response) {
  if (!response.ok) return false;
  try {
    const body = await response.clone().text();
    return body.includes("data-room");
  } catch {
    return false;
  }
}

/**
 * The best cached render for this request, or nothing.
 *
 * The exact match is tried first. The fallback that follows is deliberately
 * narrow: it accepts only a render for the **same device token**, because the
 * token is the whole identity of the device, and a loop that matched on path
 * alone would hand one resident's room number, schedule and family
 * photographs to another resident's tablet after a token was re-issued or a
 * device moved rooms. That is worse than the blank screen this file prevents.
 */
async function bestCached(cache, request) {
  const exact = await cache.match(request);
  if (exact) return exact;

  const wanted = new URL(request.url);
  const token = wanted.searchParams.get("token");
  if (!token) return null;

  for (const key of await cache.keys()) {
    const candidate = new URL(key.url);
    if (candidate.pathname !== ROOM_PATH) continue;
    if (candidate.searchParams.get("token") !== token) continue;
    // Never resurrect a wizard or forced-lighting render for an ordinary load.
    if (MODAL_PARAMS.some((param) => candidate.searchParams.has(param) && !wanted.searchParams.has(param))) {
      continue;
    }
    const hit = await cache.match(key);
    if (hit) return hit;
  }
  return null;
}

/** Keep the asset cache bounded, oldest first. */
async function trim(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_ASSETS) return;
  await Promise.all(keys.slice(0, keys.length - MAX_ASSETS).map((key) => cache.delete(key)));
}
