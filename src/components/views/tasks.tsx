"use client";
import { useState } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  List,
  CalendarDays,
  CheckCheck,
} from "lucide-react";
import {
  localDay,
  formatDate,
  recordName,
  PRIORITIES,
  type Workspace,
} from "@/lib/domain";
import { Button, Empty, IconButton, SearchField } from "../ui";
import type { AppActions } from "../actions";
import { TaskRow } from "./task-row";
export function TasksView({ s, a }: { s: Workspace; a: AppActions }) {
  const [view, setView] = useState<"list" | "calendar">("list"),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("open"),
    [priority, setPriority] = useState("all"),
    [month, setMonth] = useState(localDay().slice(0, 7)),
    [selected, setSelected] = useState(localDay());
  const today = localDay();
  const tasks = s.tasks
    .filter(
      (t) =>
        (filter === "archived" ? t.archived : !t.archived) &&
        (filter === "done"
          ? t.done
          : filter === "open"
            ? !t.done
            : filter === "overdue"
              ? !t.done && t.due < today
              : filter === "today"
                ? !t.done && t.due === today
                : true) &&
        (priority === "all" || t.priority === priority) &&
        `${t.title} ${t.record ? recordName(s, t.record) : ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort(
      (a, b) =>
        a.due.localeCompare(b.due) ||
        PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority),
    );
  function shiftMonth(n: number) {
    const d = new Date(month + "-01T12:00:00");
    d.setMonth(d.getMonth() + n);
    setMonth(localDay(d).slice(0, 7));
    setSelected(localDay(d));
  }
  const start = new Date(month + "-01T12:00:00"),
    offset = (start.getDay() + 6) % 7,
    days = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const displayTasks =
    view === "calendar" ? tasks.filter((t) => t.due === selected) : tasks;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">A PLAN YOU CAN ACT ON</div>
          <h1>
            Tasks & follow-ups<span className="cobalt">.</span>
          </h1>
          <p>Nothing slips through when every next step has a place.</p>
        </div>
        <Button variant="primary" onClick={() => a.edit("task")}>
          <Plus size={17} />
          New task
        </Button>
      </div>
      <section className="panel">
        <div className="toolbar">
          <div className="segmented">
            <button
              className={view === "list" ? "active" : ""}
              onClick={() => setView("list")}
            >
              <List size={16} />
              List
            </button>
            <button
              className={view === "calendar" ? "active" : ""}
              onClick={() => setView("calendar")}
            >
              <CalendarDays size={16} />
              Calendar
            </button>
          </div>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search tasks…"
          />
          <select
            aria-label="Task status filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="open">Open tasks</option>
            <option value="today">Due today</option>
            <option value="overdue">Overdue</option>
            <option value="done">Completed</option>
            <option value="all">All active tasks</option>
            <option value="archived">Archived</option>
          </select>
          <select
            aria-label="Priority filter"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="all">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        {view === "calendar" && (
          <div className="calendar">
            <div className="calendar-heading">
              <h2>
                {start.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <div>
                <Button
                  onClick={() => {
                    setMonth(today.slice(0, 7));
                    setSelected(today);
                  }}
                >
                  Today
                </Button>
                <IconButton
                  icon={ChevronLeft}
                  label="Previous month"
                  onClick={() => shiftMonth(-1)}
                />
                <IconButton
                  icon={ChevronRight}
                  label="Next month"
                  onClick={() => shiftMonth(1)}
                />
              </div>
            </div>
            <div className="calendar-grid">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <span className="calendar-weekday" key={d}>
                  {d}
                </span>
              ))}
              {Array.from({ length: offset }, (_, i) => (
                <span className="calendar-blank" key={`blank${i}`} />
              ))}
              {Array.from({ length: days }, (_, i) => {
                const day = `${month}-${String(i + 1).padStart(2, "0")}`,
                  count = tasks.filter((t) => t.due === day).length;
                return (
                  <button
                    key={day}
                    className={`calendar-day ${day === selected ? "selected" : ""} ${day === today ? "is-today" : ""}`}
                    aria-label={`${formatDate(day, true)}, ${count} tasks`}
                    aria-pressed={selected === day}
                    onClick={() => setSelected(day)}
                  >
                    <span>{i + 1}</span>
                    {count > 0 && (
                      <span className="calendar-task-count">
                        <span className="dot" />
                        <b>
                          {count} {count === 1 ? "task" : "tasks"}
                        </b>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="selected-date-heading">
              <h3>{formatDate(selected, true)}</h3>
              <Button
                onClick={() => a.edit("task", undefined, { due: selected })}
              >
                <Plus size={14} />
                Add task
              </Button>
            </div>
          </div>
        )}
        <div className="full-task-list">
          {displayTasks.map((t) => (
            <TaskRow key={t.id} t={t} s={s} a={a} />
          ))}
          {!displayTasks.length && (
            <Empty
              title={
                view === "calendar"
                  ? "A little breathing room."
                  : "You’re all caught up."
              }
            >
              {view === "calendar"
                ? "Select a date or add a task for this day."
                : "Change a filter or add your next action."}
            </Empty>
          )}
        </div>
        <div className="panel-footer">
          <span>
            {displayTasks.length} tasks{" "}
            {view === "calendar" ? "on this date" : "in this view"}
          </span>
          <span className="small-copy">
            <CheckCheck size={13} />
            Progress, one step at a time.
          </span>
        </div>
      </section>
    </>
  );
}
