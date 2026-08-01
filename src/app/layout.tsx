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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // A kiosk that can be pinch zoomed is a kiosk that will be found zoomed in.
  maximumScale: 1,
  userScalable: false,
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
