import { describe, it, expect } from "vitest";
import { buildPayload, skillValue } from "./payload";
import type { SeedOperator } from "./seed";
import type { AppState } from "./state";

const op: SeedOperator = {
  charId: "x",
  name: "Test",
  rarity: 5,
  profession: 1,
  factorySkills: [
    { line: 1, roomType: 0, effectType: 0, effect: "mfg", icon: "", levels: [{ level: 1, value: 0.2 }, { level: 2, value: 0.3 }] },
    { line: 2, roomType: 5, effectType: 1, effect: "mood", icon: "", levels: [{ level: 1, value: 0.1 }] },
  ],
};
const ops = { test: op };

describe("skillValue", () => {
  it("reads a level by index and clamps out-of-range", () => {
    expect(skillValue(op, 1, 0)).toBe(0.2);
    expect(skillValue(op, 1, 1)).toBe(0.3);
    expect(skillValue(op, 1, 99)).toBe(0.3); // clamp high
    expect(skillValue(op, 9, 0)).toBe(0); // missing line
  });
});

describe("buildPayload", () => {
  it("maps state to the numeric contract, preserving array order", () => {
    const state = {
      horizon: 12,
      targetPriority: "weapon_exp",
      roster: [
        { slug: "test", skillLine: 1, level: 1, stamina: 80, staminaMax: 100, drainBase: 20, regen: 15, moodLine: 2 },
        { slug: "missing", skillLine: 1, level: 0, stamina: 50, staminaMax: 100, drainBase: 20, regen: 15, moodLine: null },
      ],
      stations: [{ name: "AIC", slots: 2, synergyCombo: 0.1, mood: false }],
      result: null,
      solving: false,
      error: null,
    } satisfies AppState;

    const p = buildPayload(state, ops);

    expect(p.time_horizon).toBe(12);
    expect(p.target_priority).toBe("weapon_exp");
    expect(p.operators).toHaveLength(2);
    // index 0 stays index 0 — assignment indices reference these positions
    expect(p.operators[0].skill_bonus).toBe(0.3); // line 1, level idx 1
    expect(p.operators[0].mood_bonus).toBe(0.1); // line 2, clamped to idx 0
    expect(p.operators[1].skill_bonus).toBe(0); // unknown slug → 0
    expect(p.operators[1].mood_bonus).toBe(0); // moodLine null → 0
    expect(p.stations[0]).toEqual({ slots: 2, synergy_combo: 0.1, mood: false });
  });
});
