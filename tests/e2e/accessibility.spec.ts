import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
for (const width of [390, 1440]) {
  test(`automated accessibility scan of every screen and record drawer at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const screen of [
      "today",
      "companies",
      "contacts",
      "deals",
      "tasks",
      "settings",
    ]) {
      await page.goto(`/#${screen}`);
      await expect(page.locator(`.screen-${screen}`)).toBeVisible();
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        result.violations,
        `Accessibility violations on ${screen}`,
      ).toEqual([]);
    }
    await page.goto("/#today");
    await expect(
      page.getByRole("heading", { name: "Let’s move things forward." }),
    ).toBeVisible();
    await page.keyboard.press("Control+k");
    await page
      .getByRole("combobox", { name: "Search records and actions" })
      .fill("Juniper Studio");
    await page
      .getByRole("dialog")
      .getByRole("option")
      .filter({ hasText: "Juniper Studio" })
      .first()
      .click();
    await expect(
      page.getByRole("dialog", { name: "Record overview" }),
    ).toBeVisible();
    const drawer = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(drawer.violations).toEqual([]);
  });
}
