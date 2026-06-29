import { describe, it, expect } from "vitest";
import { relevantBonus } from "./fanout";
import { targetRoomType } from "./recipes";
import type { SeedOperator } from "./seed";

// Sanity: the scraped seed actually has a manufacture and a grow target to resolve against.
const MFG_TARGET = "weapon_exp";
const GROW_TARGET = "char_material";

let nextLine = 1;
const skill = (effect: string, effectType: number, value: number) => ({
  line: nextLine++, roomType: 0, effectType, effect, icon: "", levels: [{ level: 1, value }],
});

const op = (...skills: SeedOperator["factorySkills"]): SeedOperator => ({
  charId: "x", name: "T", rarity: 5, profession: 1, factorySkills: skills,
});

describe("recipes seed", () => {
  it("classifies the two probe targets by room type", () => {
    expect(targetRoomType[MFG_TARGET]).toBe("manufacture");
    expect(targetRoomType[GROW_TARGET]).toBe("grow");
  });
});

describe("relevantBonus", () => {
  it("manufacture target reads manufacture_efficiency, 0 when absent", () => {
    expect(relevantBonus(op(skill("manufacture_efficiency", 7, 0.3)), MFG_TARGET, 0)).toBe(0.3);
    expect(relevantBonus(op(skill("plant_mineral", 3, 0.5)), MFG_TARGET, 0)).toBe(0); // wrong room
  });

  it("grow target reads a plant-produce line, excluding plant_power_consume", () => {
    expect(relevantBonus(op(skill("plant_mineral", 3, 0.4)), GROW_TARGET, 0)).toBe(0.4);
    expect(relevantBonus(op(skill("plant_power_consume", 1, 0.9)), GROW_TARGET, 0)).toBe(0); // effectType 1 excluded
  });

  it("picks the room-relevant skill when an operator has both", () => {
    const both = op(skill("manufacture_efficiency", 7, 0.3), skill("plant_fungus", 3, 0.4));
    expect(relevantBonus(both, MFG_TARGET, 0)).toBe(0.3);
    expect(relevantBonus(both, GROW_TARGET, 0)).toBe(0.4);
  });

  it("returns 0 for an unknown operator", () => {
    expect(relevantBonus(undefined, MFG_TARGET, 0)).toBe(0);
  });
});
