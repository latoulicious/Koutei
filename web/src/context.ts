import type { AppState, RosterEntry, StationEntry } from "./state";

// Ctx is the action surface the columns call; main.ts owns the state + re-render.
// set* re-render the column, touch* persist a value edit without re-rendering
// (keeps slider/select focus during drag).
export interface Ctx {
  state: AppState;
  addOperator(slug: string): void;
  removeOperator(i: number): void;
  setOperator(i: number, patch: Partial<RosterEntry>): void;
  touchOperator(i: number, patch: Partial<RosterEntry>): void;
  addStation(): void;
  removeStation(i: number): void;
  setStation(i: number, patch: Partial<StationEntry>): void;
  touchStation(i: number, patch: Partial<StationEntry>): void;
  setHorizon(h: number): void;
  setTarget(t: string): void;
  solve(): void;
}
