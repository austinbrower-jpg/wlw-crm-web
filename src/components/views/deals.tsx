"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  Plus,
  Clock3,
  Download,
  LayoutGrid,
  List,
  MoreHorizontal,
} from "lucide-react";
import {
  localDay,
  money,
  formatDate,
  STAGES,
  PROBABILITIES,
  type Workspace,
  type Stage,
} from "@/lib/domain";
import { downloadCSV } from "@/lib/csv";
import { Avatar, Button, Empty, IconButton, SearchField } from "../ui";
import type { AppActions } from "../actions";
export function DealsView({ s, a }: { s: Workspace; a: AppActions }) {
  const [view, setView] = useState<"board" | "list">("board"),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [status, setStatus] = useState("active"),
    [sort, setSort] = useState("value"),
    [dragging, setDragging] = useState<string | null>(null),
    [over, setOver] = useState<string | null>(null);
  const deals = s.deals
    .filter(
      (d) =>
        (status === "archived") === d.archived &&
        (filter === "all" || d.stage === filter) &&
        `${d.name} ${s.companies.find((c) => c.id === d.companyId)?.name} ${s.contacts.find((c) => c.id === d.contactId)?.name}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "value"
        ? b.amount - a.amount
        : sort === "date"
          ? a.expectedClose.localeCompare(b.expectedClose)
          : a.name.localeCompare(b.name),
    );
  const stageSelect = (d: (typeof deals)[number]) => (
    <select
      className={`stage-select stage-${d.stage.toLowerCase()}`}
      aria-label={`Stage for ${d.name}`}
      value={d.stage}
      onChange={(e) => a.changeStage(d.id, e.target.value as Stage)}
    >
      {STAGES.map((st) => (
        <option key={st}>{st}</option>
      ))}
    </select>
  );
  const nextTask = (id: string) =>
    s.tasks
      .filter(
        (t) =>
          !t.done &&
          !t.archived &&
          t.record?.kind === "deal" &&
          t.record.id === id,
      )
      .sort((a, b) => a.due.localeCompare(b.due))[0];
  function exportRows() {
    downloadCSV(
      "relay-deals.csv",
      [
        "name",
        "company",
        "contact",
        "amount_usd",
        "stage",
        "expected_close",
        "actual_close",
      ],
      deals.map((d) => [
        d.name,
        s.companies.find((c) => c.id === d.companyId)?.name,
        s.contacts.find((c) => c.id === d.contactId)?.name,
        d.amount,
        d.stage,
        d.expectedClose,
        d.closedAt,
      ]),
    );
    a.notify(`Exported ${deals.length} filtered deals.`);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">FROM FIRST CONVERSATION TO CLOSED DEAL</div>
          <h1>
            Your pipeline<span className="cobalt">.</span>
          </h1>
          <p>A clear view of what’s moving, and what needs a nudge.</p>
        </div>
        <Button variant="primary" onClick={() => a.edit("deal")}>
          <Plus size={17} />
          New deal
        </Button>
      </div>
      <div className="deal-toolbar">
        <div className="segmented" aria-label="Deal view">
          <button
            className={view === "board" ? "active" : ""}
            onClick={() => setView("board")}
          >
            <LayoutGrid size={15} />
            Board
          </button>
          <button
            className={view === "list" ? "active" : ""}
            onClick={() => setView("list")}
          >
            <List size={16} />
            Table
          </button>
        </div>
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search deals…"
        />
        <select
          aria-label="Filter stage"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All stages</option>
          {STAGES.map((st) => (
            <option key={st}>{st}</option>
          ))}
        </select>
        <select
          aria-label="Deal status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        <select
          aria-label="Sort deals"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="value">Highest value</option>
          <option value="date">Close date</option>
          <option value="name">Name A–Z</option>
        </select>
        <IconButton
          icon={Download}
          label="Export filtered deals"
          onClick={exportRows}
        />
      </div>
      <div className="deal-summary-line">
        <span>
          <strong>{deals.length}</strong> opportunities ·{" "}
          <strong>
            {money(
              deals
                .filter((d) => !["Won", "Lost"].includes(d.stage))
                .reduce((n, d) => n + d.amount, 0),
            )}
          </strong>{" "}
          open value
        </span>
        <span>Lead 10% · Qualified 30% · Proposal 60% · Negotiation 80%</span>
      </div>
      {view === "board" ? (
        <div className="pipeline-board" aria-label="Deal pipeline" tabIndex={0}>
          {STAGES.filter((st) => filter === "all" || st === filter).map(
            (st) => {
              const cards = deals.filter((d) => d.stage === st);
              return (
                <section
                  key={st}
                  className={`kanban-column ${over === st ? "drag-over" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOver(st);
                  }}
                  onDragLeave={() => setOver(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("text/relay-deal");
                    if (id && s.deals.some((d) => d.id === id))
                      a.changeStage(id, st);
                    setDragging(null);
                    setOver(null);
                  }}
                >
                  <div className="column-heading">
                    <h2>
                      <span className={`stage-dot ${st.toLowerCase()}`} />
                      {st}
                      <span>{cards.length}</span>
                    </h2>
                    <IconButton
                      icon={Plus}
                      label={`New ${st} deal`}
                      onClick={() => a.edit("deal", undefined, { stage: st })}
                    />
                  </div>
                  <div className="column-value">
                    {money(cards.reduce((n, d) => n + d.amount, 0))}
                    <span>
                      {["Won", "Lost"].includes(st)
                        ? "closed value"
                        : `${PROBABILITIES[st] * 100}% probability`}
                    </span>
                  </div>
                  <div className="kanban-cards">
                    {cards.map((d) => {
                      const company = s.companies.find(
                          (c) => c.id === d.companyId,
                        ),
                        contact = s.contacts.find((c) => c.id === d.contactId),
                        task = nextTask(d.id);
                      return (
                        <article
                          key={d.id}
                          className={`deal-card ${dragging === d.id ? "dragging" : ""}`}
                          draggable={!d.archived}
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/relay-deal", d.id);
                            setDragging(d.id);
                          }}
                          onDragEnd={() => {
                            setDragging(null);
                            setOver(null);
                          }}
                        >
                          <div className="deal-company">
                            <Avatar
                              name={company?.name ?? ""}
                              small
                              color={s.companies.findIndex(
                                (c) => c.id === d.companyId,
                              )}
                            />
                            <span>{company?.name}</span>
                            <IconButton
                              icon={MoreHorizontal}
                              label={`Edit ${d.name}`}
                              onClick={() => a.edit("deal", d)}
                            />
                          </div>
                          <button
                            className="deal-card-title"
                            onClick={() =>
                              a.openRecord({ kind: "deal", id: d.id })
                            }
                          >
                            {d.name}
                          </button>
                          <strong className="deal-card-value">
                            {money(d.amount)}
                          </strong>
                          <div className="deal-card-contact">
                            <span>
                              {contact?.name ?? "No contact assigned"}
                            </span>
                            <span>{formatDate(d.expectedClose)}</span>
                          </div>
                          {task ? (
                            <button
                              className={`deal-followup ${task.due < localDay() ? "overdue-text" : ""}`}
                              onClick={() =>
                                a.openRecord({ kind: "task", id: task.id })
                              }
                            >
                              <Clock3 size={13} />
                              <span>{task.title}</span>
                            </button>
                          ) : (
                            <button
                              className="deal-followup"
                              onClick={() =>
                                a.edit("task", undefined, {
                                  recordKind: "deal",
                                  recordId: d.id,
                                })
                              }
                            >
                              <Plus size={13} />
                              Add a next step
                            </button>
                          )}
                          <div className="deal-stage-control">
                            {stageSelect(d)}
                          </div>
                        </article>
                      );
                    })}
                    {!cards.length && (
                      <div className="column-empty">
                        {dragging
                          ? "Drop deal here"
                          : "Room for the next opportunity."}
                      </div>
                    )}
                  </div>
                </section>
              );
            },
          )}
        </div>
      ) : (
        <section className="panel">
          <div className="table-wrap">
            <table className="record-table deals-table">
              <thead>
                <tr>
                  <th>Deal / company</th>
                  <th>Contact</th>
                  <th>Value</th>
                  <th>Stage</th>
                  <th>Expected close</th>
                  <th>Next action</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((d) => (
                  <tr key={d.id}>
                    <td data-label="Deal">
                      <button
                        className="record-name"
                        onClick={() => a.openRecord({ kind: "deal", id: d.id })}
                      >
                        <span>
                          <strong>{d.name}</strong>
                          <small>
                            {
                              s.companies.find((c) => c.id === d.companyId)
                                ?.name
                            }
                          </small>
                        </span>
                      </button>
                    </td>
                    <td data-label="Contact">
                      {s.contacts.find((c) => c.id === d.contactId)?.name ??
                        "—"}
                    </td>
                    <td data-label="Value">
                      <strong>{money(d.amount)}</strong>
                    </td>
                    <td data-label="Stage">{stageSelect(d)}</td>
                    <td data-label="Expected close">
                      {formatDate(d.expectedClose)}
                    </td>
                    <td data-label="Next action">
                      {nextTask(d.id) ? (
                        <button
                          className="subtle-link"
                          onClick={() =>
                            a.openRecord({
                              kind: "task",
                              id: nextTask(d.id)!.id,
                            })
                          }
                        >
                          {formatDate(nextTask(d.id)!.due)}
                          <ArrowUpRight size={13} />
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!deals.length && (
              <Empty title="No opportunities match.">
                Try another search or start a new deal.
              </Empty>
            )}
          </div>
        </section>
      )}
      <p className="board-hint">
        Move a deal by dragging its card or using its stage menu. Stage changes
        can be undone.
      </p>
    </>
  );
}
