import type { AppState, StationEntry } from "../state";
import type { Ctx } from "../context";
import { el } from "../dom";
import { columnHead, labeled, numberInput } from "./widgets";

export function stationsColumn(state: AppState, ctx: Ctx): HTMLElement {
  const col = el("div", { class: "flex flex-col gap-2 overflow-y-auto pr-1" });
  col.append(columnHead("STATION MATRIX", `${state.stations.length} rooms`));
  state.stations.forEach((s, i) => col.append(card(s, i, ctx)));
  col.append(el("button", {
    class: "border border-border bg-bg px-2 py-1 font-mono text-xs hover:border-accent hover:text-accent mt-1 shrink-0",
    onClick: () => ctx.addStation(),
  }, ["+ STATION"]));
  return col;
}

function card(s: StationEntry, i: number, ctx: Ctx): HTMLElement {
  const wrap = el("div", { class: "border border-border bg-surface p-2 flex flex-col gap-1.5 shrink-0" });

  const name = el("input", {
    type: "text",
    value: s.name,
    class: "bg-bg border border-border px-1 py-0.5 font-mono text-sm flex-1 min-w-0",
    onChange: (e: Event) => ctx.touchStation(i, { name: (e.target as HTMLInputElement).value }),
  });
  wrap.append(el("div", { class: "flex items-center justify-between gap-2" }, [
    name,
    el("button", { class: "text-muted hover:text-accent px-1", onClick: () => ctx.removeStation(i) }, ["✕"]),
  ]));

  wrap.append(labeled("SLOTS", numberInput(s.slots, (v) => ctx.touchStation(i, { slots: v }), { min: "0", max: "16", step: "1" })));
  wrap.append(labeled("SYNERGY", numberInput(s.synergyCombo, (v) => ctx.touchStation(i, { synergyCombo: v }), { step: "0.05" })));

  const mood = el("input", {
    type: "checkbox",
    class: "accent-accent",
    onChange: (e: Event) => ctx.touchStation(i, { mood: (e.target as HTMLInputElement).checked }),
  });
  mood.checked = s.mood;
  wrap.append(labeled("MOOD", mood));

  return wrap;
}
