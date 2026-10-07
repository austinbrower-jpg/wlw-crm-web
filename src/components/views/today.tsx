"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  ChevronRight,
  Pin,
  LayoutGrid,
  CalendarDays,
  CircleDollarSign,
  Target,
  TrendingUp,
  CircleCheck,
  Phone,
  StickyNote,
} from "lucide-react";
import {
  metrics,
  localDay,
  money,
  recordName,
  STAGES,
  type Workspace,
} from "@/lib/domain";
import { Avatar, Button, Empty, IconButton, ArrowLink } from "../ui";
import type { AppActions } from "../actions";
import { TaskRow } from "./task-row";
export function TodayView({ s, a }: { s: Workspace; a: AppActions }) {
  const [period, setPeriod] = useState<"month" | "all">("month"),
    [tab, setTab] = useState<"today" | "upcoming" | "done">("today");
  const m = metrics(s, period),
    today = localDay();
  const tasks = s.tasks
    .filter(
      (t) =>
        !t.archived &&
        (tab === "done"
          ? t.done
          : !t.done && (tab === "today" ? t.due <= today : t.due > today)),
    )
    .sort(
      (a, b) =>
        a.due.localeCompare(b.due) || b.createdAt.localeCompare(a.createdAt),
    );
  const open = s.deals.filter(
    (d) => !d.archived && !["Won", "Lost"].includes(d.stage),
  );
  const pinned = s.companies.filter((c) => c.pinned && !c.archived);
  const activity = s.activities
    .filter(
      (ac) =>
        !s[
          (
            {
              company: "companies",
              contact: "contacts",
              deal: "deals",
              task: "tasks",
            } as const
          )[ac.record.kind]
        ].find((r) => r.id === ac.record.id)?.archived,
    )
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 4);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR DAILY WORKSPACE</div>
          <h1>
            Let’s move things forward<span className="cobalt">.</span>
          </h1>
          <p>Good relationships start with a thoughtful next step.</p>
        </div>
        <div className="heading-actions">
          <span className="today-date">
            <CalendarDays size={15} />
            {new Date(today + "T12:00:00").toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              weekday: "short",
            })}
          </span>
          <Button variant="primary" onClick={() => a.edit("deal")}>
            <Plus size={17} />
            New deal
          </Button>
        </div>
      </div>
      <div className="metrics-top">
        <span>AT A GLANCE</span>
        <label className="period-label">
          Won value{" "}
          <select
            aria-label="Won value period"
            value={period}
            onChange={(e) => setPeriod(e.target.value as "month" | "all")}
          >
            <option value="month">This month</option>
            <option value="all">All time</option>
          </select>
        </label>
      </div>
      <div className="metrics-grid">
        <div className="metric">
          <div className="metric-label">
            Open pipeline
            <CircleDollarSign size={17} />
          </div>
          <strong>{money(m.pipeline)}</strong>
          <span>
            <span className="mini-dot cobalt-bg" />
            {m.openCount} active opportunities
          </span>
        </div>
        <div className="metric">
          <div className="metric-label">
            Weighted forecast
            <Target size={17} />
          </div>
          <strong>{money(m.forecast)}</strong>
          <span>Based on stage probabilities</span>
        </div>
        <div className="metric">
          <div className="metric-label">
            Won {period === "month" ? "this month" : "to date"}
            <TrendingUp size={17} />
          </div>
          <strong>{money(m.won)}</strong>
          <span>
            <span className="mini-dot green-bg" />
            {m.wonCount} deals over the finish line
          </span>
        </div>
        <div className="metric">
          <div className="metric-label">
            Follow-ups due
            <CircleCheck size={17} />
          </div>
          <strong>
            {String(m.followups).padStart(2, "0")}
            <span className="metric-unit">tasks</span>
          </strong>
          <span>Your next moves, in one place</span>
        </div>
      </div>
      <div className="dashboard-grid">
        <section className="panel followups-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">MAKE THE NEXT MOVE</span>
              <h2>
                Your follow-ups{" "}
                <span className="count">
                  {
                    s.tasks.filter(
                      (t) => !t.done && !t.archived && t.due <= today,
                    ).length
                  }
                </span>
              </h2>
            </div>
            <IconButton
              label="Add follow-up"
              icon={Plus}
              onClick={() => a.edit("task")}
            />
          </div>
          <div className="tab-bar">
            <button
              className={tab === "today" ? "active" : ""}
              onClick={() => setTab("today")}
            >
              Due now <span>{m.followups}</span>
            </button>
            <button
              className={tab === "upcoming" ? "active" : ""}
              onClick={() => setTab("upcoming")}
            >
              Upcoming
            </button>
            <button
              className={tab === "done" ? "active" : ""}
              onClick={() => setTab("done")}
            >
              Completed
            </button>
          </div>
          <div className="task-list" tabIndex={0} aria-label="Follow-up tasks">
            {tasks.map((t) => (
              <TaskRow key={t.id} t={t} s={s} a={a} />
            ))}
            {!tasks.length && (
              <Empty
                title={
                  tab === "today"
                    ? "You’re all caught up."
                    : "Nothing here yet."
                }
              >
                Add a follow-up to keep the conversation moving.
              </Empty>
            )}
          </div>
          <div className="panel-footer">
            <span>
              {tab === "today"
                ? "A small step. A stronger relationship."
                : `${tasks.length} ${tab === "done" ? "completed" : "upcoming"} tasks`}
            </span>
            <ArrowLink onClick={() => a.navigate("tasks")}>
              View all tasks
            </ArrowLink>
          </div>
        </section>
        <section className="panel pipeline-summary">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">FROM HELLO TO HANDOFF</span>
              <h2>Pipeline snapshot</h2>
            </div>
            <span className="tiny-icon">
              <LayoutGrid size={18} />
            </span>
          </div>
          <div className="pipeline-total">
            <strong>{money(m.pipeline, true)}</strong>
            <span>across {m.openCount} open deals</span>
          </div>
          <div
            className="pipeline-strip"
            aria-label="Distribution of open deals"
          >
            {STAGES.slice(0, 4).map((st) => {
              const count = open.filter((d) => d.stage === st).length;
              return count > 0 ? (
                <span
                  key={st}
                  className={`strip-${st.toLowerCase()}`}
                  style={{ flex: count }}
                  title={`${st}: ${count} deals`}
                />
              ) : null;
            })}
          </div>
          <div className="stage-summary">
            {STAGES.slice(0, 4).map((st) => {
              const deals = open.filter((d) => d.stage === st);
              return (
                <div key={st}>
                  <span>
                    <i className={`stage-dot ${st.toLowerCase()}`} />
                    {st}
                    <small>{deals.length}</small>
                  </span>
                  <strong>
                    {money(
                      deals.reduce((n, d) => n + d.amount, 0),
                      true,
                    )}
                  </strong>
                </div>
              );
            })}
          </div>
          <div className="pipeline-footer">
            <Button onClick={() => a.navigate("deals")}>
              Open pipeline
              <ArrowUpRight size={16} />
            </Button>
          </div>
        </section>
        <section className="panel pinned-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">KEEP THEM CLOSE</span>
              <h2>Pinned companies</h2>
            </div>
            <ArrowLink onClick={() => a.navigate("companies")}>
              All companies
            </ArrowLink>
          </div>
          <div className="pinned-grid">
            {pinned.slice(0, 4).map((c, i) => {
              const deals = open.filter((d) => d.companyId === c.id);
              return (
                <button
                  key={c.id}
                  className="pinned-card"
                  onClick={() => a.openRecord({ kind: "company", id: c.id })}
                >
                  <div className="pinned-top">
                    <Avatar name={c.name} color={i} />
                    <Pin size={13} />
                  </div>
                  <h3>{c.name}</h3>
                  <p>{c.industry}</p>
                  <div>
                    <span>
                      {deals.length} open{" "}
                      {deals.length === 1 ? "deal" : "deals"}
                    </span>
                    <strong>
                      {money(
                        deals.reduce((n, d) => n + d.amount, 0),
                        true,
                      )}
                    </strong>
                  </div>
                </button>
              );
            })}
            {!pinned.length && (
              <Empty title="Keep a prospect close.">
                Pin a company from its record drawer.
              </Empty>
            )}
          </div>
        </section>
        <section className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">THE LATEST</span>
              <h2>Recent activity</h2>
            </div>
            <span className="live-dot" />
          </div>
          <div className="recent-activity">
            {activity.map((ac) => (
              <button key={ac.id} onClick={() => a.openRecord(ac.record)}>
                <span className={`recent-icon type-${ac.type}`}>
                  {ac.type === "call" ? (
                    <Phone size={15} />
                  ) : ac.type === "note" ? (
                    <StickyNote size={15} />
                  ) : (
                    <ArrowRight size={15} />
                  )}
                </span>
                <span>
                  <strong>{recordName(s, ac.record)}</strong>
                  <small>{ac.text}</small>
                </span>
                <ChevronRight size={13} />
              </button>
            ))}
          </div>
        </section>
      </div>
      <div className="workspace-footnote">
        <span>
          <span className="mini-dot green-bg" />A little more organized. A
          little more forward.
        </span>
        <button onClick={() => a.navigate("settings")}>
          About this demo
          <ArrowUpRight size={12} />
        </button>
      </div>
    </>
  );
}
