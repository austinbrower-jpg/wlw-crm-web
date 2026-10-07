"use client";
import { Check, Clock3, MoreHorizontal } from "lucide-react";
import {
  localDay,
  formatDate,
  recordName,
  type Workspace,
  type Task,
} from "@/lib/domain";
import { IconButton } from "../ui";
import type { AppActions } from "../actions";
export function TaskRow({ t, s, a }: { t: Task; s: Workspace; a: AppActions }) {
  const today = localDay();
  const due =
    t.due < today ? "Overdue" : t.due === today ? "Today" : formatDate(t.due);
  return (
    <div className={`task-row ${t.done ? "completed" : ""}`}>
      <button
        className={`task-check ${t.done ? "checked" : ""}`}
        aria-label={`${t.done ? "Reopen" : "Complete"} ${t.title}`}
        onClick={() => a.toggleTask(t.id)}
      >
        {t.done && <Check size={13} />}
      </button>
      <div className="task-main">
        <button
          className="task-title"
          onClick={() => a.openRecord({ kind: "task", id: t.id })}
        >
          {t.title}
        </button>
        {t.record ? (
          <button
            className="task-relation"
            onClick={() => a.openRecord(t.record!)}
          >
            {recordName(s, t.record)}
          </button>
        ) : (
          <span className="task-relation muted">Workspace task</span>
        )}
      </div>
      <span
        className={`due-label ${t.due < today && !t.done ? "overdue" : ""}`}
      >
        <Clock3 size={13} />
        {due}
      </span>
      <span className={`priority priority-${t.priority.toLowerCase()}`}>
        <span className="dot" />
        {t.priority}
      </span>
      <IconButton
        label={`Edit ${t.title}`}
        icon={MoreHorizontal}
        onClick={() => a.edit("task", t)}
      />
    </div>
  );
}
