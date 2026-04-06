import { useMutation } from '@tanstack/react-query';
import { API_BASE } from '../lib/utils';
import type { SolveResult, Constraint } from '../store/solverStore';

interface SolvePayload {
  equation: string;
  constraints?: Record<string, Partial<Omit<Constraint, 'parity'>> & { even?: boolean; odd?: boolean }>;
}

async function solveEquation(payload: SolvePayload): Promise<SolveResult & { solveTime: number }> {
  const start = performance.now();
  const res = await fetch(`${API_BASE}/solve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const solveTime = performance.now() - start;
  const data: SolveResult = await res.json();
  return { ...data, solveTime };
}

export function useSolveMutation() {
  return useMutation({
    mutationFn: solveEquation,
    retry: false,
  });
}

// Transform store constraints to API format
export function buildApiConstraints(
  constraints: Record<string, Constraint>
): Record<string, Record<string, unknown>> {
  const result: Record<string, Record<string, unknown>> = {};
  for (const [varName, c] of Object.entries(constraints)) {
    if (c.exact !== null) {
      result[varName] = { exact: c.exact };
    } else {
      const entry: Record<string, unknown> = {};
      if (c.min !== 0) entry.min = c.min;
      if (c.max !== undefined) entry.max = c.max;
      if (c.parity === 'even') entry.even = true;
      if (c.parity === 'odd') entry.odd = true;
      result[varName] = entry;
    }
  }
  return result;
}
