import { motion, AnimatePresence } from 'framer-motion';
import { useSolverStore } from '../../store/solverStore';
import { cn } from '../../lib/utils';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

interface ParityBtnProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function ParityBtn({ label, active, onClick }: ParityBtnProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2.5 py-1 text-xs font-mono rounded transition-all duration-150',
        active
          ? 'bg-green-dim text-green-DEFAULT border border-green-border'
          : 'text-text-tertiary border border-border hover:border-border-2 hover:text-text-secondary',
      )}
    >
      {label}
    </button>
  );
}

export function ConstraintPanel() {
  const { parsedVariables, isParsed, constraints, setConstraint, solveResult } = useSolverStore();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text-primary font-body">Market rules</h2>
          <p className="text-xs text-text-tertiary mt-0.5">Per-variable constraints</p>
        </div>
        {isParsed && (
          <span className="tag-green">{parsedVariables.length} vars</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <AnimatePresence mode="wait">
          {!isParsed ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-48 px-6 text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center mb-3">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 3v12M3 9h12" stroke="#4a5d70" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-xs text-text-tertiary leading-relaxed">
                Parse an equation to auto-generate constraint rows
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="constraints"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="p-3 space-y-2"
            >
              {parsedVariables.map((varName) => {
                const c = constraints[varName];
                if (!c) return null;
                const defaultMax = c.max;

                return (
                  <motion.div
                    key={varName}
                    variants={rowVariants}
                    layout
                    className="bg-bg-2 border border-border rounded-xl p-3 space-y-3"
                  >
                    {/* Variable header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-green-DEFAULT text-base">{varName}</span>
                        {c.exact !== null && (
                          <span className="tag-amber">pinned</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {/* Exact toggle */}
                        <button
                          onClick={() => setConstraint(varName, { exact: c.exact !== null ? null : c.min })}
                          className={cn(
                            'text-xs px-2 py-0.5 rounded border transition-all duration-150 font-mono',
                            c.exact !== null
                              ? 'bg-neon-amber-dim text-neon-amber border-neon-amber-border'
                              : 'text-text-tertiary border-border hover:border-border-2',
                          )}
                          title="Pin to exact value"
                        >
                          exact
                        </button>
                      </div>
                    </div>

                    {c.exact !== null ? (
                      /* Exact value mode */
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-text-tertiary font-mono w-12">value</label>
                        <input
                          type="number"
                          value={c.exact}
                          min={0}
                          onChange={e => setConstraint(varName, { exact: parseInt(e.target.value) || 0 })}
                          className="input-base w-full px-3 py-1.5 text-sm text-neon-amber"
                        />
                      </div>
                    ) : (
                      <>
                        {/* Min/Max row */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-text-tertiary font-mono block mb-1">min</label>
                            <input
                              type="number"
                              value={c.min}
                              min={0}
                              max={c.max}
                              onChange={e => setConstraint(varName, { min: Math.max(0, parseInt(e.target.value) || 0) })}
                              className="input-base w-full px-2.5 py-1.5 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-text-tertiary font-mono block mb-1">
                              max
                              <span className="text-text-muted ml-1">(≤{defaultMax})</span>
                            </label>
                            <input
                              type="number"
                              value={c.max}
                              min={c.min}
                              max={defaultMax}
                              onChange={e => setConstraint(varName, { max: Math.min(defaultMax, parseInt(e.target.value) || defaultMax) })}
                              className="input-base w-full px-2.5 py-1.5 text-sm"
                            />
                          </div>
                        </div>

                        {/* Range visual */}
                        <div className="relative h-1 bg-border rounded-full">
                          <div
                            className="absolute h-full bg-green-DEFAULT rounded-full transition-all duration-150"
                            style={{
                              left: `${(c.min / defaultMax) * 100}%`,
                              right: `${100 - (c.max / defaultMax) * 100}%`,
                            }}
                          />
                        </div>

                        {/* Parity row */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-tertiary font-mono w-12">parity</span>
                          <div className="flex gap-1">
                            <ParityBtn label="any" active={c.parity === 'any'} onClick={() => setConstraint(varName, { parity: 'any' })} />
                            <ParityBtn label="even" active={c.parity === 'even'} onClick={() => setConstraint(varName, { parity: 'even' })} />
                            <ParityBtn label="odd" active={c.parity === 'odd'} onClick={() => setConstraint(varName, { parity: 'odd' })} />
                          </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Summary */}
      <AnimatePresence>
        {solveResult?.success && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="border-t border-border px-4 py-3 bg-green-dim"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-green-DEFAULT font-mono">
                {solveResult.solutionCount?.toLocaleString()} solutions found
              </span>
              <span className="text-xs text-text-tertiary font-mono">
                {solveResult.solveTime ? `${Math.round(solveResult.solveTime)}ms` : ''}
              </span>
            </div>
            {solveResult.capped && (
              <p className="text-xs text-neon-amber mt-1">
                Showing first 1,000 — tighten constraints for full results
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
