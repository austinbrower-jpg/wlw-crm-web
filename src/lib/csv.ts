import {
  companySchema,
  contactSchema,
  type Workspace,
  type Company,
  type Contact,
} from "./domain";
import { uid, activity } from "./repository";
export type ImportKind = "company" | "contact";
export type DuplicateMode = "skip" | "update";
export type ImportRow = {
  line: number;
  data: Record<string, string>;
  error: string | null;
  duplicateId: string | null;
};
export function parseCSV(text: string): string[][] {
  if (text.length > 2000000)
    throw new Error("Choose a CSV file smaller than 2 MB.");
  const rows: string[][] = [];
  let row: string[] = [],
    value = "",
    quoted = false,
    afterQuote = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          value += '"';
          i++;
        } else {
          quoted = false;
          afterQuote = true;
        }
      } else value += c;
    } else if (c === '"') {
      if (value || afterQuote) throw new Error("Unexpected quote in CSV.");
      quoted = true;
    } else if (c === "," || c === "\n" || c === "\r") {
      row.push(value);
      value = "";
      afterQuote = false;
      if (c !== ",") {
        if (c === "\r" && input[i + 1] === "\n") i++;
        if (row.some((v) => v.trim())) rows.push(row);
        row = [];
      }
    } else {
      if (afterQuote && !/\s/.test(c))
        throw new Error("Unexpected text after a quoted field.");
      if (!afterQuote) value += c;
    }
  }
  if (quoted) throw new Error("A quoted field is not closed.");
  row.push(value);
  if (row.some((v) => v.trim())) rows.push(row);
  if (rows.length < 2)
    throw new Error("Include a header row and at least one data row.");
  if (rows.length > 1001) throw new Error("Import up to 1,000 rows at a time.");
  const headers = rows[0].map((v) => v.trim());
  if (headers.some((v) => !v) || new Set(headers).size !== headers.length)
    throw new Error("Headers must be unique and cannot be blank.");
  if (rows.some((r) => r.length !== headers.length))
    throw new Error(
      "Every row must have the same number of fields as the header.",
    );
  return [headers, ...rows.slice(1)];
}
export const importFields = {
  company: ["name", "industry", "city", "website"],
  contact: ["name", "email", "company", "role", "phone"],
} as const;
export function previewImport(
  s: Workspace,
  kind: ImportKind,
  rows: string[][],
  mapping: Record<string, string>,
): ImportRow[] {
  const seen = new Set<string>();
  return rows.slice(1).map((row, i) => {
    const data = Object.fromEntries(
      importFields[kind].map((field) => [
        field,
        row[rows[0].indexOf(mapping[field])]?.trim() ?? "",
      ]),
    );
    let error: string | null = null,
      duplicateId: string | null = null;
    const base = {
      id: "preview",
      createdAt: new Date().toISOString(),
      archived: false,
    };
    if (kind === "company") {
      const result = companySchema.safeParse({
        ...base,
        ...data,
        industry: data.industry || "Professional services",
        pinned: false,
      });
      if (!result.success)
        error = result.error.issues
          .map((i) => `${String(i.path[0])}: ${i.message}`)
          .join(" ");
      duplicateId =
        s.companies.find(
          (c) => c.name.toLowerCase() === data.name.toLowerCase(),
        )?.id ?? null;
    } else {
      const company = s.companies.find(
        (c) =>
          !c.archived && c.name.toLowerCase() === data.company.toLowerCase(),
      );
      const result = contactSchema.safeParse({
        ...base,
        ...data,
        companyId: company?.id ?? "",
      });
      if (!company)
        error =
          "Company must match an active company in this workspace. Import companies first.";
      else if (!result.success)
        error = result.error.issues
          .map((i) => `${String(i.path[0])}: ${i.message}`)
          .join(" ");
      duplicateId =
        s.contacts.find(
          (c) => c.email.toLowerCase() === data.email.toLowerCase(),
        )?.id ?? null;
      if (!error && !/@example\.com$/i.test(data.email))
        error = "Fictional demo emails must use example.com.";
    }
    const key = (kind === "company" ? data.name : data.email).toLowerCase();
    if (seen.has(key))
      error = "Duplicate within this file. Keep one row per record.";
    seen.add(key);
    return { line: i + 2, data, error, duplicateId };
  });
}
export function commitImport(
  s: Workspace,
  kind: ImportKind,
  rows: ImportRow[],
  duplicates: DuplicateMode,
): Workspace {
  if (rows.some((r) => r.error))
    throw new Error("Fix validation errors before importing.");
  // Validate again against current relationships and duplicates at the explicit commit.
  const fields = [...importFields[kind]];
  const checked = previewImport(
    s,
    kind,
    [fields, ...rows.map((r) => fields.map((f) => r.data[f] ?? ""))],
    Object.fromEntries(fields.map((f) => [f, f])),
  );
  if (checked.some((r) => r.error))
    throw new Error("Workspace changed. Preview the file again.");
  let next = s;
  for (const row of checked) {
    if (row.duplicateId && duplicates === "skip") continue;
    const base = {
      id: row.duplicateId ?? uid(),
      createdAt: new Date().toISOString(),
      archived: false,
    };
    if (kind === "company") {
      const old = next.companies.find((c) => c.id === base.id);
      const item: Company = companySchema.parse({
        ...base,
        ...old,
        ...row.data,
        industry: row.data.industry || old?.industry || "Professional services",
        pinned: old?.pinned ?? false,
      });
      next = {
        ...next,
        companies: old
          ? next.companies.map((c) => (c.id === item.id ? item : c))
          : [...next.companies, item],
      };
    } else {
      const old = next.contacts.find((c) => c.id === base.id);
      const company = next.companies.find(
        (c) =>
          !c.archived &&
          c.name.toLowerCase() === row.data.company.toLowerCase(),
      )!;
      const item: Contact = contactSchema.parse({
        ...base,
        ...old,
        ...row.data,
        companyId: company.id,
      });
      const linked = next.deals.some(
        (d) => d.contactId === item.id && d.companyId !== item.companyId,
      );
      if (linked)
        throw new Error(
          "A duplicate contact has deals at another company. Keep the original company or skip duplicates.",
        );
      next = {
        ...next,
        contacts: old
          ? next.contacts.map((c) => (c.id === item.id ? item : c))
          : [...next.contacts, item],
      };
    }
    next = activity(
      next,
      { kind, id: base.id },
      row.duplicateId
        ? "Details updated by CSV import."
        : "Record imported from CSV.",
    );
  }
  return next;
}
export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@\t\r\n]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}
export function exportCSV(headers: string[], rows: unknown[][]) {
  return (
    "\uFEFF" +
    [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n")
  );
}
export function downloadCSV(
  name: string,
  headers: string[],
  rows: unknown[][],
) {
  const url = URL.createObjectURL(
    new Blob([exportCSV(headers, rows)], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
