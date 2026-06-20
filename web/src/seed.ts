// Bundled game-data seed (tools/seed/seed.json) — operator factory skills, scraped
// once. The SPA resolves these to the backend's numeric payload (data.md).
import seedJson from "../../tools/seed/seed.json";

export interface SkillLevel {
  level: number;
  value: number;
}

export interface FactorySkill {
  line: number;
  roomType: number;
  effectType: number;
  effect: string;
  icon: string;
  levels: SkillLevel[];
}

export interface SeedOperator {
  charId: string;
  name: string;
  rarity: number;
  profession: number;
  factorySkills: FactorySkill[];
}

export interface Seed {
  _meta: { source: string; fetchedAt: string; count: number };
  operators: Record<string, SeedOperator>;
}

export const seed = seedJson as Seed;
export const operators = seed.operators;

// Slugs sorted by display name for a stable, scannable picker.
export const slugs = Object.keys(operators).sort((a, b) =>
  operators[a].name.localeCompare(operators[b].name),
);
