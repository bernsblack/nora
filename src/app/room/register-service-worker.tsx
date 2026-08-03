"use client";

import { useEffect } from "react";

/**
 * Registers the room device's service worker, so a reload with no network
 * still renders (PROJECT.md section 9, and personas/anna-venter.md's answer to
 * "what happens if the wifi goes down?").
 *
 * Deliberately outside the render path. claude/rules/room-screen.md says
 * offline is a property rather than a hope, and that introducing a fetch, a
 * router refresh or a server action into the render path breaks mode one in a
 * care home with bad wifi. This registers after paint, renders nothing, and
 * the screen is fully correct whether or not it succeeds.
 *
 * It fails silently on purpose. There is nobody in the room who could act on
 * a registration error, and this screen has no error state, only a quieter one.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    /*
     * Production only. The asset cache is cache-first on the strength of
     * `/_next/static/` names carrying a content hash, which is true of a build
     * and false of `next dev`, where chunk paths are stable across edits. A
     * developer would get a stale chunk back after every change and it would
     * look like the code had not compiled.
     */
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Nothing to do and nobody to tell. The page works without it, it just
      // stops working across a reload with no network.
    });
  }, []);

  return null;
}
