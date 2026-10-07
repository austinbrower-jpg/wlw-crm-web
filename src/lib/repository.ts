import {
  collection,
  schemas,
  workspaceSchema,
  localDay,
  addDays,
  type Activity,
  type Entity,
  type Kind,
  type Workspace,
  type RecordRef,
  type Stage,
  type Deal,
} from "./domain";
export function uid() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}
export function activity(
  s: Workspace,
  record: RecordRef,
  text: string,
  type: Activity["type"] = "change",
): Workspace {
  return {
    ...s,
    activities: [
      { id: uid(), record, text, type, at: new Date().toISOString() },
      ...s.activities,
    ],
  };
}
export function saveRecord(
  s: Workspace,
  kind: Kind,
  input: unknown,
): Workspace {
  const entity = schemas[kind].parse(input) as Entity;
  const key = (
    {
      company: "companies",
      contact: "contacts",
      deal: "deals",
      task: "tasks",
    } as const
  )[kind];
  const old = collection(s, kind).find((r) => r.id === entity.id);
  if (
    kind === "company" &&
    "name" in entity &&
    s.companies.some(
      (c) =>
        c.id !== entity.id &&
        c.name.toLowerCase() === entity.name.toLowerCase(),
    )
  )
    throw new Error("A company with that name already exists.");
  if (
    kind === "contact" &&
    "email" in entity &&
    s.contacts.some(
      (c) =>
        c.id !== entity.id &&
        c.email.toLowerCase() === entity.email.toLowerCase(),
    )
  )
    throw new Error("A contact with that email already exists.");
  const next = {
    ...s,
    [key]: old
      ? collection(s, kind).map((r) => (r.id === entity.id ? entity : r))
      : [...collection(s, kind), entity],
  };
  const checked = workspaceSchema.safeParse(next);
  if (!checked.success)
    throw new Error(
      checked.error.issues.map((issue) => issue.message).join(" "),
    );
  return activity(
    next,
    { kind, id: entity.id },
    old ? "Record details updated." : "Record created.",
    old ? "change" : "created",
  );
}
export function archiveRecord(s: Workspace, ref: RecordRef, archived: boolean) {
  const key = (
    {
      company: "companies",
      contact: "contacts",
      deal: "deals",
      task: "tasks",
    } as const
  )[ref.kind];
  return activity(
    {
      ...s,
      [key]: collection(s, ref.kind).map((r) =>
        r.id === ref.id ? { ...r, archived } : r,
      ),
    },
    ref,
    archived
      ? "Record archived. Relationships are preserved."
      : "Record restored.",
  );
}
export function moveDeal(
  s: Workspace,
  id: string,
  stage: Stage,
  today = localDay(),
) {
  const previous = s.deals.find((d) => d.id === id);
  if (!previous || previous.stage === stage) return s;
  return activity(
    {
      ...s,
      deals: s.deals.map((d) =>
        d.id === id
          ? {
              ...d,
              stage,
              closedAt: ["Won", "Lost"].includes(stage) ? today : null,
            }
          : d,
      ),
    },
    { kind: "deal", id },
    `Moved from ${previous.stage} to ${stage}.`,
  );
}
export function undoMove(s: Workspace, previous: Deal) {
  return activity(
    {
      ...s,
      deals: s.deals.map((d) =>
        d.id === previous.id
          ? { ...d, stage: previous.stage, closedAt: previous.closedAt }
          : d,
      ),
    },
    { kind: "deal", id: previous.id },
    `Stage change undone. Returned to ${previous.stage}.`,
  );
}
export function completeTask(s: Workspace, id: string) {
  const t = s.tasks.find((t) => t.id === id);
  if (!t) return s;
  const next = {
    ...s,
    tasks: s.tasks.map((r) =>
      r.id === id
        ? {
            ...r,
            done: !r.done,
            completedAt: r.done ? null : new Date().toISOString(),
          }
        : r,
    ),
  };
  return activity(
    next,
    t.record ?? { kind: "task", id },
    t.done ? `Reopened: ${t.title}` : `Completed: ${t.title}`,
    "task",
  );
}
export function createHandoff(
  s: Workspace,
  dealId: string,
  today = localDay(),
) {
  const d = s.deals.find((d) => d.id === dealId);
  if (!d || d.stage !== "Won") return s;
  const list = [
    ["kickoff", "Schedule project kickoff", 1],
    ["assets", "Collect project assets", 2],
    ["scope", "Confirm scope and milestones", 3],
  ] as const;
  const tasks = list
    .filter(
      ([key]) => !s.tasks.some((t) => t.handoffKey === `${dealId}:${key}`),
    )
    .map(([key, title, offset]) => ({
      id: uid(),
      title,
      due: addDays(today, offset),
      priority: "Medium" as const,
      done: false,
      completedAt: null,
      record: { kind: "deal" as const, id: dealId },
      createdAt: new Date().toISOString(),
      archived: false,
      handoffKey: `${dealId}:${key}`,
    }));
  if (!tasks.length) return s;
  return activity(
    { ...s, tasks: [...s.tasks, ...tasks] },
    { kind: "deal", id: dealId },
    `${tasks.length} project handoff tasks created.`,
    "task",
  );
}
