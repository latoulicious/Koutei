import { el } from "../dom";
import type { TargetScore } from "../fanout";

// compareDialog shows the fan-out ranking: each target's relative efficiency (1.0 = no bonus),
// best first. Clicking a row picks that target and closes. Native <dialog> — Escape/backdrop
// close come free, like helpDialog. onPick lets the caller set state.targetPriority.
export function compareDialog(scores: TargetScore[], onPick: (target: string) => void): HTMLDialogElement {
  const dlg = el("dialog", {
    class: "help-dialog bg-surface border border-border text-[#e7ebef] w-[90vw] max-w-sm p-0 m-auto",
  }) as HTMLDialogElement;

  const head = el("div", { class: "flex items-center justify-between border-b border-border px-4 py-2" }, [
    el("h2", { class: "font-mono text-xs tracking-widest text-muted" }, ["TARGET FIT — relative η, best first"]),
    el("button", { class: "text-muted hover:text-accent px-1", onClick: () => dlg.close() }, ["✕"]),
  ]);

  const best = scores[0]?.score || 1;
  const rows = scores.map((s) =>
    el("button", {
      class: "grid grid-cols-[1fr_auto] gap-3 items-baseline w-full text-left px-2 py-1 hover:bg-bg",
      onClick: () => { onPick(s.target); dlg.close(); },
    }, [
      el("span", { class: "font-mono text-xs text-accent" }, [s.target]),
      el("span", { class: "font-mono text-xs text-muted" }, [`${(s.score / best).toFixed(2)}×`]),
    ]),
  );

  dlg.append(head, el("div", { class: "p-3 flex flex-col gap-1 overflow-y-auto max-h-[70vh]" }, rows));
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  return dlg;
}
