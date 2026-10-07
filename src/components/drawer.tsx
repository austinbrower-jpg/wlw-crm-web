"use client";
import { useState, type FormEvent } from "react";
import {
  Pin,
  Pencil,
  Archive,
  RotateCcw,
  Plus,
  ArrowUpRight,
  Phone,
  StickyNote,
  CircleCheck,
  Clock3,
  Globe,
  MapPin,
  Mail,
  ChevronRight,
} from "lucide-react";
import {
  collection,
  recordName,
  money,
  formatDate,
  STAGES,
  localDay,
  type Workspace,
  type RecordRef,
  type Deal,
  type Company,
  type Contact,
  type Task,
} from "@/lib/domain";
import { commit } from "@/lib/store";
import { activity, saveRecord, archiveRecord } from "@/lib/repository";
import {
  Avatar,
  Button,
  Empty,
  IconButton,
  Modal,
  StageBadge,
  RecordIcon,
} from "./ui";
import type { AppActions } from "./actions";
export function RecordDrawer({
  refValue,
  s,
  a,
  onClose,
  stageUndo,
}: {
  refValue: RecordRef;
  s: Workspace;
  a: AppActions;
  onClose: () => void;
  stageUndo?: () => void;
}) {
  const [note, setNote] = useState(""),
    [noteType, setNoteType] = useState<"note" | "call">("note");
  const r = collection(s, refValue.kind).find((r) => r.id === refValue.id);
  if (!r) return null;
  const name = "name" in r ? r.name : r.title;
  const companyId =
    "companyId" in r ? r.companyId : refValue.kind === "company" ? r.id : null;
  const company = s.companies.find((c) => c.id === companyId);
  const deal = refValue.kind === "deal" ? (r as Deal) : null;
  const contact = refValue.kind === "contact" ? (r as Contact) : null;
  const task = refValue.kind === "task" ? (r as Task) : null;
  const relatedDeals = s.deals.filter(
    (d) =>
      !d.archived &&
      (refValue.kind === "company"
        ? d.companyId === r.id
        : refValue.kind === "contact"
          ? d.contactId === r.id
          : false),
  );
  const relatedContacts = s.contacts.filter(
    (c) => !c.archived && refValue.kind === "company" && c.companyId === r.id,
  );
  const tasks = s.tasks
    .filter(
      (t) =>
        !t.archived &&
        !t.done &&
        t.record?.id === r.id &&
        t.record.kind === refValue.kind,
    )
    .sort((a, b) => a.due.localeCompare(b.due));
  const timeline = s.activities
    .filter((ac) => ac.record.id === r.id && ac.record.kind === refValue.kind)
    .sort((a, b) => b.at.localeCompare(a.at));
  function submitNote(e: FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    commit((s) => activity(s, refValue, note.trim(), noteType));
    setNote("");
    a.notify(noteType === "call" ? "Call logged." : "Note added.");
  }
  return (
    <Modal drawer title="Record overview" onClose={onClose}>
      <div className="drawer-content">
        <div className="record-identity">
          <Avatar
            name={name}
            color={
              refValue.kind === "deal" ? 3 : refValue.kind === "company" ? 0 : 2
            }
          />
          <div>
            <span className="eyebrow">
              {refValue.kind}
              {r.archived ? " · Archived" : ""}
            </span>
            <h2>{name}</h2>
            {company && refValue.kind !== "company" && (
              <button
                className="subtle-link"
                onClick={() =>
                  a.openRecord({ kind: "company", id: company.id })
                }
              >
                {company.name}
                <ArrowUpRight size={13} />
              </button>
            )}
          </div>
          {"pinned" in r && (
            <IconButton
              icon={Pin}
              label={r.pinned ? "Unpin record" : "Pin record"}
              aria-pressed={r.pinned}
              onClick={() =>
                commit((s) =>
                  saveRecord(s, refValue.kind, { ...r, pinned: !r.pinned }),
                )
              }
            />
          )}
        </div>
        <div className="record-actions">
          <Button onClick={() => a.edit(refValue.kind, r)}>
            <Pencil size={15} />
            Edit details
          </Button>
          {r.archived ? (
            <Button
              onClick={() => {
                commit((s) => archiveRecord(s, refValue, false));
                a.notify("Record restored.");
              }}
            >
              <RotateCcw size={15} />
              Restore record
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => a.archive(refValue)}>
              <Archive size={15} />
              Archive
            </Button>
          )}
        </div>
        {r.archived && (
          <p className="notice">
            This record is archived. Its notes and relationships are preserved.
          </p>
        )}
        {deal && (
          <div className="deal-detail">
            <div>
              <span>Opportunity value</span>
              <strong>{money(deal.amount)}</strong>
            </div>
            <label className="field">
              <span>Pipeline stage</span>
              <select
                aria-label="Pipeline stage"
                value={deal.stage}
                onChange={(e) =>
                  a.changeStage(deal.id, e.target.value as Deal["stage"])
                }
              >
                {STAGES.map((st) => (
                  <option key={st}>{st}</option>
                ))}
              </select>
            </label>
            {stageUndo && (
              <Button variant="ghost" onClick={stageUndo}>
                <RotateCcw size={14} />
                Undo stage change
              </Button>
            )}
            <dl className="details-list">
              <div>
                <dt>Expected close</dt>
                <dd>{formatDate(deal.expectedClose, true)}</dd>
              </div>
              {deal.closedAt && (
                <div>
                  <dt>Actual close</dt>
                  <dd>{formatDate(deal.closedAt, true)}</dd>
                </div>
              )}
              <div>
                <dt>Primary contact</dt>
                <dd>
                  {deal.contactId ? (
                    <button
                      className="text-link"
                      onClick={() =>
                        a.openRecord({ kind: "contact", id: deal.contactId })
                      }
                    >
                      {s.contacts.find((c) => c.id === deal.contactId)?.name}
                      <ArrowUpRight size={14} />
                    </button>
                  ) : (
                    "Not assigned"
                  )}
                </dd>
              </div>
            </dl>
          </div>
        )}
        {refValue.kind === "company" && (
          <dl className="details-list">
            <div>
              <dt>Industry</dt>
              <dd>{(r as Company).industry}</dd>
            </div>
            <div>
              <dt>
                <MapPin size={14} />
                Location
              </dt>
              <dd>{(r as Company).city || "Not added"}</dd>
            </div>
            <div>
              <dt>
                <Globe size={14} />
                Website
              </dt>
              <dd className="wrap-text">
                {(r as Company).website || "Not added"}
              </dd>
            </div>
          </dl>
        )}
        {contact && (
          <dl className="details-list">
            <div>
              <dt>Job title</dt>
              <dd>{contact.role || "Not added"}</dd>
            </div>
            <div>
              <dt>
                <Mail size={14} />
                Email
              </dt>
              <dd className="wrap-text">{contact.email}</dd>
            </div>
            <div>
              <dt>
                <Phone size={14} />
                Phone
              </dt>
              <dd>{contact.phone || "Not added"}</dd>
            </div>
          </dl>
        )}
        {task && (
          <>
            <dl className="details-list">
              <div>
                <dt>Due date</dt>
                <dd>{formatDate(task.due, true)}</dd>
              </div>
              <div>
                <dt>Priority</dt>
                <dd>{task.priority}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{task.done ? "Completed" : "To do"}</dd>
              </div>
              {task.record && (
                <div>
                  <dt>Related record</dt>
                  <dd>
                    <button
                      className="text-link"
                      onClick={() => a.openRecord(task.record!)}
                    >
                      {recordName(s, task.record)}
                      <ArrowUpRight size={14} />
                    </button>
                  </dd>
                </div>
              )}
            </dl>
            <Button variant="primary" onClick={() => a.toggleTask(task.id)}>
              <CircleCheck size={16} />
              {task.done ? "Reopen task" : "Complete task"}
            </Button>
          </>
        )}
        {refValue.kind !== "task" && (
          <section className="drawer-section">
            <div className="section-heading">
              <h3>
                Next actions <span className="count">{tasks.length}</span>
              </h3>
              <IconButton
                icon={Plus}
                label="Add linked task"
                onClick={() =>
                  a.edit("task", undefined, {
                    recordKind: refValue.kind,
                    recordId: refValue.id,
                  })
                }
              />
            </div>
            {tasks.length ? (
              tasks.map((t) => (
                <div key={t.id} className="drawer-task">
                  <button
                    className="task-check"
                    aria-label={`Complete ${t.title}`}
                    onClick={() => a.toggleTask(t.id)}
                  />
                  <button
                    className="drawer-task-body"
                    onClick={() => a.openRecord({ kind: "task", id: t.id })}
                  >
                    <strong>{t.title}</strong>
                    <span className={t.due < localDay() ? "overdue-text" : ""}>
                      {formatDate(t.due)} · {t.priority} priority
                    </span>
                  </button>
                  <ChevronRight size={15} />
                </div>
              ))
            ) : (
              <p className="muted small-copy">
                No open tasks. Give this relationship a next step.
              </p>
            )}
          </section>
        )}
        {(refValue.kind === "company" || refValue.kind === "contact") && (
          <section className="drawer-section">
            <div className="section-heading">
              <h3>
                Deals <span className="count">{relatedDeals.length}</span>
              </h3>
              <IconButton
                icon={Plus}
                label="Create linked deal"
                onClick={() =>
                  a.edit("deal", undefined, {
                    companyId,
                    contactId: contact?.id ?? "",
                  })
                }
              />
            </div>
            {relatedDeals.map((d) => (
              <button
                key={d.id}
                className="related-row"
                onClick={() => a.openRecord({ kind: "deal", id: d.id })}
              >
                <RecordIcon kind="deal" />
                <span>
                  <strong>{d.name}</strong>
                  <small>{money(d.amount)}</small>
                </span>
                <StageBadge stage={d.stage} />
              </button>
            ))}
            {!relatedDeals.length && (
              <p className="muted small-copy">No deals yet.</p>
            )}
          </section>
        )}
        {refValue.kind === "company" && (
          <section className="drawer-section">
            <div className="section-heading">
              <h3>
                Contacts <span className="count">{relatedContacts.length}</span>
              </h3>
              <IconButton
                icon={Plus}
                label="Create linked contact"
                onClick={() =>
                  a.edit("contact", undefined, { companyId: r.id })
                }
              />
            </div>
            {relatedContacts.map((c) => (
              <button
                className="related-row"
                key={c.id}
                onClick={() => a.openRecord({ kind: "contact", id: c.id })}
              >
                <Avatar name={c.name} small color={2} />
                <span>
                  <strong>{c.name}</strong>
                  <small>{c.role}</small>
                </span>
                <ChevronRight size={15} />
              </button>
            ))}
            {!relatedContacts.length && (
              <p className="muted small-copy">No contacts yet.</p>
            )}
          </section>
        )}
        <section className="drawer-section">
          <div className="section-heading">
            <h3>Activity & notes</h3>
            <span className="small-copy muted">{timeline.length} updates</span>
          </div>
          <form className="note-form" onSubmit={submitNote}>
            <div className="note-types">
              <button
                type="button"
                className={noteType === "note" ? "active" : ""}
                onClick={() => setNoteType("note")}
              >
                <StickyNote size={14} />
                Note
              </button>
              <button
                type="button"
                className={noteType === "call" ? "active" : ""}
                onClick={() => setNoteType("call")}
              >
                <Phone size={14} />
                Log a call
              </button>
            </div>
            <textarea
              aria-label="Activity note"
              placeholder={
                noteType === "note"
                  ? "Add some context for your next conversation…"
                  : "What did you discuss?"
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={4000}
              required
            />
            <div className="note-footer">
              <Button variant="primary" type="submit" disabled={!note.trim()}>
                {noteType === "note" ? "Add note" : "Log call"}
              </Button>
            </div>
          </form>
          <div className="timeline">
            {timeline.map((ac) => (
              <div className="timeline-entry" key={ac.id}>
                <span className={`timeline-dot type-${ac.type}`}>
                  {ac.type === "call" ? (
                    <Phone size={13} />
                  ) : ac.type === "note" ? (
                    <StickyNote size={13} />
                  ) : ac.type === "task" ? (
                    <CircleCheck size={13} />
                  ) : (
                    <Clock3 size={13} />
                  )}
                </span>
                <div>
                  <p>{ac.text}</p>
                  <time dateTime={ac.at}>
                    {new Date(ac.at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    at{" "}
                    {new Date(ac.at).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
              </div>
            ))}
            {!timeline.length && (
              <Empty title="The story starts here.">
                Add a note or log your first call.
              </Empty>
            )}
          </div>
        </section>
      </div>
    </Modal>
  );
}
