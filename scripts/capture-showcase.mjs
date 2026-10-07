import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
await mkdir("screenshots", { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  timezoneId: "America/Chicago",
});
const page = await context.newPage();
await page.goto(process.env.RELAY_TEST_URL ?? "http://127.0.0.1:3307");
await page
  .getByRole("heading", { name: "Let’s move things forward." })
  .waitFor();
await page.screenshot({ path: "screenshots/showcase-today.png" });
await page.keyboard.press("Control+k");
await page
  .getByRole("combobox", { name: "Search records and actions" })
  .fill("Brand & website refresh");
await page
  .getByRole("dialog")
  .getByRole("option")
  .filter({ hasText: "Brand & website refresh" })
  .first()
  .click();
await page.getByRole("dialog", { name: "Record overview" }).waitFor();
await page.screenshot({ path: "screenshots/record-drawer-1440.png" });
await page.getByRole("button", { name: "Close dialog", exact: true }).click();
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: "screenshots/showcase-mobile.png" });
await browser.close();
console.log("Saved desktop, drawer, and mobile project images.");
