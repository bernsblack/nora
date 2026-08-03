import type { Metadata, Viewport } from "next";
import { COMPANY_NAME } from "@/config/brand";
import "./globals.css";

/**
 * No web font is loaded. The room device has to render correctly with no
 * network, and next/font would fetch a face at build time and serve it as an
 * asset the device then has to have cached. System stacks only, see
 * design/room-theme.ts.
 */

export const metadata: Metadata = {
  title: COMPANY_NAME,
  description: "",
};

/*
 * Zoom stays available here. Disabling it is right for the kiosk and wrong for
 * the family app, whose reader is a presbyopic daughter on a phone deciding
 * what her mother will be told about her husband. That is WCAG 1.4.4, and the
 * kiosk-only version now lives in app/room/layout.tsx where it belongs.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
