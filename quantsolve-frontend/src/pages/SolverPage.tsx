import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { EquationInput } from '../components/solver/EquationInput';
import { ConstraintPanel } from '../components/solver/ConstraintPanel';
import { ResultsTable } from '../components/solver/ResultsTable';
import { DebugPanel } from '../components/debug/DebugPanel';
import { useSolverStore } from '../store/solverStore';
import { EXAMPLE_EQUATIONS, cn } from '../lib/utils';

export function SolverPage() {
  const [searchParams] = useSearchParams();
  const { setEquation, debugPanelOpen, setDebugPanelOpen, reset } = useSolverStore();
  const [examplesOpen, setExamplesOpen] = useState(false);

  // Load equation from URL param
  useEffect(() => {
    const eq = searchParams.get('eq');
    if (eq) {
      setEquation(decodeURIComponent(eq));
    }
  }, [searchParams, setEquation]);

  // Panel resize state
  const [leftWidth, setLeftWidth] = useState(280);
  const [rightWidth, setRightWidth] = useState(320);
  const isDraggingLeft = useRef(false);
  const isDraggingRight = useRef(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (isDraggingLeft.current) {
        setLeftWidth(w => Math.max(220, Math.min(380, w + e.movementX)));
      }
      if (isDraggingRight.current) {
        setRightWidth(w => Math.max(240, Math.min(420, w - e.movementX)));
      }
    };
    const onUp = () => {
      isDraggingLeft.current = false;
      isDraggingRight.current = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-bg overflow-hidden pt-14">
      {/* Top equation bar */}
      <div className="flex-shrink-0 bg-bg-2 border-b border-border px-6 py-4">
        <div className="max-w-none flex items-start gap-4">
          {/* Left — equation label + examples */}
          <div className="flex-shrink-0 w-48">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-tertiary font-mono uppercase tracking-wider">Equation</span>
              <button
                onClick={() => setExamplesOpen(o => !o)}
                className="text-xs text-green-DEFAULT hover:text-green-600 font-mono transition-colors"
              >
                examples ▾
              </button>
            </div>

            {/* Examples dropdown */}
            <AnimatePresence>
              {examplesOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute z-30 mt-2 w-72 bg-bg-2 border border-border rounded-xl shadow-surface-lg overflow-hidden"
                >
                  {EXAMPLE_EQUATIONS.map(ex => (
                    <button
                      key={ex.id}
                      onClick={() => {
                        setEquation(ex.equation);
                        setExamplesOpen(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-surface transition-colors border-b border-border/50 last:border-0"
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-xs text-green-DEFAULT">{ex.equation}</span>
                        <span className="tag-blue">{ex.tag}</span>
                      </div>
                      <span className="text-xs text-text-tertiary">{ex.description}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Center — input */}
          <div className="flex-1">
            <EquationInput />
          </div>

          {/* Right — debug toggle */}
          <div className="flex-shrink-0 flex items-center gap-2 pt-1">
            <button
              onClick={() => setDebugPanelOpen(!debugPanelOpen)}
              className={cn(
                'btn-ghost px-3 py-2 text-xs font-mono flex items-center gap-2',
                debugPanelOpen && 'border-green-border text-green-DEFAULT bg-green-dim',
              )}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 4h10M2 7h10M2 10h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              Debug
            </button>
            <button
              onClick={reset}
              className="btn-ghost px-3 py-2 text-xs font-mono text-neon-red border-neon-red-border/50 hover:bg-neon-red-dim"
              title="Reset everything"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Main 3-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — Constraint panel */}
        <div
          className="flex-shrink-0 border-r border-border bg-bg-2 overflow-hidden flex flex-col"
          style={{ width: leftWidth }}
        >
          <ConstraintPanel />
        </div>

        {/* Drag handle left */}
        <div
          onMouseDown={() => { isDraggingLeft.current = true; }}
          className="w-1 bg-border hover:bg-green-DEFAULT/30 cursor-col-resize transition-colors flex-shrink-0"
        />

        {/* Center — Results */}
        <div className="flex-1 overflow-hidden flex flex-col bg-bg min-w-0">
          <ResultsTable />
        </div>

        {/* Debug panel */}
        <AnimatePresence>
          {debugPanelOpen && (
            <>
              {/* Drag handle right */}
              <div
                onMouseDown={() => { isDraggingRight.current = true; }}
                className="w-1 bg-border hover:bg-green-DEFAULT/30 cursor-col-resize transition-colors flex-shrink-0"
              />
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: rightWidth, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex-shrink-0 border-l border-border bg-bg-2 overflow-hidden"
              >
                <DebugPanel />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Status bar */}
      <div className="flex-shrink-0 bg-bg-3 border-t border-border px-6 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-mono text-text-tertiary">
            QuantSolve Engine v1.0 · No <code className="text-text-muted">eval()</code> · 100% custom parser
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-mono text-text-tertiary">
          <span>↵ parse</span>
          <span>⌘↵ solve</span>
          <span>⎋ blur</span>
          <span>↑↓ history</span>
        </div>
      </div>
    </div>
  );
}
