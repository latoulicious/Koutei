import type { SeedOperator } from "./seed";
import type { AppState } from "./state";
import { optimize } from "./api";
import { buildPayload, skillValue } from "./payload";
import { targetRoomType, targets } from "./recipes";

// relevantBonus is an operator's produce bonus for a target's room type. Manufacture targets
// read the manufacture_efficiency line; grow targets read any plant-produce line (effectType
// 3 — excludes plant_power_consume, effectType 1). 0 when the operator lacks the skill. The
// data has no per-recipe operator specialization, so the bonus is per room type, not per item.
export function relevantBonus(
  op: SeedOperator | undefined,
  target: string,
  levelIdx: number,
): number {
  if (!op) return 0;
  const skill =
    targetRoomType[target] === "manufacture"
      ? op.factorySkills.find((s) => s.effect === "manufacture_efficiency")
      : op.factorySkills.find((s) => s.effect.startsWith("plant_") && s.effectType === 3);
  return skill ? skillValue(op, skill.line, levelIdx) : 0;
}

export interface TargetScore {
  target: string;
  score: number;
}

// fanOut solves the roster once per target — re-resolving each operator's skill_bonus to that
// target's room-produce effect — and ranks by the solver's relative total_efficiency (1.0 = no
// bonus). Stamina/stations are target-independent, so only skill_bonus and the label change.
export async function fanOut(
  state: AppState,
  operators: Record<string, SeedOperator>,
): Promise<TargetScore[]> {
  const scores = await Promise.all(
    targets.map(async (target) => {
      const req = buildPayload(state, operators);
      req.target_priority = target;
      req.operators.forEach((o, i) => {
        const r = state.roster[i];
        o.skill_bonus = relevantBonus(operators[r.slug], target, r.level);
      });
      const res = await optimize(req);
      return { target, score: res.total_efficiency };
    }),
  );
  return scores.sort((a, b) => b.score - a.score);
}
