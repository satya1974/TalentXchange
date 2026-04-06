import { create } from 'zustand';

export interface Constraint {
  min: number;
  max: number;
  parity: 'any' | 'even' | 'odd';
  exact: number | null;
}

export interface Solution {
  [varName: string]: number;
}

export interface FormattedResult {
  rows: Array<{ index: number; assignments: Solution; display: string }>;
  count: number;
  totalFound: number | string;
  capped: boolean;
  warnings: string[];
  pagination: { totalRows: number; pageSize: number; totalPages: number };
}

export interface ASTNode {
  type: 'Number' | 'Variable' | 'BinaryOp' | 'UnaryOp';
  value?: number;
  name?: string;
  operator?: string;
  op?: string;
  left?: ASTNode;
  right?: ASTNode;
  operand?: ASTNode;
}

export interface SolveResult {
  success: boolean;
  input?: string;
  ast?: { left: ASTNode; right: ASTNode };
  coeffs?: Record<string, number>;
  target?: number;
  variableOrder?: string[];
  solutions?: Solution[];
  formattedResult?: FormattedResult;
  solutionCount?: number;
  totalFound?: number;
  capped?: boolean;
  warnings?: string[];
  meta?: {
    variableCount: number;
    constraintCount: number;
    astDepth?: number;
  };
  error?: string;
  code?: string;
  category?: string;
  solveTime?: number;
}

export interface HistoryEntry {
  id: string;
  equation: string;
  timestamp: number;
  solutionCount: number;
  solveTime: number;
}

interface SolverStore {
  // Input state
  equation: string;
  setEquation: (eq: string) => void;

  // Parse state
  isParsed: boolean;
  parsedVariables: string[];
  parseError: string | null;
  setParseState: (vars: string[], error: string | null) => void;

  // Constraints
  constraints: Record<string, Constraint>;
  setConstraint: (varName: string, constraint: Partial<Constraint>) => void;
  resetConstraints: (coeffs: Record<string, number>, target: number) => void;

  // Solve state
  isSolving: boolean;
  solveResult: SolveResult | null;
  setSolving: (b: boolean) => void;
  setSolveResult: (r: SolveResult | null) => void;

  // UI state
  currentPage: number;
  setCurrentPage: (p: number) => void;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  setSortColumn: (col: string) => void;
  debugPanelOpen: boolean;
  setDebugPanelOpen: (b: boolean) => void;
  activeDebugTab: 'ast' | 'tokens' | 'coeffs' | 'meta';
  setActiveDebugTab: (t: 'ast' | 'tokens' | 'coeffs' | 'meta') => void;

  // History
  history: HistoryEntry[];
  addHistory: (entry: HistoryEntry) => void;
  clearHistory: () => void;

  // Reset
  reset: () => void;
}

export const useSolverStore = create<SolverStore>((set, get) => ({
  equation: '',
  setEquation: (eq) => set({ equation: eq }),

  isParsed: false,
  parsedVariables: [],
  parseError: null,
  setParseState: (vars, error) => set({
    isParsed: vars.length > 0 && !error,
    parsedVariables: vars,
    parseError: error,
    currentPage: 1,
    solveResult: null,
  }),

  constraints: {},
  setConstraint: (varName, constraint) => set((state) => ({
    constraints: {
      ...state.constraints,
      [varName]: { ...state.constraints[varName], ...constraint },
    },
  })),
  resetConstraints: (coeffs, target) => {
    const constraints: Record<string, Constraint> = {};
    for (const [v, coeff] of Object.entries(coeffs)) {
      constraints[v] = {
        min: 0,
        max: Math.floor(target / Math.abs(coeff)),
        parity: 'any',
        exact: null,
      };
    }
    set({ constraints });
  },

  isSolving: false,
  solveResult: null,
  setSolving: (b) => set({ isSolving: b }),
  setSolveResult: (r) => set({ solveResult: r }),

  currentPage: 1,
  setCurrentPage: (p) => set({ currentPage: p }),
  sortColumn: null,
  sortDirection: 'asc',
  setSortColumn: (col) => set((state) => ({
    sortColumn: col,
    sortDirection: state.sortColumn === col && state.sortDirection === 'asc' ? 'desc' : 'asc',
    currentPage: 1,
  })),
  debugPanelOpen: false,
  setDebugPanelOpen: (b) => set({ debugPanelOpen: b }),
  activeDebugTab: 'ast',
  setActiveDebugTab: (t) => set({ activeDebugTab: t }),

  history: (() => {
    try {
      return JSON.parse(localStorage.getItem('qs-history') || '[]');
    } catch { return []; }
  })(),
  addHistory: (entry) => set((state) => {
    const history = [entry, ...state.history.filter(h => h.equation !== entry.equation)].slice(0, 10);
    try { localStorage.setItem('qs-history', JSON.stringify(history)); } catch {}
    return { history };
  }),
  clearHistory: () => {
    try { localStorage.removeItem('qs-history'); } catch {}
    set({ history: [] });
  },

  reset: () => set({
    equation: '',
    isParsed: false,
    parsedVariables: [],
    parseError: null,
    constraints: {},
    isSolving: false,
    solveResult: null,
    currentPage: 1,
    sortColumn: null,
  }),
}));
