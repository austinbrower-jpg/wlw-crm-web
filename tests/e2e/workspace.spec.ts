import { test, expect, type Page } from "@playwright/test";
import { STORAGE_KEY } from "../../src/lib/persistence";
async function open(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Let’s move things forward." }),
  ).toBeVisible();
}
async function go(page: Page, screen: string) {
  await page
    .locator(".main-nav")
    .getByRole("link", { name: screen, exact: screen !== "Tasks" })
    .click();
}
async function search(page: Page, name: string) {
  await page.keyboard.press("Control+k");
  await page
    .getByRole("combobox", { name: "Search records and actions" })
    .fill(name);
  await page.getByRole("option").filter({ hasText: name }).first().click();
}
async function close(page: Page) {
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
}
async function state(page: Page) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    STORAGE_KEY,
  );
}
async function today(page: Page) {
  return page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
}

test("complete company → contact → deal → follow-up journey, notes and reload persistence", async ({
  page,
}) => {
  await open(page);
  await go(page, "Companies");
  await page.getByRole("button", { name: "New company", exact: true }).click();
  await page.getByLabel("Company name").fill("Cedar House Studio");
  await page.getByLabel("Location").fill("Austin, TX");
  await page
    .getByRole("button", { name: "Create company", exact: true })
    .click();
  await page.getByRole("button", { name: "Create linked contact" }).click();
  await page.getByLabel("Full name").fill("Alex Morgan");
  await page.getByLabel("Email").fill("alex.morgan@example.com");
  await page.getByLabel("Job title").fill("Founder");
  await page
    .getByRole("button", { name: "Create contact", exact: true })
    .click();
  await page.getByRole("button", { name: "Create linked deal" }).click();
  await page.getByLabel("Deal name").fill("Cedar client portal");
  await page.getByLabel("Value (USD)").fill("17000");
  await page.getByLabel("Follow-up task").fill("Send Cedar discovery recap");
  await page.getByLabel("Follow-up date").fill(await today(page));
  await page.getByRole("button", { name: "Create deal", exact: true }).click();
  await page
    .getByLabel("Activity note")
    .fill("Discussed a phased launch. <script>window.hacked=true</script>");
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  await expect(page.locator(".timeline")).toContainText(
    "Discussed a phased launch.",
  );
  expect(await page.evaluate(() => "hacked" in window)).toBe(false);
  await page.getByRole("button", { name: "Log a call", exact: true }).click();
  await page
    .getByLabel("Activity note")
    .fill("Confirmed budget and the primary stakeholder.");
  await page.getByRole("button", { name: "Log call", exact: true }).click();
  await page.getByLabel("Pipeline stage").selectOption("Qualified");
  await expect(page.locator(".timeline")).toContainText(
    "Moved from Lead to Qualified.",
  );
  await close(page);
  await go(page, "Today");
  await expect(
    page.getByRole("button", {
      name: "Send Cedar discovery recap",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await search(page, "Cedar client portal");
  await expect(page.getByLabel("Pipeline stage")).toHaveValue("Qualified");
  await expect(page.locator(".timeline")).toContainText("Confirmed budget");
  const s = await state(page);
  const co = s.companies.find(
      (c: { name: string }) => c.name === "Cedar House Studio",
    ),
    ct = s.contacts.find((c: { name: string }) => c.name === "Alex Morgan"),
    d = s.deals.find((d: { name: string }) => d.name === "Cedar client portal");
  expect(ct.companyId).toBe(co.id);
  expect(d.contactId).toBe(ct.id);
  expect(
    s.tasks.some(
      (t: { title: string }) => t.title === "Send Cedar discovery recap",
    ),
  ).toBe(true);
});
test("stage selector supports undo and handoff checklist stays unique", async ({
  page,
}) => {
  await open(page);
  await go(page, "Deals");
  const select = page.getByLabel("Stage for Brand & website refresh");
  await select.selectOption("Negotiation");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(select).toHaveValue("Proposal");
  await select.selectOption("Won");
  await expect(
    page.getByRole("dialog", { name: "That’s a win." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Create handoff", exact: true })
    .click();
  expect(
    (await state(page)).tasks.filter((t: { handoffKey?: string }) =>
      t.handoffKey?.startsWith("de-1:"),
    ),
  ).toHaveLength(3);
  await select.selectOption("Lead");
  await select.selectOption("Won");
  await page
    .getByRole("button", { name: "Create handoff", exact: true })
    .click();
  expect(
    (await state(page)).tasks.filter((t: { handoffKey?: string }) =>
      t.handoffKey?.startsWith("de-1:"),
    ),
  ).toHaveLength(3);
  await page.reload();
  await expect(
    page.getByLabel("Stage for Brand & website refresh"),
  ).toHaveValue("Won");
});
test("dragging a card changes stage and undo returns it", async ({ page }) => {
  await open(page);
  await go(page, "Deals");
  const card = page.locator(".deal-card").filter({
    has: page.getByRole("button", {
      name: "Brand & website refresh",
      exact: true,
    }),
  });
  const target = page
    .locator(".kanban-column")
    .filter({ has: page.getByRole("heading", { name: /Qualified/ }) });
  await card.dragTo(target);
  await expect(
    page.getByLabel("Stage for Brand & website refresh"),
  ).toHaveValue("Qualified");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByLabel("Stage for Brand & website refresh"),
  ).toHaveValue("Proposal");
});
test("archive confirms, preserves relationships and restores after reload", async ({
  page,
}) => {
  await open(page);
  await search(page, "Juniper Studio");
  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Archive this record?" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Archive record", exact: true })
    .click();
  await close(page);
  await go(page, "Companies");
  await expect(
    page
      .locator(".record-table")
      .getByRole("button", { name: /Juniper Studio/ }),
  ).toHaveCount(0);
  await page.reload();
  await page.getByLabel("Record status").selectOption("archived");
  await page.getByRole("button", { name: /Juniper Studio 2 contacts/ }).click();
  await expect(page.locator(".drawer")).toContainText("Olivia Chen");
  await expect(page.locator(".drawer")).toContainText(
    "Brand & website refresh",
  );
  await page
    .getByRole("button", { name: "Restore record", exact: true })
    .click();
  await close(page);
  await page.getByLabel("Record status").selectOption("active");
  await expect(
    page.getByRole("button", { name: /Juniper Studio 2 contacts/ }),
  ).toBeVisible();
});
test("task completion, calendar selection, creation and persistence", async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole("button", {
      name: "Complete Send the revised proposal",
      exact: true,
    })
    .click();
  await go(page, "Tasks");
  await page.getByLabel("Task status filter").selectOption("done");
  await expect(
    page.getByRole("button", {
      name: "Reopen Send the revised proposal",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Reopen Send the revised proposal",
      exact: true,
    })
    .click();
  await page.getByLabel("Task status filter").selectOption("open");
  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  await page.getByRole("button", { name: "Next month", exact: true }).click();
  const chosen = page.locator(".calendar-day").nth(14);
  await chosen.click();
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await page.getByLabel("Task title").fill("Calendar selected follow-up");
  const due = await page.getByLabel("Due date").inputValue();
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  await close(page);
  expect(
    (await state(page)).tasks.find(
      (t: { title: string }) => t.title === "Calendar selected follow-up",
    ).due,
  ).toBe(due);
  await page.reload();
  await page.getByPlaceholder("Search tasks…").fill("Calendar selected");
  await expect(
    page.getByRole("button", {
      name: "Calendar selected follow-up",
      exact: true,
    }),
  ).toBeVisible();
});
test("CSV mapping and explicit commit import company then contact, duplicate update and filtered export", async ({
  page,
}) => {
  await open(page);
  await go(page, "Companies");
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await page.getByLabel("Choose CSV file").setInputFiles({
    name: "companies.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Business,Place\nMaple Demo,Chicago"),
  });
  await page.getByLabel("Map name").selectOption("Business");
  await page.getByLabel("Map city").selectOption("Place");
  await page
    .getByRole("button", { name: "Preview import", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Import 1 records" }),
  ).toBeDisabled();
  expect((await state(page)).companies).toHaveLength(12);
  await page
    .getByLabel("I confirm this file contains fictional demo data.")
    .check();
  await page.getByRole("button", { name: "Import 1 records" }).click();
  await page.getByPlaceholder("Search companies…").fill("Maple Demo");
  await expect(
    page.getByRole("button", { name: /Maple Demo 0 contacts/ }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("relay-companies.csv");
  await go(page, "Contacts");
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await page.getByLabel("Choose CSV file").setInputFiles({
    name: "contacts.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "name,email,company\nTaylor Demo,taylor@example.com,Maple Demo",
    ),
  });
  await page
    .getByRole("button", { name: "Preview import", exact: true })
    .click();
  await page
    .getByLabel("I confirm this file contains fictional demo data.")
    .check();
  await page.getByRole("button", { name: "Import 1 records" }).click();
  await page.getByPlaceholder("Search contacts…").fill("Taylor Demo");
  await expect(
    page.getByRole("button", { name: "Taylor Demo", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await page.getByLabel("Choose CSV file").setInputFiles({
    name: "update.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "name,email,company,role\nTaylor Demo,taylor@example.com,Maple Demo,Director",
    ),
  });
  await page
    .getByRole("button", { name: "Preview import", exact: true })
    .click();
  await page.getByLabel("Duplicate handling").selectOption("update");
  await page
    .getByLabel("I confirm this file contains fictional demo data.")
    .check();
  await page.getByRole("button", { name: "Import 1 records" }).click();
  expect((await state(page)).contacts).toHaveLength(25);
  await expect(
    page.getByRole("button", { name: "Edit job title for Taylor Demo" }),
  ).toContainText("Director");
});
test("CSV failures leave the workspace unchanged and imported markup renders as text", async ({
  page,
}) => {
  await open(page);
  await go(page, "Contacts");
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await page.getByLabel("Choose CSV file").setInputFiles({
    name: "bad.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "name,email,company\nAlex,alex@real.com,Juniper Studio\nBea,bea@example.com,Missing",
    ),
  });
  await page
    .getByRole("button", { name: "Preview import", exact: true })
    .click();
  await expect(page.locator(".import-validation")).toContainText(
    "2 rows need attention",
  );
  await page
    .getByLabel("I confirm this file contains fictional demo data.")
    .check();
  await expect(
    page.getByRole("button", { name: "Import 2 records" }),
  ).toBeDisabled();
  expect((await state(page)).contacts).toHaveLength(24);
  await page.getByRole("button", { name: "Back to mapping" }).click();
  await page.getByLabel("Choose CSV file").setInputFiles({
    name: "broken.csv",
    mimeType: "text/csv",
    buffer: Buffer.from('name,email\n"unterminated'),
  });
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "not closed",
  );
  await close(page);
  await go(page, "Companies");
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await page.getByLabel("Choose CSV file").setInputFiles({
    name: "safe.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("name\n<img src=x onerror=window.hacked=true>"),
  });
  await page
    .getByRole("button", { name: "Preview import", exact: true })
    .click();
  await page
    .getByLabel("I confirm this file contains fictional demo data.")
    .check();
  await page.getByRole("button", { name: "Import 1 records" }).click();
  await page.getByPlaceholder("Search companies…").fill("<img");
  await expect(page.locator(".record-table")).toContainText(
    "<img src=x onerror=window.hacked=true>",
  );
  expect(await page.evaluate(() => "hacked" in window)).toBe(false);
});
test("keyboard command palette works and dialogs contain and return focus", async ({
  page,
}) => {
  await open(page);
  await page.locator(".global-search").focus();
  await page.keyboard.press("Enter");
  const input = page.getByRole("combobox", {
    name: "Search records and actions",
  });
  await expect(input).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "New task" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.keyboard.press("Control+k");
  await input.fill("Juniper Studio");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Record overview" }),
  ).toBeVisible();
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(
        () => document.activeElement?.closest("dialog") !== null,
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("reset requires confirmation, restores original seed and stays reset on reload", async ({
  page,
}) => {
  await open(page);
  await go(page, "Companies");
  await page.getByRole("button", { name: "New company", exact: true }).click();
  await page.getByLabel("Company name").fill("Temporary Demo");
  await page
    .getByRole("button", { name: "Create company", exact: true })
    .click();
  await close(page);
  await page
    .getByRole("button", { name: "Workspace settings", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await page.getByRole("button", { name: "Keep my changes" }).click();
  expect((await state(page)).companies).toHaveLength(13);
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await page
    .getByRole("button", { name: "Reset workspace", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Let’s move things forward." }),
  ).toBeVisible();
  await page.reload();
  expect((await state(page)).companies).toHaveLength(12);
});
test("malformed and unavailable storage recover with visible guidance", async ({
  page,
}) => {
  await page.addInitScript(
    (key) => localStorage.setItem(key, "{broken"),
    STORAGE_KEY,
  );
  await open(page);
  await expect(page.locator(".storage-warning")).toContainText(
    "could not be read",
  );
  await page
    .getByRole("button", { name: "Complete Send the revised proposal" })
    .click();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
  ).toBe("{broken");
});
test("unavailable storage allows temporary work", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("blocked");
      },
    });
  });
  await open(page);
  await expect(page.locator(".storage-warning")).toContainText("unavailable");
  await page
    .getByRole("button", { name: "Complete Send the revised proposal" })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Task completed" }),
  ).toBeVisible();
});
for (const width of [1440, 1024, 768, 390]) {
  test(`responsive screens at ${width}px have no page-wide overflow`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await open(page);
    await page.screenshot({
      path: `screenshots/today-${width}.png`,
      fullPage: true,
    });
    for (const screen of [
      "deals",
      "companies",
      "contacts",
      "tasks",
      "settings",
    ]) {
      await page.goto(`/#${screen}`);
      await expect(page.locator(`.screen-${screen}`)).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await page.screenshot({
        path: `screenshots/${screen}-${width}.png`,
        fullPage: true,
      });
    }
    await page.goto("/#tasks");
    await page.getByRole("button", { name: "Calendar", exact: true }).click();
    await page.screenshot({
      path: `screenshots/calendar-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    expect(errors).toEqual([]);
    if (width === 390) {
      await page.getByRole("button", { name: "Open navigation" }).click();
      await page
        .getByRole("dialog")
        .getByRole("link", { name: "Contacts" })
        .click();
      await expect(page.locator(".screen-contacts")).toBeVisible();
      await page
        .getByRole("button", { name: "New contact", exact: true })
        .click();
      await page.screenshot({
        path: "screenshots/contact-form-390.png",
        fullPage: true,
      });
      await page.getByLabel("Full name").fill("Mobile Demo");
      await page.getByLabel("Email").fill("mobile@example.com");
      await page
        .getByRole("button", { name: "Create contact", exact: true })
        .click();
      await expect(page.locator(".drawer")).toContainText("Mobile Demo");
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
  });
}

test("drawer and form stage changes offer usable undo, with refreshed actual close dates", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page);
  await search(page, "Brand & website refresh");
  await page.getByLabel("Pipeline stage").selectOption("Qualified");
  await page.getByRole("button", { name: "Undo stage change" }).click();
  await expect(page.getByLabel("Pipeline stage")).toHaveValue("Proposal");
  await page.getByRole("button", { name: "Edit details" }).click();
  await page.getByLabel("Stage", { exact: true }).selectOption("Negotiation");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByLabel("Pipeline stage")).toHaveValue("Negotiation");
  await page.getByRole("button", { name: "Undo stage change" }).click();
  await expect(page.getByLabel("Pipeline stage")).toHaveValue("Proposal");
  await page.screenshot({
    path: "screenshots/record-drawer-1440.png",
    fullPage: false,
  });
  await close(page);
  await search(page, "Customer success portal");
  await page.getByRole("button", { name: "Edit details" }).click();
  await page.getByLabel("Stage", { exact: true }).selectOption("Lost");
  await page.getByRole("button", { name: "Save changes" }).click();
  const s = await state(page);
  expect(s.deals.find((d: { id: string }) => d.id === "de-12").closedAt).toBe(
    await today(page),
  );
});

test("mobile navigation returns to the top and native date fields create a usable task", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await page
    .locator(".mobile-bottom-nav")
    .getByRole("link", { name: "Companies" })
    .click();
  await page.evaluate(() => window.scrollTo(0, 1000));
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await page
    .locator(".mobile-bottom-nav")
    .getByRole("link", { name: "Today" })
    .click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page
    .locator(".mobile-bottom-nav")
    .getByRole("link", { name: "Tasks" })
    .click();
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await page.getByLabel("Task title").fill("Mobile date follow-up");
  await page.getByLabel("Due date").fill("2030-05-14");
  await page.getByRole("dialog").getByLabel("Priority").selectOption("High");
  await page.screenshot({ path: "screenshots/task-form-390.png" });
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  await expect(page.locator(".drawer")).toContainText("May 14, 2030");
  expect(
    (await state(page)).tasks.find(
      (t: { title: string }) => t.title === "Mobile date follow-up",
    ).due,
  ).toBe("2030-05-14");
  await close(page);
  await page.getByPlaceholder("Search tasks…").fill("Mobile date");
  await expect(
    page.getByRole("button", { name: "Mobile date follow-up", exact: true }),
  ).toBeVisible();
});

test("Back and Forward follow the URL and dismiss unfinished dialogs", async ({
  page,
}) => {
  await open(page);
  await go(page, "Deals");
  await page.getByRole("button", { name: "New deal", exact: true }).click();
  await page.getByLabel("Deal name").fill("Unsaved opportunity");
  await page.goBack();
  await expect(page.locator(".screen-today")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect((await state(page)).deals).toHaveLength(18);
  await page.goForward();
  await expect(page.locator(".screen-deals")).toBeVisible();
  await page.reload();
  await expect(page.locator(".screen-deals")).toBeVisible();
});

test("duplicate names are normalized and cancelled forms and notes do not leak", async ({
  page,
}) => {
  await open(page);
  await go(page, "Companies");
  await page.getByRole("button", { name: "New company", exact: true }).click();
  await page.getByLabel("Company name").fill(" JUNIPER STUDIO ");
  await page
    .getByRole("button", { name: "Create company", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "already exists",
  );
  expect((await state(page)).companies).toHaveLength(12);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "New company", exact: true }).click();
  await expect(page.getByLabel("Company name")).toHaveValue("");
  await close(page);
  await search(page, "Brand & website refresh");
  await page.getByLabel("Activity note").fill("Unsubmitted note for this deal");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Juniper Studio", exact: true })
    .click();
  await expect(page.getByLabel("Activity note")).toHaveValue("");
  await close(page);
  expect(
    (await state(page)).activities.some((a: { text: string }) =>
      a.text.includes("Unsubmitted"),
    ),
  ).toBe(false);
  await page
    .getByPlaceholder("Search companies…")
    .fill("nothing-matches-this-query");
  await expect(page.locator(".empty-state")).toBeVisible();
});

test("import back requires a fresh confirmation and formula export remains text", async ({
  page,
}) => {
  await open(page);
  await go(page, "Companies");
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await page.getByLabel("Choose CSV file").setInputFiles({
    name: "formula.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("name\n=1+1"),
  });
  await page
    .getByRole("button", { name: "Preview import", exact: true })
    .click();
  await page
    .getByLabel("I confirm this file contains fictional demo data.")
    .check();
  await page.getByRole("button", { name: "Back to mapping" }).click();
  await page
    .getByRole("button", { name: "Preview import", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Import 1 records" }),
  ).toBeDisabled();
  await page
    .getByLabel("I confirm this file contains fictional demo data.")
    .check();
  await page.getByRole("button", { name: "Import 1 records" }).click();
  await page.getByPlaceholder("Search companies…").fill("=1+1");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const { readFile } = await import("node:fs/promises");
  const file = await download;
  const csv = await readFile((await file.path())!, "utf8");
  expect(csv).toContain('"\'=1+1"');
  expect(csv).not.toContain("Juniper Studio");
  await page.reload();
  expect(
    (await state(page)).companies.some(
      (c: { name: string }) => c.name === "=1+1",
    ),
  ).toBe(true);
});
