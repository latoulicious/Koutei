import { operators, slugs, type SeedOperator } from "../seed";
import { skillValue } from "../payload";
import type { AppState, RosterEntry } from "../state";
import type { Ctx } from "../context";
import { el } from "../dom";
import { columnHead, labeled, selectInput } from "./widgets";

// readout is a register line: a snake_case engine value — muted key, colored value.
function readout(key: string, value: string, color = "text-muted"): HTMLElement {
  return el("div", { class: "flex items-center justify-between font-mono text-xs" }, [
    el("span", { class: "text-muted" }, [key]),
    el("span", { class: color }, [value]),
  ]);
}

// avatar renders an operator's head icon (web/public/avatars/<slug>.webp), falling
// back to a rarity-tinted initial when the image is missing. px = square size.
function avatar(slug: string, op: SeedOperator | undefined, px: number): HTMLElement {
  const ring = op?.rarity === 6 ? "border-accent" : "border-border";
  const wrap = el("div", {
    class: `shrink-0 grid place-items-center overflow-hidden bg-bg border ${ring} font-mono text-muted`,
    style: `width:${px}px;height:${px}px;font-size:${Math.round(px * 0.4)}px`,
  });
  const img = el("img", {
    src: `/avatars/${slug}.webp`,
    alt: op?.name ?? slug,
    class: "w-full h-full object-cover",
    loading: "lazy",
  }) as HTMLImageElement;
  img.addEventListener("error", () => {
    img.remove();
    wrap.textContent = (op?.name ?? slug).slice(0, 1).toUpperCase();
  });
  wrap.append(img);
  return wrap;
}

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

  wrap.append(el("div", { class: "flex items-center gap-2" }, [
    avatar(r.slug, op, 28),
    el("span", { class: "font-mono text-sm flex-1 min-w-0 truncate" }, [op?.name ?? r.slug]),
    el("button", { class: "text-muted hover:text-accent px-1 shrink-0", onClick: () => ctx.removeOperator(i) }, ["✕"]),
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

  const moodBonus = op && r.moodLine != null ? skillValue(op, r.moodLine, r.level) : 0;
  wrap.append(readout("skill_bonus", bonus.toFixed(3), "text-ok"));
  wrap.append(readout("mood_bonus", moodBonus.toFixed(3), "text-ok"));

  wrap.append(stamina(r, i, ctx));

  // Global PS constants (SpaceshipConst) — identical for every operator, so read-only.
  wrap.append(readout("drain_base", String(r.drainBase)));
  wrap.append(readout("regen", String(r.regen)));
  wrap.append(readout("stamina_max", String(r.staminaMax)));

  return wrap;
}

// stamina renders a 10-segment CSS bar + slider; the live label/bar repaint on input,
// state commits on release (change) so a drag never triggers a re-render.
function stamina(r: RosterEntry, i: number, ctx: Ctx): HTMLElement {
  const wrap = el("div", { class: "flex flex-col gap-1" });
  const label = el("span", { class: "font-mono text-xs text-muted" });
  const cells = Array.from({ length: 10 }, () => el("span", { class: "flex-1 h-2 bg-border" }));
  const bar = el("div", { class: "flex gap-px" }, cells);
  const paint = (v: number) => {
    const ratio = r.staminaMax > 0 ? Math.max(0, Math.min(1, v / r.staminaMax)) : 0;
    const filled = Math.round(ratio * 10);
    const fill = ratio > 0.5 ? "bg-ok" : "bg-accent";
    cells.forEach((c, idx) => (c.className = `flex-1 h-2 ${idx < filled ? fill : "bg-border"}`));
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

// adder is the full operator gallery: every slug as an avatar tile, click to add.
// Tiles already in the roster are dimmed and inert.
function adder(state: AppState, ctx: Ctx): HTMLElement {
  const inRoster = new Set(state.roster.map((r) => r.slug));
  const grid = el("div", { class: "grid grid-cols-3 gap-1" });
  for (const s of slugs) {
    const op = operators[s];
    const added = inRoster.has(s);
    grid.append(el("button", {
      class: `flex flex-col items-center gap-1 p-1 border border-border bg-surface ${
        added ? "opacity-30 cursor-not-allowed" : "hover:border-accent"
      }`,
      title: op.name,
      disabled: added ? "" : null,
      onClick: () => { if (!added) ctx.addOperator(s); },
    }, [
      avatar(s, op, 40),
      el("span", { class: "font-mono text-[10px] text-muted truncate w-full text-center" }, [op.name]),
    ]));
  }
  return el("div", { class: "mt-2 shrink-0" }, [
    el("div", { class: "font-mono text-xs tracking-widest text-muted mb-1" }, ["+ ADD OPERATOR"]),
    grid,
  ]);
}
