import { COMPANY_NAME } from "@/config/brand";
import { NIGHT_PALETTE } from "@/design/room-theme";

/**
 * The room device's web app manifest, scoped to /room.
 *
 * A route rather than a static file because the name comes from brand config,
 * which reads from the environment, since PROJECT.md section 13 says naming is
 * unresolved and nothing user facing may hardcode a product name.
 *
 * Scoped to /room deliberately. The family app is an ordinary web app on a
 * phone; the thing that gets installed and locked to a screen is the room
 * device (PROJECT.md section 9, "PWA in Android kiosk mode").
 */

export const dynamic = "force-dynamic";

export function GET(): Response {
  const manifest = {
    id: "/room",
    name: COMPANY_NAME,
    short_name: COMPANY_NAME,
    start_url: "/room",
    scope: "/room",
    // No browser chrome. There is nowhere to navigate to from this screen and
    // no lock screen, so a back button is a way to reach a broken state.
    display: "fullscreen",
    orientation: "landscape",
    // The night surface, not the day one. background_color is the splash an
    // installed app shows while it loads, and the reload this whole offline
    // path exists for happens unattended overnight: a kiosk restart, a power
    // blip, Android killing the tab. A white flash at three in the morning is
    // what NIGHT_LUX_THRESHOLD exists to prevent, and a dark one by day lasts
    // under a second.
    background_color: NIGHT_PALETTE.surface,
    theme_color: NIGHT_PALETTE.surface,
    icons: [
      { src: "/icons/room-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: "/icons/room-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  };

  return Response.json(manifest, {
    headers: { "content-type": "application/manifest+json" },
  });
}
