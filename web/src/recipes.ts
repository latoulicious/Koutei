// Bundled recipe/yield seed (tools/seed/recipes.json), scraped from EndfieldTableCfg.
// Used by the target fan-out (fanout.ts) to know which room type each target produces in.
import recipesJson from "../../tools/seed/recipes.json";

export interface Recipe {
  id: string;
  roomType: "manufacture" | "grow";
  attrType: number;
  target: string;
  level: number;
  outItem: string;
  out: number;
  progress: number;
  seedItem?: string;
  seedCount?: number;
}

export const recipes = (recipesJson as { recipes: Record<string, Recipe> }).recipes;

// Every recipe for a target shares one room type (manufacture targets vs grow targets).
export const targetRoomType: Record<string, "manufacture" | "grow"> = {};
for (const r of Object.values(recipes)) targetRoomType[r.target] = r.roomType;

export const targets = Object.keys(targetRoomType).sort();
