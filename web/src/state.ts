import type { OptimizeResponse } from "./api";

// RosterEntry is one operator's UI state. skillLine/level index into the seed's
// factorySkills; moodLine is the optional mood-skill line (null = no aura).
export interface RosterEntry {
  slug: string;
  skillLine: number;
  level: number;
  stamina: number;
  staminaMax: number;
  drainBase: number;
  regen: number;
  moodLine: number | null;
}

export interface StationEntry {
  name: string;
  slots: number;
  synergyCombo: number;
  mood: boolean;
}

export interface AppState {
  horizon: number;
  targetPriority: string;
  roster: RosterEntry[];
  stations: StationEntry[];
  result: OptimizeResponse | null;
  solving: boolean;
  error: string | null;
}

const KEY = "koutei.state.v1";

// Placeholder game constants: stamina mechanics are not in the seed (data.md).
// Editable per operator; flagged pending a real stamina-mechanics source.
export const DEFAULTS = { stamina: 100, staminaMax: 100, drainBase: 20, regen: 15 };

function defaultStations(): StationEntry[] {
  return [
    { name: "AIC Manufacturing", slots: 2, synergyCombo: 0.1, mood: false },
    { name: "Mood Nexus", slots: 1, synergyCombo: 0, mood: true },
    { name: "Growth Chamber", slots: 1, synergyCombo: 0, mood: false },
  ];
}

export function load(): AppState {
  const state: AppState = {
    horizon: 24,
    targetPriority: "weapon_exp",
    roster: [],
    stations: defaultStations(),
    result: null,
    solving: false,
    error: null,
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<AppState>;
      state.horizon = saved.horizon ?? state.horizon;
      state.targetPriority = saved.targetPriority ?? state.targetPriority;
      state.roster = saved.roster ?? state.roster;
      state.stations = saved.stations ?? state.stations;
    }
  } catch {
    // corrupt storage → fall back to defaults
  }
  return state;
}

// save persists only user-entered inputs, never the transient solve result.
export function save(state: AppState): void {
  const { horizon, targetPriority, roster, stations } = state;
  localStorage.setItem(KEY, JSON.stringify({ horizon, targetPriority, roster, stations }));
}
