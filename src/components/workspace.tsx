"use client";
import { useEffect, useState } from "react";
import {
  PanelLeft,
  Sun,
  Building2,
  UsersRound,
  Handshake,
  CheckSquare,
  Settings2,
  Search,
  ArrowRight,
  X,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  Check,
  RotateCcw,
  Archive,
  CircleHelp,
  Database,
  type LucideIcon,
} from "lucide-react";
import { useWorkspace, commit, resetWorkspace } from "@/lib/store";
import {
  archiveRecord,
  completeTask,
  moveDeal,
  undoMove,
  createHandoff,
} from "@/lib/repository";
import {
  localDay,
  recordName,
  type Screen,
  type RecordRef,
  type Deal,
} from "@/lib/domain";
import { TodayView, RecordsView, DealsView, TasksView } from "./views";
import { RecordForm, type Editor } from "./forms";
import { RecordDrawer } from "./drawer";
import { Importer } from "./importer";
import { Button, IconButton, Modal, Avatar } from "./ui";
import type { AppActions } from "./actions";
import { CommandPalette } from "./command-palette";
import { SettingsView } from "./settings";
const screens: { id: Screen; label: string; icon: LucideIcon }[] = [
  { id: "today", label: "Today", icon: Sun },
  { id: "deals", label: "Deals", icon: Handshake },
  { id: "companies", label: "Companies", icon: Building2 },
  { id: "contacts", label: "Contacts", icon: UsersRound },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
];
type Toast = { message: string; undo?: () => void; recordId?: string };
export function WorkspaceApp() {
  const snapshot = useWorkspace();
  const [screen, setScreen] = useState<Screen>("today"),
    [selected, setSelected] = useState<RecordRef | null>(null),
    [editor, setEditor] = useState<Editor | null>(null),
    [command, setCommand] = useState(false),
    [mobile, setMobile] = useState(false),
    [importKind, setImportKind] = useState<"company" | "contact" | null>(null),
    [archive, setArchive] = useState<RecordRef | null>(null),
    [reset, setReset] = useState(false),
    [handoff, setHandoff] = useState<string | null>(null),
    [toast, setToast] = useState<Toast | null>(null);
  useEffect(() => {
    const sync = () => {
      const page = location.hash.slice(1);
      const next = [...screens.map((s) => s.id), "settings"].includes(page)
        ? (page as Screen)
        : "today";
      setScreen(next);
      setSelected(null);
      setEditor(null);
      setCommand(false);
      setMobile(false);
      setImportKind(null);
      setArchive(null);
      setReset(false);
      setHandoff(null);
      window.scrollTo({ top: 0, behavior: "auto" });
    };
    sync();
    window.addEventListener("hashchange", sync);
    const keyboard = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommand((v) => !v);
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("keydown", keyboard);
    };
  }, []);
  useEffect(() => {
    if (!toast || handoff) return;
    const id = setTimeout(() => setToast(null), toast.undo ? 10000 : 4500);
    return () => clearTimeout(id);
  }, [toast, handoff]);
  const notify = (message: string) => setToast({ message });
  const navigate = (next: Screen) => {
    setScreen(next);
    location.hash = next;
    setMobile(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const a: AppActions = {
    openRecord: (ref) => {
      setSelected(ref);
      setEditor(null);
    },
    edit: (kind, record, preset) => {
      setSelected(null);
      setEditor({ kind, record, preset });
    },
    changeStage: (id, stage) => {
      const previous = snapshot?.data.deals.find((d) => d.id === id);
      if (!previous || previous.stage === stage) return;
      commit((s) => moveDeal(s, id, stage));
      setToast({
        message: `${previous.name} moved to ${stage}.`,
        recordId: previous.id,
        undo: () => {
          commit((s) => undoMove(s, previous));
          setHandoff(null);
          notify("Stage change undone.");
        },
      });
      if (stage === "Won") setHandoff(id);
    },
    toggleTask: (id) => {
      const t = snapshot?.data.tasks.find((t) => t.id === id);
      commit((s) => completeTask(s, id));
      notify(
        t?.done ? "Task reopened." : "One more step forward. Task completed.",
      );
    },
    archive: setArchive,
    notify,
    navigate,
  };
  const nav = (isMobile = false) => (
    <nav
      className="main-nav"
      aria-label={isMobile ? "Mobile navigation" : "Main navigation"}
    >
      {screens.map(({ id, label, icon: Icon }) => (
        <a
          key={id}
          href={`#${id}`}
          className={screen === id ? "active" : ""}
          aria-current={screen === id ? "page" : undefined}
          onClick={() => navigate(id)}
        >
          <Icon size={19} />
          <span>{label}</span>
          {id === "tasks" && snapshot && (
            <span className="nav-count">
              {
                snapshot.data.tasks.filter(
                  (t) => !t.done && !t.archived && t.due <= localDay(),
                ).length
              }
            </span>
          )}
          {id === "today" && <span className="nav-active-dot" />}
        </a>
      ))}
    </nav>
  );
  if (!snapshot)
    return (
      <div className="loading-screen">
        <RelayMark />
        <h1>
          Getting your workspace ready<span>…</span>
        </h1>
        <p>A little more forward.</p>
      </div>
    );
  const s = snapshot.data,
    currentLabel =
      screens.find((p) => p.id === screen)?.label ?? "Workspace settings";
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#today"
          onClick={() => navigate("today")}
          aria-label="Relay CRM home"
        >
          <RelayMark />
          <span>
            relay<span className="brand-period">.</span>
            <small>CRM</small>
          </span>
        </a>
        <div className="workspace-switch">
          <span className="workspace-initial">R</span>
          <div>
            <strong>Relay workspace</strong>
            <small>Small team. Big possibilities.</small>
          </div>
        </div>
        <span className="nav-label">WORKSPACE</span>
        {nav()}
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-star">
              <Sparkles size={17} />
            </span>
            <h3>A little more forward.</h3>
            <p>
              Less busywork.
              <br />
              More meaningful connections.
            </p>
            <button onClick={() => navigate("settings")}>
              Made for the next step
              <ArrowUpRight size={13} />
            </button>
          </div>
          <button
            className={`settings-link ${screen === "settings" ? "active" : ""}`}
            onClick={() => navigate("settings")}
          >
            <Settings2 size={18} />
            Workspace settings
          </button>
          <div className="sidebar-profile">
            <Avatar name="Relay Local" small color={5} />
            <span>
              <strong>Demo workspace</strong>
              <small>Your own sandbox</small>
            </span>
            <IconButton
              icon={CircleHelp}
              label="About the demo"
              onClick={() => navigate("settings")}
            />
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <PanelLeft size={20} />
            </button>
            <span className="breadcrumb-root">Workspace</span>
            <ChevronRight size={13} />
            <strong>{currentLabel}</strong>
          </div>
          <button className="global-search" onClick={() => setCommand(true)}>
            <Search size={16} />
            <span>Search anything…</span>
            <kbd>⌘ K</kbd>
          </button>
          <div className="topbar-right">
            <span className="demo-pill">
              <span className="dot" />
              Demo workspace
            </span>
            <button
              className="topbar-avatar"
              aria-label="Workspace settings"
              onClick={() => navigate("settings")}
            >
              <Avatar name="Relay Workspace" color={4} small />
            </button>
          </div>
        </header>
        {snapshot.warning && (
          <div className="storage-warning" role="status">
            <Database size={16} />
            <span>{snapshot.warning}</span>
            <button onClick={() => navigate("settings")}>Manage data</button>
          </div>
        )}
        <main id="main-content" className={`page-content screen-${screen}`}>
          {screen === "today" ? (
            <TodayView s={s} a={a} />
          ) : screen === "companies" ? (
            <RecordsView
              key="companies"
              kind="company"
              s={s}
              a={a}
              onImport={() => setImportKind("company")}
            />
          ) : screen === "contacts" ? (
            <RecordsView
              key="contacts"
              kind="contact"
              s={s}
              a={a}
              onImport={() => setImportKind("contact")}
            />
          ) : screen === "deals" ? (
            <DealsView s={s} a={a} />
          ) : screen === "tasks" ? (
            <TasksView s={s} a={a} />
          ) : (
            <SettingsView
              s={s}
              warning={snapshot.warning}
              onReset={() => setReset(true)}
            />
          )}
        </main>
      </div>
      <nav className="mobile-bottom-nav" aria-label="Quick navigation">
        {screens
          .filter((p) => p.id !== "contacts")
          .map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={screen === id ? "page" : undefined}
              className={screen === id ? "active" : ""}
              onClick={() => navigate(id)}
            >
              <Icon size={19} />
              <span>{label}</span>
            </a>
          ))}
      </nav>
      {mobile && (
        <Modal
          title="Your workspace"
          onClose={() => setMobile(false)}
          className="mobile-nav-modal"
        >
          {nav(true)}
          <Button onClick={() => navigate("settings")}>
            <Settings2 size={16} />
            Workspace settings
          </Button>
        </Modal>
      )}
      {selected && (
        <RecordDrawer
          key={`${selected.kind}-${selected.id}`}
          refValue={selected}
          s={s}
          a={a}
          stageUndo={toast?.recordId === selected.id ? toast.undo : undefined}
          onClose={() => setSelected(null)}
        />
      )}
      {editor && (
        <RecordForm
          key={editor.record?.id ?? editor.kind}
          editor={editor}
          s={s}
          onClose={() => setEditor(null)}
          onSaved={(kind, id, won, stage) => {
            setEditor(null);
            setSelected({ kind, id });
            const previous = editor.record as Deal | undefined;
            if (
              kind === "deal" &&
              previous &&
              stage &&
              previous.stage !== stage
            ) {
              setToast({
                message: `${previous.name} moved to ${stage}.`,
                recordId: previous.id,
                undo: () => {
                  commit((s) => undoMove(s, previous));
                  setHandoff(null);
                  notify("Stage change undone.");
                },
              });
            } else notify("Record saved.");
            if (won) setHandoff(id);
          }}
        />
      )}
      {command && (
        <CommandPalette s={s} a={a} onClose={() => setCommand(false)} />
      )}
      {importKind && (
        <Importer
          s={s}
          kind={importKind}
          onClose={() => setImportKind(null)}
          onDone={(message) => {
            setImportKind(null);
            notify(message);
          }}
        />
      )}
      {archive && (
        <Modal
          title="Archive this record?"
          description="A quieter workspace, with all the context preserved."
          onClose={() => setArchive(null)}
        >
          <div className="confirm-content">
            <p>
              <strong>{recordName(s, archive)}</strong> will be hidden from
              active views. Related records, notes, and tasks stay connected.
              Restore it from the archived records filter.
            </p>
            <div className="form-footer">
              <Button onClick={() => setArchive(null)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={() => {
                  commit((s) => archiveRecord(s, archive, true));
                  setArchive(null);
                  notify("Record archived. You can restore it anytime.");
                }}
              >
                <Archive size={15} />
                Archive record
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {reset && (
        <Modal
          title="Start fresh?"
          description="Reset your local demo workspace."
          onClose={() => setReset(false)}
        >
          <div className="confirm-content">
            <p>
              This replaces all changes and imported records in this browser
              with the original fictional demo. It can’t be undone.
            </p>
            <div className="form-footer">
              <Button onClick={() => setReset(false)}>Keep my changes</Button>
              <Button
                variant="danger"
                onClick={() => {
                  resetWorkspace();
                  setReset(false);
                  setSelected(null);
                  navigate("today");
                  notify("A fresh start. Demo workspace reset.");
                }}
              >
                <RotateCcw size={15} />
                Reset workspace
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {handoff && (
        <Modal
          title="That’s a win."
          description="Turn a closed deal into a great beginning."
          onClose={() => setHandoff(null)}
        >
          <div className="confirm-content">
            <div className="win-icon">
              <Check size={28} />
            </div>
            <h3>{s.deals.find((d) => d.id === handoff)?.name}</h3>
            <p>
              Create a simple handoff checklist: schedule kickoff, collect
              assets, and confirm scope. Existing handoff tasks won’t be
              duplicated.
            </p>
            <div className="form-footer">
              <Button onClick={() => setHandoff(null)}>Not now</Button>
              <Button
                variant="primary"
                onClick={() => {
                  commit((s) => createHandoff(s, handoff));
                  setHandoff(null);
                  notify("Handoff checklist ready. Existing tasks were kept.");
                }}
              >
                Create handoff
                <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <span className="toast-icon">
            <Check size={15} />
          </span>
          <span>{toast.message}</span>
          {toast.undo && (
            <button className="toast-undo" onClick={toast.undo}>
              Undo
            </button>
          )}
          <IconButton
            icon={X}
            label="Dismiss notification"
            onClick={() => setToast(null)}
          />
        </div>
      )}
    </div>
  );
}
function RelayMark() {
  return (
    <span className="relay-mark" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
