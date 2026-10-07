"use client";
import { useSyncExternalStore } from "react";
import { browserAdapter, type PersistenceAdapter } from "./persistence";
import type { Workspace } from "./domain";
import { createSeed } from "./seed";
type Snapshot = { data: Workspace; warning: string | null };
let snapshot: Snapshot | null = null;
let adapter: PersistenceAdapter | null = null;
let preventSave = false;
const listeners = new Set<() => void>();
function getSnapshot() {
  if (!snapshot && typeof window !== "undefined") {
    let storage: Storage | null = null;
    try {
      storage = window.localStorage;
    } catch {
      /* restricted browser */
    }
    adapter = browserAdapter(storage);
    snapshot = adapter.load();
    preventSave = Boolean(snapshot.warning?.startsWith("Saved data"));
  }
  return snapshot;
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function useWorkspace() {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
export function commit(update: (s: Workspace) => Workspace) {
  const current = getSnapshot();
  if (!current) return;
  const data = update(current.data);
  const warning = preventSave ? current.warning : (adapter?.save(data) ?? null);
  snapshot = { data, warning };
  listeners.forEach((l) => l());
}
export function resetWorkspace() {
  preventSave = false;
  commit(() => createSeed());
}
