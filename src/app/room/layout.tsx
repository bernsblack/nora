import type { Metadata } from "next";

/**
 * Scopes the web app manifest to the room device.
 *
 * The family app is an ordinary web app on a phone. The thing that gets
 * installed, locked to a screen and left alone for months is this one
 * (PROJECT.md section 9), so the manifest is linked here rather than from the
 * root layout.
 */

export const metadata: Metadata = {
  manifest: "/room/manifest.webmanifest",
};

export default function RoomLayout({ children }: { children: React.ReactNode }) {
  return children;
}
