import { workspaceSchema, type Workspace } from "./domain";
import { createSeed } from "./seed";
export const STORAGE_KEY = "relay-crm.workspace.v1";
export interface PersistenceAdapter {
  load(): { data: Workspace; warning: string | null };
  save(data: Workspace): string | null;
}
export function browserAdapter(
  storage: Pick<Storage, "getItem" | "setItem"> | null,
): PersistenceAdapter {
  return {
    load() {
      if (!storage)
        return {
          data: createSeed(),
          warning:
            "Browser storage is unavailable. Changes will last for this visit only.",
        };
      try {
        const raw = storage.getItem(STORAGE_KEY);
        if (!raw) {
          const data = createSeed();
          const warning = this.save(data);
          return { data, warning };
        }
        const parsed = workspaceSchema.safeParse(JSON.parse(raw));
        if (!parsed.success) throw new Error("Invalid workspace");
        return { data: parsed.data, warning: null };
      } catch {
        return {
          data: createSeed(),
          warning:
            "Saved data could not be read. A temporary demo is loaded. Reset the demo to replace the saved data.",
        };
      }
    },
    save(data) {
      try {
        if (!storage) throw new Error("Unavailable");
        storage.setItem(
          STORAGE_KEY,
          JSON.stringify(workspaceSchema.parse(data)),
        );
        return null;
      } catch {
        return "Browser storage is unavailable or full. Changes will last for this visit only.";
      }
    },
  };
}
