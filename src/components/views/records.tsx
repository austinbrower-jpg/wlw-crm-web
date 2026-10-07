"use client";
import { useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  ArrowUpDown,
  Plus,
  Check,
  Pin,
  Download,
  Upload,
  Pencil,
} from "lucide-react";
import {
  money,
  INDUSTRIES,
  type Workspace,
  type Entity,
  type Company,
  type Contact,
} from "@/lib/domain";
import { commit } from "@/lib/store";
import { saveRecord } from "@/lib/repository";
import { downloadCSV } from "@/lib/csv";
import { Avatar, Button, Empty, IconButton, SearchField } from "../ui";
import type { AppActions } from "../actions";
function InlineText({
  value,
  label,
  onSave,
}: {
  value: string;
  label: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false),
    [draft, setDraft] = useState(value);
  function save(e: FormEvent) {
    e.preventDefault();
    onSave(draft.trim());
    setEditing(false);
  }
  return editing ? (
    <form onSubmit={save} className="inline-edit">
      <input
        aria-label={label}
        autoFocus
        value={draft}
        maxLength={180}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            setEditing(false);
          }
        }}
      />
      <button aria-label="Save inline edit" type="submit">
        <Check size={15} />
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        aria-label="Cancel inline edit"
      >
        ×
      </button>
    </form>
  ) : (
    <button
      className="inline-value"
      aria-label={`Edit ${label}`}
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
    >
      {value || "Add job title"}
      <Pencil size={12} />
    </button>
  );
}
export function RecordsView({
  kind,
  s,
  a,
  onImport,
}: {
  kind: "company" | "contact";
  s: Workspace;
  a: AppActions;
  onImport: () => void;
}) {
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [status, setStatus] = useState("active"),
    [sort, setSort] = useState("name"),
    [descending, setDescending] = useState(false);
  const source = kind === "company" ? s.companies : s.contacts;
  const items = source
    .filter(
      (r) =>
        (status === "archived") === r.archived &&
        (kind === "company"
          ? filter === "all" || (r as Company).industry === filter
          : filter === "all" || (r as Contact).companyId === filter) &&
        `${r.name} ${"email" in r ? r.email : ""} ${"city" in r ? r.city : ""} ${"companyId" in r ? s.companies.find((c) => c.id === r.companyId)?.name : ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => {
      const av =
        sort === "name"
          ? a.name
          : sort === "createdAt"
            ? a.createdAt
            : kind === "company"
              ? (a as Company).city
              : (s.companies.find((c) => c.id === (a as Contact).companyId)
                  ?.name ?? "");
      const bv =
        sort === "name"
          ? b.name
          : sort === "createdAt"
            ? b.createdAt
            : kind === "company"
              ? (b as Company).city
              : (s.companies.find((c) => c.id === (b as Contact).companyId)
                  ?.name ?? "");
      return av.localeCompare(bv) * (descending ? -1 : 1);
    });
  const title = kind === "company" ? "Companies" : "Contacts";
  function patch(r: Entity, data: Record<string, string>) {
    try {
      commit((s) => saveRecord(s, kind, { ...r, ...data }));
      a.notify("Details updated.");
    } catch (e) {
      a.notify(e instanceof Error ? e.message : "Could not update record.");
    }
  }
  function exportRows() {
    downloadCSV(
      `relay-${title.toLowerCase()}.csv`,
      kind === "company"
        ? ["name", "industry", "city", "website", "status"]
        : ["name", "email", "company", "role", "phone", "status"],
      items.map((r) =>
        kind === "company"
          ? [
              r.name,
              (r as Company).industry,
              (r as Company).city,
              (r as Company).website,
              r.archived ? "Archived" : "Active",
            ]
          : [
              r.name,
              (r as Contact).email,
              s.companies.find((c) => c.id === (r as Contact).companyId)?.name,
              (r as Contact).role,
              (r as Contact).phone,
              r.archived ? "Archived" : "Active",
            ],
      ),
    );
    a.notify(`Exported ${items.length} filtered ${title.toLowerCase()}.`);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {kind === "company"
              ? "THE PEOPLE BEHIND THE BUSINESS"
              : "EVERY CONNECTION COUNTS"}
          </div>
          <h1>
            {title}
            <span className="heading-count">
              {source.filter((r) => !r.archived).length}
            </span>
          </h1>
          <p>
            {kind === "company"
              ? "Your relationships, with the context that matters."
              : "The right people. The right conversation."}
          </p>
        </div>
        <Button variant="primary" onClick={() => a.edit(kind)}>
          <Plus size={17} />
          New {kind === "company" ? "company" : "contact"}
        </Button>
      </div>
      <section className="panel records-panel">
        <div className="toolbar">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder={`Search ${title.toLowerCase()}…`}
          />
          <select
            aria-label={
              kind === "company" ? "Filter industry" : "Filter company"
            }
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">
              {kind === "company" ? "All industries" : "All companies"}
            </option>
            {kind === "company"
              ? [
                  ...new Set([
                    ...INDUSTRIES,
                    ...s.companies.map((c) => c.industry),
                  ]),
                ].map((i) => <option key={i}>{i}</option>)
              : s.companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
          </select>
          <select
            aria-label="Record status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="active">Active records</option>
            <option value="archived">Archived records</option>
          </select>
          <select
            className="mobile-sort"
            aria-label="Sort records"
            value={`${sort}${descending ? "-desc" : ""}`}
            onChange={(e) => {
              setSort(e.target.value.replace("-desc", ""));
              setDescending(e.target.value.endsWith("-desc"));
            }}
          >
            <option value="name">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
            <option value="other">
              {kind === "company" ? "Location A–Z" : "Company A–Z"}
            </option>
            <option value="createdAt-desc">Newest first</option>
          </select>
          <div className="toolbar-actions">
            <Button onClick={onImport}>
              <Upload size={15} />
              Import
            </Button>
            <Button onClick={exportRows}>
              <Download size={15} />
              Export
            </Button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="record-table">
            <thead>
              <tr>
                <th>
                  <button
                    onClick={() => {
                      setSort("name");
                      setDescending(sort === "name" ? !descending : false);
                    }}
                  >
                    {kind === "company" ? "Company" : "Name"}
                    <ArrowUpDown size={12} />
                  </button>
                </th>
                <th>{kind === "company" ? "Industry" : "Email"}</th>
                <th>
                  <button
                    onClick={() => {
                      setSort("other");
                      setDescending(sort === "other" ? !descending : false);
                    }}
                  >
                    {kind === "company" ? "Location" : "Company"}
                    <ArrowUpDown size={12} />
                  </button>
                </th>
                <th>{kind === "company" ? "Open pipeline" : "Job title"}</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((r, i) => (
                <tr key={r.id}>
                  <td data-label={kind === "company" ? "Company" : "Name"}>
                    <button
                      className="record-name"
                      onClick={() => a.openRecord({ kind, id: r.id })}
                    >
                      <Avatar name={r.name} color={i} small />
                      <span>
                        <strong>{r.name}</strong>
                        {kind === "company" && (
                          <small>
                            {
                              s.contacts.filter(
                                (c) => c.companyId === r.id && !c.archived,
                              ).length
                            }{" "}
                            contacts
                          </small>
                        )}
                      </span>
                      {"pinned" in r && r.pinned && <Pin size={12} />}
                    </button>
                  </td>
                  <td data-label={kind === "company" ? "Industry" : "Email"}>
                    {kind === "company" ? (
                      <select
                        className="inline-select"
                        aria-label={`Industry for ${r.name}`}
                        value={(r as Company).industry}
                        onChange={(e) => patch(r, { industry: e.target.value })}
                      >
                        {[
                          ...new Set([...INDUSTRIES, (r as Company).industry]),
                        ].map((i) => (
                          <option key={i}>{i}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="wrap-text">{(r as Contact).email}</span>
                    )}
                  </td>
                  <td data-label={kind === "company" ? "Location" : "Company"}>
                    {kind === "company" ? (
                      (r as Company).city || "—"
                    ) : (
                      <button
                        className="subtle-link"
                        onClick={() =>
                          a.openRecord({
                            kind: "company",
                            id: (r as Contact).companyId,
                          })
                        }
                      >
                        {
                          s.companies.find(
                            (c) => c.id === (r as Contact).companyId,
                          )?.name
                        }
                        <ArrowUpRight size={12} />
                      </button>
                    )}
                  </td>
                  <td
                    data-label={
                      kind === "company" ? "Open pipeline" : "Job title"
                    }
                  >
                    {kind === "company" ? (
                      <strong className="table-money">
                        {money(
                          s.deals
                            .filter(
                              (d) =>
                                d.companyId === r.id &&
                                !d.archived &&
                                !["Won", "Lost"].includes(d.stage),
                            )
                            .reduce((n, d) => n + d.amount, 0),
                        )}
                      </strong>
                    ) : (
                      <InlineText
                        label={`job title for ${r.name}`}
                        value={(r as Contact).role}
                        onSave={(v) => patch(r, { role: v })}
                      />
                    )}
                  </td>
                  <td>
                    <IconButton
                      label={`Edit ${r.name}`}
                      icon={Pencil}
                      onClick={() => a.edit(kind, r)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length && (
            <Empty title={`No ${title.toLowerCase()} here yet.`}>
              Change the filters or add a new{" "}
              {kind === "company" ? "company" : "contact"}.
            </Empty>
          )}
        </div>
        <div className="panel-footer">
          <span>
            {items.length} {title.toLowerCase()} ·{" "}
            {status === "active"
              ? "Active workspace"
              : "Relationships preserved"}
          </span>
          <span className="small-copy">Changes save automatically</span>
        </div>
      </section>
    </>
  );
}
