import { el } from "../dom";

// GLOSSARY is the plain-English meaning of every on-screen value, grouped by column.
// Terms mirror the UI labels so the help reads like the panel it explains.
const GLOSSARY: { group: string; terms: [string, string][] }[] = [
  { group: "HEADER", terms: [
    ["HORIZON", "How many 1-hour slices to plan ahead — 24 = a full day. The solver schedules every hour up to this."],
    ["TARGET", "The production goal (e.g. weapon_exp). Recorded with the request; COMPARE scores the roster per target."],
    ["COMPARE", "Scores the current roster against every production target and ranks them by relative η (1.0 = no bonus). Click a row to set that TARGET."],
  ] },
  { group: "ROSTER", terms: [
    ["SKILL", "Which factory-skill line of the operator is active (its production effect)."],
    ["LEVEL", "The skill's upgrade level — a higher level gives a bigger bonus."],
    ["MOOD", "Which physical_power (PS-recovery) aura the operator emits when in a mood station. “none” = no aura."],
    ["skill_bonus", "Computed: the output bonus from the chosen SKILL + LEVEL. A readout, not an input."],
    ["mood_bonus", "Computed: the PS-recovery aura from the chosen MOOD line. A readout, not an input."],
    ["STAMINA", "Current PS (Physical Strength). Drains while working, recovers while resting; at 0 the operator outputs nothing. The one per-operator input here."],
    ["drain_base", "PS lost per hour while assigned to a slot. A global game constant (read-only)."],
    ["regen", "PS recovered per hour while resting. Global constant (read-only)."],
    ["stamina_max", "PS ceiling — the cap recovery fills toward. Global constant (read-only)."],
  ] },
  { group: "STATION", terms: [
    ["SLOTS", "How many operators the station holds at once."],
    ["MOOD", "Marks a mood/recovery room — occupants' mood_bonus cuts everyone's drain that hour."],
  ] },
  { group: "TIMELINE", terms: [
    ["η", "Efficiency — the total output multiplier (1.0 base + skill bonuses) summed across the timeline. Higher is better."],
  ] },
];

// helpDialog builds the glossary as a native <dialog> (no library: Escape + backdrop
// close come free). Open it with .showModal(). Backdrop styling lives in style.css.
export function helpDialog(): HTMLDialogElement {
  const dlg = el("dialog", {
    class: "help-dialog bg-surface border border-border text-[#e7ebef] w-[90vw] max-w-lg p-0 m-auto",
  }) as HTMLDialogElement;

  const head = el("div", { class: "flex items-center justify-between border-b border-border px-4 py-2" }, [
    el("h2", { class: "font-mono text-xs tracking-widest text-muted" }, ["GLOSSARY — what each value means"]),
    el("button", { class: "text-muted hover:text-accent px-1", onClick: () => dlg.close() }, ["✕"]),
  ]);

  const body = el("div", { class: "p-4 flex flex-col gap-4 overflow-y-auto max-h-[70vh]" });
  for (const g of GLOSSARY) {
    const rows = g.terms.map(([term, def]) =>
      el("div", { class: "grid grid-cols-[110px_1fr] gap-3 items-baseline" }, [
        el("span", { class: "font-mono text-xs text-accent" }, [term]),
        el("span", { class: "font-mono text-xs text-muted leading-snug" }, [def]),
      ]),
    );
    body.append(el("div", {}, [
      el("div", { class: "font-mono text-[10px] tracking-widest text-muted border-b border-border pb-1 mb-1" }, [g.group]),
      el("div", { class: "flex flex-col gap-2" }, rows),
    ]));
  }

  dlg.append(head, body);
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); }); // click backdrop = close
  return dlg;
}
