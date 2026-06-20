import { el } from "../dom";

export function columnHead(title: string, sub: string): HTMLElement {
  return el("div", { class: "flex items-baseline justify-between border-b border-border pb-1 mb-1 shrink-0" }, [
    el("h2", { class: "font-mono text-xs tracking-widest text-muted" }, [title]),
    el("span", { class: "font-mono text-xs text-muted" }, [sub]),
  ]);
}

export function labeled(label: string, control: HTMLElement): HTMLElement {
  return el("label", { class: "flex items-center justify-between gap-2 text-xs" }, [
    el("span", { class: "font-mono text-muted" }, [label]),
    control,
  ]);
}

// numberInput edits a numeric field; commit fires on change with the parsed value.
// Extra attrs (min/max/step) override the defaults.
export function numberInput(
  value: number,
  commit: (v: number) => void,
  attrs: Record<string, unknown> = {},
): HTMLInputElement {
  return el("input", {
    type: "number",
    value: String(value),
    class: "w-20 bg-bg border border-border px-1 py-0.5 font-mono text-xs text-right",
    onChange: (e: Event) => commit(Number((e.target as HTMLInputElement).value)),
    ...attrs,
  });
}

// selectInput renders an option list and commits the chosen value string.
export function selectInput(
  options: { value: string; label: string }[],
  selected: string,
  commit: (v: string) => void,
): HTMLSelectElement {
  const sel = el("select", {
    class: "bg-bg border border-border px-1 py-0.5 font-mono text-xs max-w-44 truncate",
    onChange: (e: Event) => commit((e.target as HTMLSelectElement).value),
  });
  for (const o of options) {
    const opt = el("option", { value: o.value }, [o.label]);
    if (o.value === selected) opt.selected = true;
    sel.append(opt);
  }
  return sel;
}
