import { operators, slugs } from "../seed";
import { skillValue } from "../payload";
import type { AppState, RosterEntry } from "../state";
import type { Ctx } from "../context";
import { el } from "../dom";
import { columnHead, labeled, numberInput, selectInput } from "./widgets";

export function rosterColumn(state: AppState, ctx: Ctx): HTMLElement {
  const col = el("div", { class: "flex flex-col gap-2 overflow-y-auto pr-1" });
  col.append(columnHead("ROSTER SLATE", `${state.roster.length} ops`));
  state.roster.forEach((r, i) => col.append(card(r, i, ctx)));
  col.append(adder(state, ctx));
  return col;
}

function card(r: RosterEntry, i: number, ctx: Ctx): HTMLElement {
  const op = operators[r.slug];
  const skills = op?.factorySkills ?? [];
  const active = skills.find((s) => s.line === r.skillLine);
  const bonus = op ? skillValue(op, r.skillLine, r.level) : 0;

  const wrap = el("div", { class: "border border-border bg-surface p-2 flex flex-col gap-1.5 shrink-0" });

  wrap.append(el("div", { class: "flex items-center justify-between" }, [
    el("span", { class: "font-mono text-sm" }, [op?.name ?? r.slug]),
    el("button", { class: "text-muted hover:text-accent px-1", onClick: () => ctx.removeOperator(i) }, ["✕"]),
  ]));

  wrap.append(labeled("SKILL", selectInput(
    skills.map((s) => ({ value: String(s.line), label: s.effect })),
    String(r.skillLine),
    (v) => ctx.setOperator(i, { skillLine: Number(v), level: 0 }),
  )));

  const levels = active?.levels ?? [];
  wrap.append(labeled("LEVEL", selectInput(
    levels.map((lv, idx) => ({ value: String(idx), label: `Lv ${lv.level}` })),
    String(r.level),
    (v) => ctx.setOperator(i, { level: Number(v) }),
  )));

  wrap.append(labeled("MOOD", selectInput(
    [{ value: "", label: "— none —" }, ...skills.map((s) => ({ value: String(s.line), label: s.effect }))],
    r.moodLine == null ? "" : String(r.moodLine),
    (v) => ctx.setOperator(i, { moodLine: v === "" ? null : Number(v) }),
  )));

  wrap.append(el("div", { class: "flex items-center justify-between font-mono text-xs" }, [
    el("span", { class: "text-muted" }, ["skill_bonus"]),
    el("span", { class: "text-ok" }, [bonus.toFixed(3)]),
  ]));

  wrap.append(stamina(r, i, ctx));

  wrap.append(labeled("DRAIN", numberInput(r.drainBase, (v) => ctx.touchOperator(i, { drainBase: v }), { step: "1" })));
  wrap.append(labeled("REGEN", numberInput(r.regen, (v) => ctx.touchOperator(i, { regen: v }), { step: "1" })));
  wrap.append(labeled("MAX", numberInput(r.staminaMax, (v) => ctx.setOperator(i, { staminaMax: v }), { min: "0" })));

  return wrap;
}

// stamina renders the blocky bar + slider; the live label/bar repaint on input,
// state commits on release (change) so a drag never triggers a re-render.
function stamina(r: RosterEntry, i: number, ctx: Ctx): HTMLElement {
  const wrap = el("div", { class: "flex flex-col gap-0.5" });
  const label = el("span", { class: "font-mono text-xs text-muted" });
  const bar = el("span", {});
  const paint = (v: number) => {
    const ratio = r.staminaMax > 0 ? Math.max(0, Math.min(1, v / r.staminaMax)) : 0;
    const filled = Math.round(ratio * 10);
    bar.textContent = `[${"█".repeat(filled)}${"░".repeat(10 - filled)}]`;
    bar.className = `font-mono text-xs ${ratio > 0.5 ? "text-ok" : "text-accent"}`;
    label.textContent = `STAMINA ${Math.round(v)}/${r.staminaMax}`;
  };
  const slider = el("input", {
    type: "range",
    min: "0",
    max: String(r.staminaMax),
    value: String(r.stamina),
    class: "w-full accent-accent",
    onInput: (e: Event) => paint(Number((e.target as HTMLInputElement).value)),
    onChange: (e: Event) => ctx.touchOperator(i, { stamina: Number((e.target as HTMLInputElement).value) }),
  });
  paint(r.stamina);
  wrap.append(label, bar, slider);
  return wrap;
}

function adder(state: AppState, ctx: Ctx): HTMLElement {
  const inRoster = new Set(state.roster.map((r) => r.slug));
  const avail = slugs.filter((s) => !inRoster.has(s));
  const options = avail.length
    ? avail.map((s) => ({ value: s, label: operators[s].name }))
    : [{ value: "", label: "— all added —" }];
  const sel = selectInput(options, avail[0] ?? "", () => {});
  const btn = el("button", {
    class: "border border-border bg-bg px-2 py-1 font-mono text-xs hover:border-accent hover:text-accent",
    onClick: () => { if (sel.value) ctx.addOperator(sel.value); },
  }, ["+ ADD"]);
  return el("div", { class: "flex gap-1 items-center mt-1 shrink-0" }, [sel, btn]);
}
