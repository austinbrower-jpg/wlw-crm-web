"use client";
import { useState } from "react";
import { Search, ArrowUpRight } from "lucide-react";
import { collection, type Workspace, type Kind } from "@/lib/domain";
import { Modal, RecordIcon, Empty } from "./ui";
import type { AppActions } from "./actions";
export function CommandPalette({
  s,
  a,
  onClose,
}: {
  s: Workspace;
  a: AppActions;
  onClose: () => void;
}) {
  const [query, setQuery] = useState(""),
    [active, setActive] = useState(0);
  const commands = [
    {
      label: "Create a deal",
      caption: "Start a new opportunity",
      kind: "deal" as Kind,
      run: () => a.edit("deal"),
    },
    {
      label: "Add a task",
      caption: "Give it a next step",
      kind: "task" as Kind,
      run: () => a.edit("task"),
    },
    {
      label: "Add a company",
      caption: "Build a new relationship",
      kind: "company" as Kind,
      run: () => a.edit("company"),
    },
    {
      label: "Add a contact",
      caption: "Meet your next connection",
      kind: "contact" as Kind,
      run: () => a.edit("contact"),
    },
  ];
  const records = (["company", "contact", "deal", "task"] as Kind[]).flatMap(
    (kind) =>
      collection(s, kind).map((r) => ({
        label: "name" in r ? r.name : r.title,
        caption: `${kind}${r.archived ? " · archived" : ""}${"companyId" in r ? ` · ${s.companies.find((c) => c.id === r.companyId)?.name}` : ""}`,
        kind,
        run: () => a.openRecord({ kind, id: r.id }),
      })),
  );
  const options = (
    query
      ? [...commands, ...records].filter((o) =>
          `${o.label} ${o.caption}`.toLowerCase().includes(query.toLowerCase()),
        )
      : commands
  ).slice(0, 12);
  function select(index: number) {
    if (options[index]) {
      onClose();
      options[index].run();
    }
  }
  return (
    <Modal
      title="Find your next move"
      onClose={onClose}
      className="command-modal"
    >
      <div className="command-input">
        <Search size={21} />
        <input
          data-autofocus="true"
          role="combobox"
          aria-label="Search records and actions"
          aria-controls="command-results"
          aria-expanded="true"
          aria-activedescendant={
            options.length ? `command-${active}` : undefined
          }
          autoFocus
          placeholder="Search companies, people, deals, or actions…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((v) => (v + 1) % Math.max(options.length, 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive(
                (v) => (v - 1 + options.length) % Math.max(options.length, 1),
              );
            }
            if (e.key === "Enter") {
              e.preventDefault();
              select(active);
            }
          }}
        />
        <kbd>esc</kbd>
      </div>
      <div className="command-label">
        {query ? "MATCHING RECORDS & ACTIONS" : "QUICK ACTIONS"}
      </div>
      <div className="command-results" id="command-results" role="listbox">
        {options.map((o, i) => (
          <button
            role="option"
            aria-selected={active === i}
            id={`command-${i}`}
            key={`${o.kind}-${o.label}-${i}`}
            onMouseEnter={() => setActive(i)}
            onClick={() => select(i)}
          >
            <span className="command-icon">
              <RecordIcon kind={o.kind} />
            </span>
            <span>
              <strong>{o.label}</strong>
              <small>{o.caption}</small>
            </span>
            <ArrowUpRight size={16} />
          </button>
        ))}
        {!options.length && (
          <Empty title="No matches yet.">
            Try a company name, deal, or “add task”.
          </Empty>
        )}
      </div>
      <div className="command-footer">
        <span>
          <kbd>↑</kbd>
          <kbd>↓</kbd> navigate
        </span>
        <span>
          <kbd>↵</kbd> open
        </span>
        <span>⌘ / Ctrl K to search</span>
      </div>
    </Modal>
  );
}
