"use client";
import { useState, type FormEvent } from "react";
import { ArrowRight, Plus } from "lucide-react";
import {
  STAGES,
  INDUSTRIES,
  PRIORITIES,
  collection,
  localDay,
  addDays,
  schemas,
  type Entity,
  type Kind,
  type Workspace,
  type Deal,
  type Task,
  type Stage,
} from "@/lib/domain";
import { commit } from "@/lib/store";
import { saveRecord, uid, activity } from "@/lib/repository";
import { Button, Modal } from "./ui";
export type Editor = {
  kind: Kind;
  record?: Entity;
  preset?: Record<string, unknown>;
};
export function RecordForm({
  editor,
  s,
  onClose,
  onSaved,
}: {
  editor: Editor;
  s: Workspace;
  onClose: () => void;
  onSaved: (kind: Kind, id: string, won: boolean, stage?: Stage) => void;
}) {
  const { kind, record, preset } = editor;
  const [values, setValues] = useState<Record<string, string>>(() => {
    const defaults: Record<string, unknown> = {
      name: "",
      industry: "Professional services",
      city: "",
      website: "",
      email: "",
      phone: "",
      role: "",
      companyId: s.companies.find((c) => !c.archived)?.id ?? "",
      contactId: "",
      amount: "",
      stage: "Lead",
      expectedClose: addDays(localDay(), 14),
      title: "",
      due: localDay(),
      priority: "Medium",
      recordKind: "",
      recordId: "",
      followup: "",
      followupDue: localDay(),
      ...preset,
      ...record,
    };
    if (kind === "task" && record && "record" in record && record.record) {
      defaults.recordKind = record.record.kind;
      defaults.recordId = record.record.id;
    }
    return Object.fromEntries(
      Object.entries(defaults).map(([k, v]) => [k, String(v ?? "")]),
    );
  });
  const [error, setError] = useState("");
  const set = (key: string, value: string) =>
    setValues((v) => ({
      ...v,
      [key]: value,
      ...(key === "companyId" ? { contactId: "" } : {}),
      ...(key === "recordKind" ? { recordId: "" } : {}),
    }));
  const field = (
    key: string,
    label: string,
    options?: {
      type?: string;
      required?: boolean;
      placeholder?: string;
      min?: string;
      max?: string;
    },
  ) => (
    <label className="field">
      <span>
        {label}
        {options?.required && <b aria-hidden="true"> *</b>}
      </span>
      <input
        aria-label={label}
        data-autofocus={
          key === (kind === "task" ? "title" : "name") ? "true" : undefined
        }
        name={key}
        value={values[key] ?? ""}
        onChange={(e) => set(key, e.target.value)}
        type={options?.type ?? "text"}
        required={options?.required}
        placeholder={options?.placeholder}
        min={options?.min}
        max={options?.max}
        maxLength={key === "amount" ? undefined : 180}
      />
    </label>
  );
  const companySelect = (
    <label className="field">
      <span>
        Company <b>*</b>
      </span>
      <select
        name="companyId"
        value={values.companyId}
        onChange={(e) => set("companyId", e.target.value)}
        required
      >
        <option value="">Select a company</option>
        {s.companies
          .filter((c) => !c.archived || c.id === values.companyId)
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.archived ? " (archived)" : ""}
            </option>
          ))}
      </select>
    </label>
  );
  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const base = {
        id: record?.id ?? uid(),
        createdAt: record?.createdAt ?? new Date().toISOString(),
        archived: record?.archived ?? false,
      };
      let input: unknown;
      if (kind === "company")
        input = {
          ...base,
          name: values.name,
          industry: values.industry,
          city: values.city,
          website: values.website,
          pinned: record && "pinned" in record ? record.pinned : false,
        };
      if (kind === "contact") {
        if (!/@example\.com$/i.test(values.email))
          throw new Error("Use an example.com email for this fictional demo.");
        input = {
          ...base,
          name: values.name,
          companyId: values.companyId,
          email: values.email,
          phone: values.phone,
          role: values.role,
        };
      }
      if (kind === "deal")
        input = {
          ...base,
          name: values.name,
          companyId: values.companyId,
          contactId: values.contactId,
          amount: values.amount.trim() ? Number(values.amount) : NaN,
          stage: values.stage,
          expectedClose: values.expectedClose,
          closedAt: ["Won", "Lost"].includes(values.stage)
            ? ((record && "stage" in record && record.stage === values.stage
                ? record.closedAt
                : null) ?? localDay())
            : null,
          pinned: record && "pinned" in record ? record.pinned : false,
        };
      if (kind === "task")
        input = {
          ...base,
          title: values.title,
          due: values.due,
          priority: values.priority,
          done: record && "done" in record ? record.done : false,
          completedAt:
            record && "completedAt" in record ? record.completedAt : null,
          record:
            values.recordKind && values.recordId
              ? { kind: values.recordKind, id: values.recordId }
              : null,
          ...(record && "handoffKey" in record
            ? { handoffKey: record.handoffKey }
            : {}),
        };
      const parsed = schemas[kind].safeParse(input);
      if (!parsed.success)
        throw new Error(
          parsed.error.issues
            .map((i) => `${i.path.join(" ")}: ${i.message}`)
            .join(" "),
        );
      if (
        kind === "contact" &&
        s.contacts.some(
          (c) =>
            c.id !== base.id &&
            c.email.toLowerCase() === values.email.toLowerCase(),
        )
      )
        throw new Error("A contact with that email already exists.");
      if (
        kind === "company" &&
        s.companies.some(
          (c) =>
            c.id !== base.id &&
            c.name.toLowerCase() === values.name.trim().toLowerCase(),
        )
      )
        throw new Error("A company with that name already exists.");
      let followup: Task | null = null;
      if (kind === "deal" && values.followup.trim())
        followup = schemas.task.parse({
          id: uid(),
          createdAt: new Date().toISOString(),
          archived: false,
          title: values.followup,
          due: values.followupDue,
          priority: "Medium",
          done: false,
          completedAt: null,
          record: { kind: "deal", id: base.id },
        });
      commit((current) => {
        let next = saveRecord(current, kind, parsed.data);
        if (
          kind === "deal" &&
          record &&
          "stage" in record &&
          record.stage !== values.stage
        )
          next = activity(
            next,
            { kind, id: base.id },
            `Moved from ${record.stage} to ${values.stage}.`,
          );
        if (followup) next = saveRecord(next, "task", followup);
        return next;
      });
      onSaved(
        kind,
        base.id,
        kind === "deal" &&
          values.stage === "Won" &&
          (!record || (record as Deal).stage !== "Won"),
        kind === "deal" ? (values.stage as Stage) : undefined,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save this record.",
      );
    }
  }
  const plural = kind === "company" ? "company" : kind;
  return (
    <Modal
      title={`${record ? "Edit" : "New"} ${plural}`}
      description={
        record
          ? "Keep the details up to date."
          : "A new relationship starts with a little context."
      }
      onClose={onClose}
    >
      <form onSubmit={submit} className="record-form">
        {kind === "company" && (
          <>
            {field("name", "Company name", {
              required: true,
              placeholder: "e.g. Cedar House Studio",
            })}
            <div className="form-grid">
              <label className="field">
                <span>
                  Industry <b>*</b>
                </span>
                <select
                  value={values.industry}
                  onChange={(e) => set("industry", e.target.value)}
                >
                  {[...new Set([...INDUSTRIES, values.industry])].map((i) => (
                    <option key={i}>{i}</option>
                  ))}
                </select>
              </label>
              {field("city", "Location", { placeholder: "City, state" })}
            </div>
            {field("website", "Website", {
              type: "url",
              placeholder: "https://cedarhouse.example.com",
            })}
          </>
        )}
        {kind === "contact" && (
          <>
            {field("name", "Full name", {
              required: true,
              placeholder: "e.g. Alex Morgan",
            })}
            {companySelect}
            <div className="form-grid">
              {field("email", "Email", {
                type: "email",
                required: true,
                placeholder: "alex.morgan@example.com",
              })}
              {field("phone", "Phone", {
                type: "tel",
                placeholder: "(555) 010-1234",
              })}
            </div>
            {field("role", "Job title", { placeholder: "e.g. Founder" })}
            <p className="field-help">
              Use fictional names and example.com emails.
            </p>
          </>
        )}
        {kind === "deal" && (
          <>
            {field("name", "Deal name", {
              required: true,
              placeholder: "e.g. Customer portal",
            })}
            {companySelect}
            <label className="field">
              <span>Primary contact</span>
              <select
                value={values.contactId}
                onChange={(e) => set("contactId", e.target.value)}
              >
                <option value="">No contact yet</option>
                {s.contacts
                  .filter(
                    (c) =>
                      c.companyId === values.companyId &&
                      (!c.archived || c.id === values.contactId),
                  )
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </label>
            <div className="form-grid">
              {field("amount", "Value (USD)", {
                type: "number",
                required: true,
                min: "0",
                max: "1000000000",
                placeholder: "15000",
              })}
              <label className="field">
                <span>Stage</span>
                <select
                  aria-label="Stage"
                  value={values.stage}
                  onChange={(e) => set("stage", e.target.value)}
                >
                  {STAGES.map((stage) => (
                    <option key={stage}>{stage}</option>
                  ))}
                </select>
              </label>
            </div>
            {field("expectedClose", "Expected close", {
              type: "date",
              required: true,
            })}
            {(!record || values.followup) && (
              <div className="form-section">
                <h3>
                  Give it a next step <span>Optional</span>
                </h3>
                {field("followup", "Follow-up task", {
                  placeholder: "e.g. Send a discovery call recap",
                })}
                {field("followupDue", "Follow-up date", {
                  type: "date",
                  required: !!values.followup,
                })}
              </div>
            )}
          </>
        )}
        {kind === "task" && (
          <>
            {field("title", "Task title", {
              required: true,
              placeholder: "What needs to happen next?",
            })}
            <div className="form-grid">
              {field("due", "Due date", { type: "date", required: true })}
              <label className="field">
                <span>Priority</span>
                <select
                  value={values.priority}
                  onChange={(e) => set("priority", e.target.value)}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="field">
              <span>Related to</span>
              <select
                value={values.recordKind}
                onChange={(e) => set("recordKind", e.target.value)}
              >
                <option value="">No linked record</option>
                <option value="company">Company</option>
                <option value="contact">Contact</option>
                <option value="deal">Deal</option>
              </select>
            </label>
            {values.recordKind && (
              <label className="field">
                <span>
                  Select record <b>*</b>
                </span>
                <select
                  value={values.recordId}
                  onChange={(e) => set("recordId", e.target.value)}
                  required
                >
                  <option value="">Choose a record</option>
                  {collection(s, values.recordKind as Kind)
                    .filter((r) => !r.archived || r.id === values.recordId)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {"name" in r ? r.name : r.title}
                      </option>
                    ))}
                </select>
              </label>
            )}
          </>
        )}
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <div className="form-footer">
          <span>Saved in your browser</span>
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            {record ? "Save changes" : `Create ${plural}`}
            {record ? <ArrowRight size={16} /> : <Plus size={16} />}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
