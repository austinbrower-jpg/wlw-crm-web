import { z } from "zod";
export const STAGES = [
  "Lead",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
] as const;
export const PROBABILITIES = {
  Lead: 0.1,
  Qualified: 0.3,
  Proposal: 0.6,
  Negotiation: 0.8,
  Won: 1,
  Lost: 0,
} as const;
export const PRIORITIES = ["High", "Medium", "Low"] as const;
export const INDUSTRIES = [
  "Professional services",
  "Construction",
  "Hospitality",
  "Creative",
  "Technology",
  "Retail",
] as const;
export type Stage = (typeof STAGES)[number];
export type Kind = "company" | "contact" | "deal" | "task";
export type Screen =
  "today" | "companies" | "contacts" | "deals" | "tasks" | "settings";
export type RecordRef = { kind: Kind; id: string };
const text = z
  .string()
  .trim()
  .min(1, "This field is required.")
  .max(180, "Keep this under 180 characters.");
const short = z.string().trim().max(300);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
  .refine((v) => {
    const d = new Date(v + "T12:00:00");
    return !isNaN(d.valueOf()) && localDay(d) === v;
  }, "Use a valid calendar date.");
const timestamp = z.string().datetime();
const base = { id: text, createdAt: timestamp, archived: z.boolean() };
export const companySchema = z.object({
  ...base,
  name: text,
  industry: text,
  city: short,
  website: short.refine((v) => {
    if (!v) return true;
    try {
      const u = new URL(v);
      return ["http:", "https:"].includes(u.protocol) && Boolean(u.hostname);
    } catch {
      return false;
    }
  }, "Use a valid full URL starting with https://."),
  pinned: z.boolean(),
});
export const contactSchema = z.object({
  ...base,
  name: text,
  companyId: text,
  email: z.string().trim().email("Use a valid email address.").max(180),
  phone: short,
  role: short,
});
export const dealSchema = z.object({
  ...base,
  name: text,
  companyId: text,
  contactId: z.string(),
  amount: z
    .number()
    .finite()
    .min(0, "Amount must be zero or more.")
    .max(1000000000),
  stage: z.enum(STAGES),
  expectedClose: date,
  closedAt: date.nullable(),
  pinned: z.boolean(),
});
export const taskSchema = z.object({
  ...base,
  title: text,
  due: date,
  priority: z.enum(PRIORITIES),
  done: z.boolean(),
  completedAt: timestamp.nullable(),
  record: z
    .object({ kind: z.enum(["company", "contact", "deal"]), id: text })
    .nullable(),
  handoffKey: z.string().optional(),
});
export const activitySchema = z.object({
  id: text,
  record: z.object({
    kind: z.enum(["company", "contact", "deal", "task"]),
    id: text,
  }),
  type: z.enum(["note", "call", "change", "created", "task"]),
  text: z.string().trim().min(1).max(4000),
  at: timestamp,
});
export const workspaceSchema = z
  .object({
    version: z.literal(1),
    firstLaunch: timestamp,
    companies: z.array(companySchema),
    contacts: z.array(contactSchema),
    deals: z.array(dealSchema),
    tasks: z.array(taskSchema),
    activities: z.array(activitySchema),
  })
  .superRefine((s, ctx) => {
    const has = (kind: Kind, id: string) =>
      collection(s, kind).some((r) => r.id === id);
    for (const kind of ["company", "contact", "deal", "task"] as const) {
      const ids = collection(s, kind).map((r) => r.id);
      if (new Set(ids).size !== ids.length)
        ctx.addIssue({ code: "custom", message: "Duplicate record IDs." });
    }
    for (const c of s.contacts)
      if (!has("company", c.companyId))
        ctx.addIssue({
          code: "custom",
          message: "Contact company does not exist.",
        });
    for (const d of s.deals) {
      if (!has("company", d.companyId))
        ctx.addIssue({
          code: "custom",
          message: "Deal company does not exist.",
        });
      if (
        d.contactId &&
        !s.contacts.some(
          (c) => c.id === d.contactId && c.companyId === d.companyId,
        )
      )
        ctx.addIssue({
          code: "custom",
          message: "Deal contact must belong to its company.",
        });
      if (["Won", "Lost"].includes(d.stage) !== Boolean(d.closedAt))
        ctx.addIssue({
          code: "custom",
          message: "Closed deals need an actual close date.",
        });
    }
    for (const t of s.tasks)
      if (t.record && !has(t.record.kind, t.record.id))
        ctx.addIssue({
          code: "custom",
          message: "Task record does not exist.",
        });
    for (const a of s.activities)
      if (!has(a.record.kind, a.record.id))
        ctx.addIssue({
          code: "custom",
          message: "Activity record does not exist.",
        });
  });
export type Company = z.infer<typeof companySchema>;
export type Contact = z.infer<typeof contactSchema>;
export type Deal = z.infer<typeof dealSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Activity = z.infer<typeof activitySchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type Entity = Company | Contact | Deal | Task;
export const schemas = {
  company: companySchema,
  contact: contactSchema,
  deal: dealSchema,
  task: taskSchema,
};
export function collection(
  s: Pick<Workspace, "companies" | "contacts" | "deals" | "tasks">,
  kind: Kind,
): Entity[] {
  return s[
    (
      {
        company: "companies",
        contact: "contacts",
        deal: "deals",
        task: "tasks",
      } as const
    )[kind]
  ];
}
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function addDays(day: string, count: number) {
  const d = new Date(day + "T12:00:00");
  d.setDate(d.getDate() + count);
  return localDay(d);
}
export function money(n: number, compact = false) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    ...(compact && n >= 10000
      ? { notation: "compact" as const, maximumFractionDigits: 1 }
      : {}),
  }).format(n);
}
export function formatDate(day: string, year = false) {
  return new Date(day + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(year ? { year: "numeric" } : {}),
  });
}
export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
}
export function recordName(s: Workspace, ref: RecordRef) {
  const r = collection(s, ref.kind).find((r) => r.id === ref.id);
  return r ? ("name" in r ? r.name : r.title) : "Unknown record";
}
export function metrics(
  s: Workspace,
  period: "month" | "all",
  today = localDay(),
) {
  const deals = s.deals.filter((d) => !d.archived);
  const open = deals.filter((d) => !["Won", "Lost"].includes(d.stage));
  const won = deals.filter(
    (d) =>
      d.stage === "Won" &&
      d.closedAt &&
      (period === "all" || d.closedAt.slice(0, 7) === today.slice(0, 7)),
  );
  return {
    pipeline: open.reduce((n, d) => n + d.amount, 0),
    forecast: open.reduce((n, d) => n + d.amount * PROBABILITIES[d.stage], 0),
    won: won.reduce((n, d) => n + d.amount, 0),
    openCount: open.length,
    wonCount: won.length,
    followups: s.tasks.filter((t) => !t.archived && !t.done && t.due <= today)
      .length,
  };
}
