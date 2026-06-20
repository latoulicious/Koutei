import type { OptimizeRequest } from "./payload";

export interface AssignmentDTO {
  station: number;
  operators: number[];
}

export interface SliceDTO {
  efficiency: number;
  assignments: AssignmentDTO[];
}

export interface OptimizeResponse {
  total_efficiency: number;
  execution_ms: number;
  slices: SliceDTO[];
}

// Same-origin by default (nginx serves SPA + proxies /api); override for split hosts.
const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export async function optimize(req: OptimizeRequest): Promise<OptimizeResponse> {
  const res = await fetch(`${API_BASE}/api/v1/optimize`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<OptimizeResponse>;
}
