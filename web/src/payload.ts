import type { SeedOperator } from "./seed";
import type { AppState } from "./state";

export interface OperatorDTO {
  stamina: number;
  stamina_max: number;
  drain_base: number;
  regen: number;
  skill_bonus: number;
  mood_bonus: number;
}

export interface StationDTO {
  slots: number;
  synergy_combo: number;
  mood: boolean;
}

export interface OptimizeRequest {
  time_horizon: number;
  target_priority: string;
  operators: OperatorDTO[];
  stations: StationDTO[];
}

// skillValue reads a factory-skill line's value at a level index, clamped to the
// available range. Returns 0 when the line is absent.
export function skillValue(op: SeedOperator, line: number, levelIdx: number): number {
  const skill = op.factorySkills.find((s) => s.line === line);
  if (!skill || skill.levels.length === 0) return 0;
  const i = Math.max(0, Math.min(levelIdx, skill.levels.length - 1));
  return skill.levels[i].value;
}

// buildPayload maps roster/station state to the backend's numeric contract in
// array order — response assignment indices reference these same positions.
export function buildPayload(
  state: AppState,
  operators: Record<string, SeedOperator>,
): OptimizeRequest {
  return {
    time_horizon: state.horizon,
    target_priority: state.targetPriority,
    operators: state.roster.map((r) => {
      const op = operators[r.slug];
      return {
        stamina: r.stamina,
        stamina_max: r.staminaMax,
        drain_base: r.drainBase,
        regen: r.regen,
        skill_bonus: op ? skillValue(op, r.skillLine, r.level) : 0,
        mood_bonus: op && r.moodLine != null ? skillValue(op, r.moodLine, r.level) : 0,
      };
    }),
    stations: state.stations.map((s) => ({
      slots: s.slots,
      synergy_combo: s.synergyCombo,
      mood: s.mood,
    })),
  };
}
