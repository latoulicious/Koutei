import { operators } from "../seed";
import type { AppState } from "../state";
import type { OptimizeResponse, SliceDTO } from "../api";
import { el } from "../dom";
import { columnHead } from "./widgets";

export function timelineColumn(state: AppState): HTMLElement {
  const col = el("div", { class: "flex flex-col gap-2 overflow-y-auto pr-1" });
  col.append(columnHead("GANTT TIMELINE", state.result ? `${state.result.slices.length}h` : "idle"));

  if (state.solving) {
    col.append(note("SOLVING…"));
    return col;
  }
  if (state.error) {
    col.append(el("p", { class: "font-mono text-sm text-accent" }, [`error: ${state.error}`]));
    return col;
  }
  if (!state.result) {
    col.append(note("Configure roster + stations, then OPTIMIZE."));
    return col;
  }

  col.append(badge(state.result));
  const prev = new Map<number, number>(); // operator index → station index, prior slice
  state.result.slices.forEach((slice, h) => col.append(block(slice, h, state, prev)));
  return col;
}

function opName(state: AppState, idx: number): string {
  const r = state.roster[idx];
  if (!r) return `#${idx}`;
  return operators[r.slug]?.name ?? r.slug;
}

function badge(r: OptimizeResponse): HTMLElement {
  return el("div", { class: "border border-accent bg-surface p-2 flex items-baseline justify-between font-mono shrink-0" }, [
    el("span", { class: "text-accent text-lg" }, [`η ${r.total_efficiency.toFixed(3)}`]),
    el("span", { class: "text-muted text-xs" }, [`Executed in ${r.execution_ms.toFixed(3)}ms`]),
  ]);
}

// block renders one hour: per-station operator chips. An operator whose station
// changed from the prior slice it appeared in is marked ↻ (a rotation swap).
function block(slice: SliceDTO, h: number, state: AppState, prev: Map<number, number>): HTMLElement {
  const wrap = el("div", { class: "border border-border bg-surface shrink-0" });
  wrap.append(el("div", { class: "flex justify-between px-2 py-1 border-b border-border font-mono text-xs" }, [
    el("span", { class: "text-muted" }, [`H${String(h).padStart(2, "0")}`]),
    el("span", { class: "text-ok" }, [`η ${slice.efficiency.toFixed(3)}`]),
  ]));

  if (slice.assignments.length === 0) {
    wrap.append(el("div", { class: "px-2 py-1 font-mono text-xs text-muted" }, ["— idle / rest —"]));
  }
  for (const a of slice.assignments) {
    const stationName = state.stations[a.station]?.name ?? `station ${a.station}`;
    const chips = a.operators.map((oi) => {
      const rotated = prev.has(oi) && prev.get(oi) !== a.station;
      prev.set(oi, a.station);
      return el("span", {
        class: `font-mono text-xs px-1 border ${rotated ? "border-accent text-accent" : "border-border"}`,
      }, [(rotated ? "↻ " : "") + opName(state, oi)]);
    });
    wrap.append(el("div", { class: "flex items-center gap-1 px-2 py-1 flex-wrap" }, [
      el("span", { class: "font-mono text-xs text-muted w-28 shrink-0" }, [stationName]),
      ...chips,
    ]));
  }
  return wrap;
}

function note(text: string): HTMLElement {
  return el("p", { class: "font-mono text-xs text-muted" }, [text]);
}
