import Link from "next/link";
import { FAMILY_APP_NAME } from "@/config/brand";
import { usingDatabase } from "@/data";
import { FIXTURE_DEVICE_TOKEN } from "@/data/fixtures";

/**
 * A door for developers and for anyone being shown the prototype. Neither real
 * surface is reached this way: the room device is pointed at /room once and the
 * family arrives at /app from their own link.
 */
export default function IndexPage() {
  return (
    <main
      style={{
        padding: "48px",
        maxWidth: "60ch",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        lineHeight: 1.5,
      }}
    >
      <h1 style={{ fontSize: "28px" }}>{FAMILY_APP_NAME}</h1>
      <p>Prototype. Two surfaces, one system.</p>
      <ul style={{ display: "flex", flexDirection: "column", gap: "8px", paddingLeft: "20px" }}>
        <li>
          <Link href={`/room?token=${FIXTURE_DEVICE_TOKEN}`}>Room screen</Link>, what sits in the
          room
        </li>
        <li>
          <Link href={`/room?token=${FIXTURE_DEVICE_TOKEN}&wizard=1`}>
            Room screen with the Wizard of Oz control
          </Link>
          , for testing the interaction with a human listening
        </li>
        <li>
          <Link href="/app">Family app</Link>, where a daughter or partner keeps it current
        </li>
      </ul>
      <p style={{ opacity: 0.7 }}>
        Data source: {usingDatabase() ? "Postgres" : "in memory fixtures, lost on restart"}.
      </p>
    </main>
  );
}
