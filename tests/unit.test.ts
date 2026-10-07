import { describe, it, expect } from "vitest";
import { createSeed } from "../src/lib/seed";
import {
  metrics,
  workspaceSchema,
  companySchema,
  dealSchema,
  taskSchema,
  addDays,
  localDay,
} from "../src/lib/domain";
import {
  moveDeal,
  undoMove,
  archiveRecord,
  createHandoff,
  completeTask,
  saveRecord,
} from "../src/lib/repository";
import {
  parseCSV,
  previewImport,
  commitImport,
  exportCSV,
  csvCell,
} from "../src/lib/csv";
import { browserAdapter, STORAGE_KEY } from "../src/lib/persistence";
const now = new Date("2026-10-06T12:00:00");
const seed = () => createSeed(now);
const base = { id: "new", createdAt: now.toISOString(), archived: false };
describe("seed and domain validation", () => {
  it("seeds exactly 12 companies, 24 contacts and 18 deals with valid relationships", () => {
    const s = seed();
    expect([s.companies.length, s.contacts.length, s.deals.length]).toEqual([
      12, 24, 18,
    ]);
    expect(workspaceSchema.safeParse(s).success).toBe(true);
    expect(s.contacts.every((c) => c.email.endsWith("@example.com"))).toBe(
      true,
    );
  });
  it("rejects empty names, unsafe URLs and negative deal values", () => {
    expect(
      companySchema.safeParse({ ...seed().companies[0], name: "  " }).success,
    ).toBe(false);
    expect(
      companySchema.safeParse({
        ...seed().companies[0],
        website: "javascript:alert(1)",
      }).success,
    ).toBe(false);
    expect(
      dealSchema.safeParse({ ...seed().deals[0], amount: -1 }).success,
    ).toBe(false);
  });
  it("rejects impossible calendar dates and missing fields", () => {
    expect(
      taskSchema.safeParse({ ...seed().tasks[0], due: "2026-02-31" }).success,
    ).toBe(false);
    expect(taskSchema.safeParse({ ...base, title: "Work" }).success).toBe(
      false,
    );
  });
  it("rejects broken contact, deal, task and activity relationships", () => {
    for (const key of ["contacts", "deals", "tasks", "activities"] as const) {
      const s = seed();
      if (key === "contacts") s.contacts[0].companyId = "missing";
      if (key === "deals") s.deals[0].contactId = "ct-3";
      if (key === "tasks") s.tasks[0].record = { kind: "deal", id: "missing" };
      if (key === "activities") s.activities[0].record.id = "missing";
      expect(workspaceSchema.safeParse(s).success).toBe(false);
    }
  });
  it("rejects duplicate IDs and inconsistent actual close dates", () => {
    const s = seed();
    s.companies[1].id = s.companies[0].id;
    expect(workspaceSchema.safeParse(s).success).toBe(false);
    const s2 = seed();
    s2.deals[0].closedAt = "2026-10-06";
    expect(workspaceSchema.safeParse(s2).success).toBe(false);
  });
  it("handles month and year boundaries using calendar dates", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(localDay(now)).toBe("2026-10-06");
  });
});
describe("live metrics", () => {
  it("excludes won, lost and archived deals from open pipeline and forecast", () => {
    const s = seed();
    s.deals = [
      { ...s.deals[0], amount: 1000, stage: "Lead" },
      { ...s.deals[1], amount: 2000, stage: "Proposal" },
      { ...s.deals[10], amount: 9000 },
      { ...s.deals[13], amount: 5000 },
      { ...s.deals[2], amount: 8000, archived: true },
    ];
    const m = metrics(s, "month", "2026-10-06");
    expect(m.pipeline).toBe(3000);
    expect(m.forecast).toBe(1300);
    expect(m.openCount).toBe(2);
  });
  it("calculates won period using actual close date rather than expected close", () => {
    const s = seed();
    s.deals = [
      {
        ...s.deals[10],
        amount: 1000,
        closedAt: "2026-10-01",
        expectedClose: "2026-09-01",
      },
      {
        ...s.deals[11],
        amount: 2000,
        closedAt: "2026-09-30",
        expectedClose: "2026-10-20",
      },
      { ...s.deals[12], amount: 4000, closedAt: "2026-10-02", archived: true },
    ];
    expect(metrics(s, "month", "2026-10-06").won).toBe(1000);
    expect(metrics(s, "all", "2026-10-06").won).toBe(3000);
  });
  it("counts only incomplete active tasks due today or earlier", () => {
    const s = seed();
    s.tasks = [
      { ...s.tasks[0], due: "2026-10-05" },
      { ...s.tasks[1], due: "2026-10-06" },
      { ...s.tasks[2], due: "2026-10-07" },
      { ...s.tasks[3], due: "2026-10-05", done: true },
      { ...s.tasks[4], due: "2026-10-05", archived: true },
    ];
    expect(metrics(s, "month", "2026-10-06").followups).toBe(2);
  });
  it("returns zeros for an empty workspace", () => {
    const s = seed();
    s.deals = [];
    s.tasks = [];
    expect(metrics(s, "month")).toEqual({
      pipeline: 0,
      forecast: 0,
      won: 0,
      openCount: 0,
      wonCount: 0,
      followups: 0,
    });
  });
});
describe("repository journeys", () => {
  it("saves a new company and records its creation", () => {
    const s = saveRecord(seed(), "company", {
      ...base,
      name: "Cedar Studio",
      industry: "Creative",
      city: "Austin",
      website: "",
      pinned: false,
    });
    expect(s.companies).toHaveLength(13);
    expect(s.activities[0].record.id).toBe("new");
  });
  it("validates relationships before saving", () => {
    expect(() =>
      saveRecord(seed(), "contact", {
        ...seed().contacts[0],
        companyId: "missing",
      }),
    ).toThrow();
  });
  it("moves and undoes stages including the exact actual close date", () => {
    const s = seed(),
      old = s.deals[10];
    const moved = moveDeal(s, old.id, "Lead", "2026-10-06");
    expect(moved.deals[10].closedAt).toBeNull();
    const undone = undoMove(moved, old);
    expect(undone.deals[10].closedAt).toBe(old.closedAt);
    expect(undone.deals[10].stage).toBe("Won");
    expect(undone.activities[0].text).toContain("undone");
  });
  it("does not add activity for a same-stage move", () => {
    const s = seed();
    expect(moveDeal(s, s.deals[0].id, s.deals[0].stage)).toBe(s);
  });
  it("archives and restores without losing related contacts, deals, tasks or notes", () => {
    const s = seed();
    const archived = archiveRecord(s, { kind: "company", id: "co-1" }, true);
    expect(archived.companies[0].archived).toBe(true);
    expect(archived.contacts).toEqual(s.contacts);
    expect(archived.deals).toEqual(s.deals);
    expect(archived.tasks).toEqual(s.tasks);
    const restored = archiveRecord(
      archived,
      { kind: "company", id: "co-1" },
      false,
    );
    expect(restored.companies[0].archived).toBe(false);
    expect(workspaceSchema.safeParse(restored).success).toBe(true);
  });
  it("creates one handoff checklist even after repeats, completion, archive and stage re-entry", () => {
    let s = moveDeal(seed(), "de-1", "Won", "2026-10-06");
    s = createHandoff(s, "de-1", "2026-10-06");
    const handoffs = s.tasks.filter((t) => t.handoffKey);
    expect(handoffs).toHaveLength(3);
    s = completeTask(s, handoffs[0].id);
    s = archiveRecord(s, { kind: "task", id: handoffs[1].id }, true);
    s = moveDeal(s, "de-1", "Lead");
    s = moveDeal(s, "de-1", "Won");
    s = createHandoff(s, "de-1");
    expect(s.tasks.filter((t) => t.handoffKey)).toHaveLength(3);
  });
  it("only creates handoffs for won deals and logs task completion on the related record", () => {
    const s = seed();
    expect(createHandoff(s, "de-1")).toBe(s);
    const changed = completeTask(s, "ta-1");
    expect(changed.tasks[0].done).toBe(true);
    expect(changed.activities[0].record).toEqual({ kind: "deal", id: "de-1" });
    expect(completeTask(changed, "ta-1").tasks[0].done).toBe(false);
  });
});
describe("CSV parsing, validation and safe export", () => {
  it("parses BOM, commas, escaped quotes and embedded newlines", () => {
    expect(
      parseCSV('\uFEFFname,city\r\n"Cedar, Inc.","A ""quoted""\ncity"\r\n'),
    ).toEqual([
      ["name", "city"],
      ["Cedar, Inc.", 'A "quoted"\ncity'],
    ]);
  });
  it.each([
    "name,name\na,b",
    "name,city\na",
    'name\n"oops',
    'name\n"a"junk',
    "name\n",
    'name\na"b',
  ])("rejects malformed file %s", (input) =>
    expect(() => parseCSV(input)).toThrow(),
  );
  it("supports explicit field mapping", () => {
    const s = seed(),
      rows = parseCSV("business,place\nCedar House,Austin");
    const preview = previewImport(s, "company", rows, {
      name: "business",
      city: "place",
    });
    expect(preview[0].error).toBeNull();
    expect(preview[0].data.name).toBe("Cedar House");
  });
  it("rejects blank names, unknown companies, real emails and duplicates within a file", () => {
    const s = seed();
    expect(
      previewImport(s, "company", [["name"], [""]], { name: "name" })[0].error,
    ).toBeTruthy();
    const rows = parseCSV(
      "name,email,company\nAlex,alex@example.com,Unknown\nBea,bea@real.com,Juniper Studio\nSam,sam@example.com,Juniper Studio\nSam,sam@example.com,Juniper Studio",
    );
    const p = previewImport(s, "contact", rows, {
      name: "name",
      email: "email",
      company: "company",
    });
    expect(p[0].error).toContain("Company");
    expect(p[1].error).toContain("example.com");
    expect(p[2].error).toBeNull();
    expect(p[3].error).toContain("within this file");
  });
  it("skips or updates duplicates explicitly and keeps record IDs and relations", () => {
    const s = seed();
    const p = previewImport(
      s,
      "company",
      parseCSV("name,city\nJuniper Studio,Salem"),
      { name: "name", city: "city" },
    );
    expect(p[0].duplicateId).toBe("co-1");
    expect(commitImport(s, "company", p, "skip").companies).toEqual(
      s.companies,
    );
    const updated = commitImport(s, "company", p, "update");
    expect(updated.companies).toHaveLength(12);
    expect(updated.companies[0].id).toBe("co-1");
    expect(updated.companies[0].city).toBe("Salem");
    expect(updated.deals).toEqual(s.deals);
  });
  it("imports companies then contacts with valid relationships", () => {
    const s = seed();
    const cp = previewImport(s, "company", parseCSV("name\nCedar House"), {
      name: "name",
    });
    const next = commitImport(s, "company", cp, "skip");
    const ct = previewImport(
      next,
      "contact",
      parseCSV("name,email,company\nAlex,alex@example.com,Cedar House"),
      { name: "name", email: "email", company: "company" },
    );
    const final = commitImport(next, "contact", ct, "skip");
    expect(final.contacts.at(-1)?.companyId).toBe(final.companies.at(-1)?.id);
    expect(workspaceSchema.safeParse(final).success).toBe(true);
  });
  it("rejects changed relationships and invalid previews at commit without partial writes", () => {
    const s = seed();
    const p = previewImport(
      s,
      "contact",
      parseCSV("name,email,company\nAlex,alex@example.com,Juniper Studio"),
      { name: "name", email: "email", company: "company" },
    );
    const current = archiveRecord(s, { kind: "company", id: "co-1" }, true);
    expect(() => commitImport(current, "contact", p, "skip")).toThrow();
    expect(() =>
      commitImport(s, "contact", [{ ...p[0], error: "bad" }], "skip"),
    ).toThrow();
    expect(s.contacts).toHaveLength(24);
  });
  it("rejects moving a duplicate contact away from its linked deals", () => {
    const s = seed();
    const p = previewImport(
      s,
      "contact",
      parseCSV(
        "name,email,company\nOlivia Chen,olivia.chen@example.com,Northstar Electric",
      ),
      { name: "name", email: "email", company: "company" },
    );
    expect(() => commitImport(s, "contact", p, "update")).toThrow(
      "another company",
    );
  });
  it.each([
    "=SUM(A1:A2)",
    "+1+1",
    "-42",
    "@SUM(1)",
    "   =cmd",
    "\tfoo",
    "\nfoo",
  ])("neutralizes spreadsheet formulas %s", (v) =>
    expect(csvCell(v)).toBe(`"'${v}"`),
  );
  it("exports quotes and line breaks correctly while leaving normal text alone", () => {
    expect(csvCell('A "quote"')).toBe('"A ""quote"""');
    expect(exportCSV(["name"], [["Cedar, Inc."]])).toBe(
      '\uFEFF"name"\r\n"Cedar, Inc."',
    );
  });
});
describe("versioned persistence", () => {
  const memory = () => {
    const values = new Map<string, string>();
    return {
      values,
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
  };
  it("seeds once, saves every mutation and reloads a stable workspace", () => {
    const storage = memory(),
      adapter = browserAdapter(storage);
    const first = adapter.load();
    expect(first.warning).toBeNull();
    const next = moveDeal(first.data, "de-1", "Won");
    expect(adapter.save(next)).toBeNull();
    const reloaded = browserAdapter(storage).load();
    expect(reloaded.data).toEqual(next);
    expect(reloaded.data.firstLaunch).toBe(first.data.firstLaunch);
  });
  it("handles unavailable and quota-limited storage without crashing", () => {
    expect(browserAdapter(null).load().warning).toContain("unavailable");
    const bad = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(browserAdapter(bad).load().warning).toContain("full");
  });
  it.each([
    "{broken",
    '{"version":99}',
    "null",
    '{"version":1,"companies":[]}',
  ])(
    "preserves malformed original data and loads a temporary seed: %s",
    (raw) => {
      const storage = memory();
      storage.setItem(STORAGE_KEY, raw);
      const result = browserAdapter(storage).load();
      expect(result.warning).toContain("could not be read");
      expect(result.data.companies).toHaveLength(12);
      expect(storage.getItem(STORAGE_KEY)).toBe(raw);
    },
  );
});

describe("normalized record identity", () => {
  it("rejects whitespace and case variants of existing companies and contacts", () => {
    const s = seed();
    expect(() =>
      saveRecord(s, "company", {
        ...s.companies[0],
        id: "duplicate-company",
        name: ` ${s.companies[0].name.toUpperCase()} `,
      }),
    ).toThrow("A company with that name already exists.");
    expect(() =>
      saveRecord(s, "contact", {
        ...s.contacts[0],
        id: "duplicate-contact",
        email: ` ${s.contacts[0].email.toUpperCase()} `,
      }),
    ).toThrow("A contact with that email already exists.");
    expect(saveRecord(s, "company", s.companies[0]).companies).toHaveLength(12);
  });
});
