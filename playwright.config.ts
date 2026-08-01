import { defineConfig, devices } from "@playwright/test";

/**
 * Browser tests. PROJECT.md section 9 wants these so the agent can verify and
 * screenshot its own work, and so that "readable from a bed at three metres"
 * can be checked against a rendered page rather than argued about.
 *
 * The room screen viewport is a 10 inch Android tablet in landscape, which is
 * the shape the device will actually be.
 */

const ROOM_TABLET = { width: 1280, height: 800 };

export default defineConfig({
  testDir: "./e2e",
  // The prototype has no database, so every request in the server process
  // shares one in memory repository. Tests reset it between runs and take it
  // one at a time rather than racing each other through shared state.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "room",
      testMatch: /room(\..*)?\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: ROOM_TABLET },
    },
    {
      name: "family",
      testMatch: /family(\..*)?\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
    {
      // Artifacts rather than assertions. Not part of the default run.
      name: "screenshots",
      testMatch: /screenshots\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: ROOM_TABLET },
    },
  ],
  webServer: {
    command: "pnpm run build && pnpm run start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
