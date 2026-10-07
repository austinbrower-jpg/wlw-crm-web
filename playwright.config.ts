import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.RELAY_TEST_URL ?? "http://127.0.0.1:3307",
    timezoneId: "America/Chicago",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && PORT=3307 npm run preview",
    url: process.env.RELAY_TEST_URL ?? "http://127.0.0.1:3307",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
