import "./style.css";
import { load, save, DEFAULTS, type AppState } from "./state";
import { operators } from "./seed";
import { buildPayload, primarySkillLine } from "./payload";
import { optimize } from "./api";
import type { Ctx } from "./context";
import { el } from "./dom";
import { rosterColumn } from "./ui/roster";
import { stationsColumn } from "./ui/stations";
import { timelineColumn } from "./ui/timeline";

const state: AppState = load();
const app = document.querySelector<HTMLDivElement>("#app")!;

const rosterWrap = el("section", { class: "p-3 flex flex-col overflow-hidden min-h-0" });
const stationsWrap = el("section", { class: "p-3 flex flex-col overflow-hidden min-h-0 border-l border-border" });
const timelineWrap = el("section", { class: "p-3 flex flex-col overflow-hidden min-h-0 border-l border-border" });

function renderRoster(): void {
  rosterWrap.replaceChildren(rosterColumn(state, ctx));
}
function renderStations(): void {
  stationsWrap.replaceChildren(stationsColumn(state, ctx));
}
function renderTimeline(): void {
  timelineWrap.replaceChildren(timelineColumn(state));
}

const ctx: Ctx = {
  state,
  addOperator(slug) {
    const op = operators[slug];
    state.roster.push({
      slug,
      skillLine: primarySkillLine(op),
      level: 0,
      moodLine: null,
      ...DEFAULTS,
    });
    save(state);
    renderRoster();
  },
  removeOperator(i) {
    state.roster.splice(i, 1);
    save(state);
    renderRoster();
  },
  setOperator(i, patch) {
    Object.assign(state.roster[i], patch);
    save(state);
    renderRoster();
  },
  touchOperator(i, patch) {
    Object.assign(state.roster[i], patch);
    save(state);
  },
  addStation() {
    state.stations.push({ name: "New Station", slots: 1, synergyCombo: 0, mood: false });
    save(state);
    renderStations();
  },
  removeStation(i) {
    state.stations.splice(i, 1);
    save(state);
    renderStations();
  },
  setStation(i, patch) {
    Object.assign(state.stations[i], patch);
    save(state);
    renderStations();
  },
  touchStation(i, patch) {
    Object.assign(state.stations[i], patch);
    save(state);
  },
  setHorizon(h) {
    state.horizon = h;
    save(state);
  },
  setTarget(t) {
    state.targetPriority = t;
    save(state);
  },
  async solve() {
    state.solving = true;
    state.error = null;
    renderTimeline();
    try {
      state.result = await optimize(buildPayload(state, operators));
    } catch (e) {
      state.error = (e as Error).message;
      state.result = null;
    } finally {
      state.solving = false;
      renderTimeline();
    }
  },
};

function labeledInline(label: string, control: HTMLElement): HTMLElement {
  return el("label", { class: "flex items-center gap-1 font-mono text-xs text-muted" }, [label, control]);
}

function header(): HTMLElement {
  const horizon = el("input", {
    type: "number",
    min: "1",
    max: "168",
    value: String(state.horizon),
    class: "w-16 bg-bg border border-border px-1 py-0.5 font-mono text-xs",
    onChange: (e: Event) => ctx.setHorizon(Number((e.target as HTMLInputElement).value)),
  });
  const target = el("input", {
    type: "text",
    value: state.targetPriority,
    class: "w-36 bg-bg border border-border px-1 py-0.5 font-mono text-xs",
    onChange: (e: Event) => ctx.setTarget((e.target as HTMLInputElement).value),
  });
  const optimizeBtn = el("button", {
    class: "border border-accent text-accent px-3 py-1 font-mono text-xs hover:bg-accent hover:text-bg",
    onClick: () => ctx.solve(),
  }, ["▶ OPTIMIZE"]);

  return el("header", { class: "flex items-center gap-3 px-3 py-2 border-b border-border bg-surface shrink-0" }, [
    el("h1", { class: "font-mono text-sm tracking-widest" }, ["KOUTEI · 工程"]),
    el("div", { class: "flex-1" }),
    labeledInline("HORIZON", horizon),
    labeledInline("TARGET", target),
    optimizeBtn,
  ]);
}

app.className = "flex flex-col h-screen";
app.append(
  header(),
  el("main", { class: "grid grid-cols-[1fr_1fr_1.4fr] flex-1 min-h-0" }, [rosterWrap, stationsWrap, timelineWrap]),
);
renderRoster();
renderStations();
renderTimeline();
