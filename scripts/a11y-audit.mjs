import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const report = [];
for (const screen of [
  "today",
  "companies",
  "contacts",
  "deals",
  "tasks",
  "settings",
]) {
  await page.goto(`http://127.0.0.1:3000/#${screen}`);
  await page.locator(`.screen-${screen}`).waitFor();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  report.push({
    screen,
    violations: results.violations.map((v) => ({
      id: v.id,
      count: v.nodes.length,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  });
}
await page.goto("http://127.0.0.1:3000/#today");
await page
  .getByRole("heading", { name: "Let’s move things forward." })
  .waitFor();
await page.keyboard.press("Control+k");
await page
  .getByRole("combobox", { name: "Search records and actions" })
  .fill("Juniper");
await page.getByRole("dialog").getByRole("option").first().click();
const drawer = await new AxeBuilder({ page })
  .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
  .analyze();
report.push({
  screen: "drawer",
  violations: drawer.violations.map((v) => ({
    id: v.id,
    count: v.nodes.length,
    nodes: v.nodes.map((n) => ({
      target: n.target,
      summary: n.failureSummary,
    })),
  })),
});
console.log(JSON.stringify(report, null, 2));
await browser.close();
