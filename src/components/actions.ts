import type { Entity, Kind, RecordRef, Screen, Stage } from "@/lib/domain";
export type AppActions = {
  openRecord: (ref: RecordRef) => void;
  edit: (kind: Kind, record?: Entity, preset?: Record<string, unknown>) => void;
  changeStage: (id: string, stage: Stage) => void;
  toggleTask: (id: string) => void;
  archive: (ref: RecordRef) => void;
  notify: (message: string) => void;
  navigate: (screen: Screen) => void;
};
