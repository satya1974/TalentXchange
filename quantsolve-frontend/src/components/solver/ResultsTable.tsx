import { useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSolverStore } from '../../store/solverStore';
import { cn, formatSolveTime } from '../../lib/utils';

const PAGE_SIZE = 25;

function SortIcon({ column, active, direction }: { column: string; active: boolean; direction: 'asc' | 'desc' }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" className={cn('ml-1 transition-colors', active ? 'text-green-DEFAULT' : 'text-text-muted')}>
      <path d="M5 2L8 5H2L5 2Z" fill={active && direction === 'asc' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="0.8"/>
      <path d="M5 8L2 5H8L5 8Z" fill={active && direction === 'desc' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="0.8"/>
    </svg>
  );
}

export function ResultsTable() {
  const {
    solveResult, isSolving,
    isParsed,
    currentPage, setCurrentPage,
    sortColumn, sortDirection, setSortColumn,
  } = useSolverStore();

  const solutions = solveResult?.solutions ?? [];
  const varOrder = solveResult?.variableOrder ?? [];
  const coeffs = solveResult?.coeffs ?? {};
  const target = solveResult?.target ?? 0;

  // Sort
  const sorted = useMemo(() => {
    if (!sortColumn) return solutions;
    return [...solutions].sort((a, b) => {
      const av = a[sortColumn] ?? 0;
      const bv = b[sortColumn] ?? 0;
      return sortDirection === 'asc' ? av - bv : bv - av;
    });
  }, [solutions, sortColumn, sortDirection]);

  // Paginate
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageSlice = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Copy row
  const copyRow = useCallback((sol: Record<string, number>) => {
    const text = varOrder.map(v => `${v}=${sol[v]}`).join(', ');
    navigator.clipboard.writeText(text).catch(() => {});
  }, [varOrder]);

  // Export CSV
  const exportCSV = useCallback(() => {
    if (!solutions.length) return;
    const headers = [...varOrder, 'verification'].join(',');
    const rows = solutions.map(sol => {
      const vals = varOrder.map(v => sol[v] ?? 0);
      const verification = varOrder.reduce((sum, v) => sum + (coeffs[v] ?? 1) * (sol[v] ?? 0), 0);
      return [...vals, verification].join(',');
    });
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quantsolve-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [solutions, varOrder, coeffs]);

  // Empty / loading states
  if (isSolving) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <motion.div
          className="w-12 h-12 border-2 border-border border-t-green-DEFAULT rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <div className="text-center">
          <p className="text-sm text-text-secondary font-mono">Solving...</p>
          <p className="text-xs text-text-tertiary mt-1">Running recursive backtracker</p>
        </div>
        {/* Animated progress nodes */}
        <div className="flex gap-2 mt-2">
          {['Lexer', 'Parser', 'Normalizer', 'Solver'].map((stage, i) => (
            <motion.div
              key={stage}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-2 h-2 rounded-full bg-green-DEFAULT" />
              <span className="text-xs text-text-tertiary font-mono">{stage}</span>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (!solveResult) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8 text-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M7 14h14M7 9h14M7 19h8" stroke="#2d3f52" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <p className="text-text-secondary text-sm">No results yet</p>
          <p className="text-text-tertiary text-xs mt-1">
            {isParsed ? 'Hit Solve to find all combinations' : 'Parse an equation to get started'}
          </p>
        </div>
        {!isParsed && (
          <div className="bg-surface border border-border rounded-lg px-4 py-2.5 font-mono text-xs text-text-secondary">
            e.g. 150a + 100b + 50c = 5000
          </div>
        )}
      </div>
    );
  }

  if (!solveResult.success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="h-full flex flex-col items-center justify-center px-8 text-center gap-3"
      >
        <div className="w-12 h-12 rounded-xl bg-neon-red-dim border border-neon-red-border flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 6v5M10 14h.01" stroke="#ff4466" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="10" cy="10" r="8" stroke="#ff4466" strokeWidth="1.2"/>
          </svg>
        </div>
        <div>
          <p className="text-neon-red text-sm font-semibold font-mono">{solveResult.code}</p>
          <p className="text-text-secondary text-sm mt-1 max-w-sm leading-relaxed">{solveResult.error}</p>
          {solveResult.category && (
            <span className="tag-red mt-2 inline-block">{solveResult.category}</span>
          )}
        </div>
      </motion.div>
    );
  }

  if (solutions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full flex flex-col items-center justify-center px-8 text-center gap-3"
      >
        <div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center">
          <span className="text-2xl">∅</span>
        </div>
        <p className="text-text-secondary text-sm">No whole-number solutions exist</p>
        <p className="text-text-tertiary text-xs">The GCD of coefficients doesn't divide the target</p>
      </motion.div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Table toolbar */}
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-green-DEFAULT font-mono">
              {solutions.length.toLocaleString()}
            </span>
            <span className="text-xs text-text-tertiary">
              {solveResult.capped ? `of ${solveResult.totalFound?.toLocaleString()}+` : 'solutions'}
            </span>
          </div>
          {solveResult.solveTime !== undefined && (
            <span className="tag-green">{formatSolveTime(solveResult.solveTime)}</span>
          )}
          {solveResult.capped && (
            <span className="tag-amber">capped at 1k</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="btn-ghost px-3 py-1.5 text-xs font-mono flex items-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v7M3 5l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Warning banner */}
      <AnimatePresence>
        {solveResult.warnings?.map((w, i) => (
          <motion.div
            key={i}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-neon-amber-dim border-b border-neon-amber-border px-4 py-2 text-xs text-neon-amber font-mono"
          >
            ⚠ {w}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Table */}
      <div className="flex-1 overflow-auto no-scrollbar">
        <table className="w-full text-xs border-collapse" style={{ tableLayout: 'fixed' }}>
          <thead className="sticky top-0 bg-bg-2 z-10">
            <tr>
              <th className="px-3 py-2.5 text-left text-text-tertiary font-mono font-normal w-12 border-b border-border">
                #
              </th>
              {varOrder.map(v => (
                <th
                  key={v}
                  onClick={() => setSortColumn(v)}
                  className="px-3 py-2.5 text-left font-mono font-medium text-text-secondary hover:text-green-DEFAULT cursor-pointer transition-colors border-b border-border group"
                >
                  <span className="flex items-center">
                    <span className="text-green-DEFAULT">{v}</span>
                    <SortIcon column={v} active={sortColumn === v} direction={sortDirection} />
                  </span>
                </th>
              ))}
              <th className="px-3 py-2.5 text-left font-mono font-normal text-text-tertiary border-b border-border">
                <span title="Sum of coefficient × value for each row — always equals target">∑ verify</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {pageSlice.map((sol, i) => {
                const globalIdx = (currentPage - 1) * PAGE_SIZE + i + 1;
                const verification = varOrder.reduce(
                  (sum, v) => sum + (coeffs[v] ?? 1) * (sol[v] ?? 0),
                  0
                );
                const isCorrect = verification === target;

                return (
                  <motion.tr
                    key={JSON.stringify(sol)}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: i * 0.02 }}
                    className="group border-b border-border/50 hover:bg-surface transition-colors cursor-default"
                    onClick={() => copyRow(sol)}
                    title="Click to copy"
                  >
                    <td className="px-3 py-2 text-text-muted font-mono">{globalIdx}</td>
                    {varOrder.map(v => (
                      <td key={v} className="px-3 py-2 font-mono text-text-primary">
                        {sol[v] ?? 0}
                      </td>
                    ))}
                    <td className={cn(
                      'px-3 py-2 font-mono font-semibold',
                      isCorrect ? 'text-green-DEFAULT' : 'text-neon-red'
                    )}>
                      {verification.toLocaleString()}
                      {isCorrect && <span className="text-green-800 ml-1 text-[10px]">✓</span>}
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-2.5 border-t border-border flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-text-tertiary font-mono">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="btn-ghost px-2 py-1 text-xs font-mono disabled:opacity-30"
            >«</button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn-ghost px-2 py-1 text-xs font-mono disabled:opacity-30"
            >‹</button>

            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i;
              return (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={cn(
                    'px-2.5 py-1 text-xs font-mono rounded transition-all',
                    p === currentPage
                      ? 'bg-green-dim text-green-DEFAULT border border-green-border'
                      : 'btn-ghost',
                  )}
                >
                  {p}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="btn-ghost px-2 py-1 text-xs font-mono disabled:opacity-30"
            >›</button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="btn-ghost px-2 py-1 text-xs font-mono disabled:opacity-30"
            >»</button>
          </div>
        </div>
      )}
    </div>
  );
}
