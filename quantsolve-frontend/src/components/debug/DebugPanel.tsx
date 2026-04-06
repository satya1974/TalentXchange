import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSolverStore, type ASTNode } from '../../store/solverStore';
import { clientLex, TOKEN_COLORS, formatSolveTime, cn } from '../../lib/utils';

// Recursive AST tree renderer
function ASTNodeView({ node, depth = 0 }: { node: ASTNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 3);

  const nodeColor = {
    BinaryOp: '#4af3ff',
    UnaryOp: '#4af3ff',
    Variable: '#00ff88',
    Number: '#ffaa00',
  }[node.type] ?? '#8899aa';

  const nodeLabel =
    node.type === 'Number' ? `${node.value}` :
    node.type === 'Variable' ? node.name! :
    node.type === 'BinaryOp' ? `"${node.operator}"` :
    node.type === 'UnaryOp' ? `"${node.op}"` : node.type;

  const hasChildren = node.left || node.right || node.operand;

  return (
    <div style={{ marginLeft: depth * 14 }}>
      <div
        className={cn('flex items-center gap-1.5 py-0.5 group', hasChildren && 'cursor-pointer')}
        onClick={() => hasChildren && setOpen(o => !o)}
      >
        {hasChildren && (
          <span className="text-text-tertiary text-[10px] w-3">{open ? '▾' : '▸'}</span>
        )}
        {!hasChildren && <span className="w-3" />}

        {/* Node type pill */}
        <span
          className="text-[10px] font-mono px-1.5 py-0.5 rounded"
          style={{
            color: nodeColor,
            background: nodeColor + '15',
            border: `0.5px solid ${nodeColor}30`,
          }}
        >
          {node.type}
        </span>

        {/* Node value */}
        <span className="font-mono text-xs" style={{ color: nodeColor }}>
          {nodeLabel}
        </span>
      </div>

      <AnimatePresence>
        {open && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-l border-border ml-4"
          >
            {node.left && <ASTNodeView node={node.left} depth={depth + 1} />}
            {node.right && <ASTNodeView node={node.right} depth={depth + 1} />}
            {node.operand && <ASTNodeView node={node.operand} depth={depth + 1} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const TABS = ['ast', 'coeffs', 'tokens', 'meta'] as const;
type Tab = typeof TABS[number];

export function DebugPanel() {
  const { solveResult, activeDebugTab, setActiveDebugTab, equation } = useSolverStore();
  const tokens = equation ? clientLex(equation) : [];

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="border-b border-border px-3 flex items-center gap-0.5 flex-shrink-0">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveDebugTab(tab)}
            className={cn(
              'px-3 py-2.5 text-xs font-mono transition-all duration-150 border-b-2 -mb-px',
              activeDebugTab === tab
                ? 'text-green-DEFAULT border-green-DEFAULT'
                : 'text-text-tertiary border-transparent hover:text-text-secondary',
            )}
          >
            {tab}
          </button>
        ))}
        <div className="ml-auto">
          <span className="tag-green text-[10px]">engine internals</span>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeDebugTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
          >
            {/* AST TAB */}
            {activeDebugTab === 'ast' && (
              <div>
                {solveResult?.ast ? (
                  <div className="space-y-2">
                    <div className="text-xs text-text-tertiary font-mono mb-3">
                      Parse tree for: <span className="text-text-secondary">{solveResult.input}</span>
                    </div>
                    <div className="bg-bg-2 rounded-lg p-3 border border-border">
                      <div className="text-xs text-text-tertiary font-mono mb-2">LHS</div>
                      <ASTNodeView node={solveResult.ast.left} />
                    </div>
                    <div className="bg-bg-2 rounded-lg p-3 border border-border">
                      <div className="text-xs text-text-tertiary font-mono mb-2">RHS</div>
                      <ASTNodeView node={solveResult.ast.right} />
                    </div>
                    {solveResult.meta?.astDepth && (
                      <div className="text-xs text-text-tertiary font-mono">
                        Tree depth: <span className="text-neon-blue">{solveResult.meta.astDepth}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-text-tertiary font-mono py-6 text-center">
                    Solve an equation to see the AST
                  </div>
                )}
              </div>
            )}

            {/* COEFFS TAB */}
            {activeDebugTab === 'coeffs' && (
              <div className="space-y-3">
                {solveResult?.coeffs ? (
                  <>
                    <div className="text-xs text-text-tertiary font-mono mb-2">
                      Normalized linear form: coefficients after rearranging all terms
                    </div>
                    <div className="bg-bg-2 rounded-lg border border-border overflow-hidden">
                      <div className="px-3 py-2 bg-surface border-b border-border">
                        <span className="text-xs font-mono text-text-tertiary">variable → coefficient</span>
                      </div>
                      {Object.entries(solveResult.coeffs).map(([v, coeff]) => (
                        <div key={v} className="px-3 py-2 border-b border-border/50 flex items-center justify-between">
                          <span className="font-mono text-green-DEFAULT text-sm">{v}</span>
                          <div className="flex items-center gap-3">
                            <div className="h-1 w-24 bg-border rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-DEFAULT rounded-full"
                                style={{
                                  width: `${Math.min(100, (coeff / Math.max(...Object.values(solveResult.coeffs!))) * 100)}%`
                                }}
                              />
                            </div>
                            <span className="font-mono text-neon-amber text-sm w-12 text-right">{coeff}</span>
                          </div>
                        </div>
                      ))}
                      <div className="px-3 py-2 flex items-center justify-between bg-green-dim">
                        <span className="font-mono text-xs text-text-secondary">target (C)</span>
                        <span className="font-mono text-neon-blue font-semibold">{solveResult.target?.toLocaleString()}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-text-tertiary font-mono py-6 text-center">
                    Solve an equation to see coefficients
                  </div>
                )}
              </div>
            )}

            {/* TOKENS TAB */}
            {activeDebugTab === 'tokens' && (
              <div className="space-y-2">
                <div className="text-xs text-text-tertiary font-mono mb-2">
                  Lexer output — {tokens.length} tokens (including injected implicit ×)
                </div>
                {tokens.length === 0 ? (
                  <div className="text-xs text-text-tertiary font-mono py-6 text-center">
                    Type an equation above to see tokens
                  </div>
                ) : (
                  <div className="bg-bg-2 rounded-lg border border-border overflow-hidden">
                    <div className="grid grid-cols-3 px-3 py-1.5 bg-surface border-b border-border text-[10px] font-mono text-text-tertiary">
                      <span>type</span><span>value</span><span>pos</span>
                    </div>
                    {tokens.map((tok, i) => (
                      <div key={i} className="grid grid-cols-3 px-3 py-1.5 border-b border-border/40 text-xs font-mono hover:bg-surface transition-colors">
                        <span style={{ color: TOKEN_COLORS[tok.type] ?? '#ff4466' }}>{tok.type}</span>
                        <span className="text-text-primary">{tok.value}</span>
                        <span className="text-text-tertiary">{tok.position}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* META TAB */}
            {activeDebugTab === 'meta' && (
              <div className="space-y-3">
                {solveResult ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Variables', value: solveResult.meta?.variableCount ?? '—', color: 'text-green-DEFAULT' },
                        { label: 'Constraints', value: solveResult.meta?.constraintCount ?? '—', color: 'text-neon-blue' },
                        { label: 'Solutions found', value: solveResult.solutionCount?.toLocaleString() ?? '—', color: 'text-green-DEFAULT' },
                        { label: 'Total computed', value: solveResult.totalFound?.toLocaleString() ?? '—', color: 'text-neon-amber' },
                        { label: 'Solve time', value: solveResult.solveTime ? formatSolveTime(solveResult.solveTime) : '—', color: 'text-green-DEFAULT' },
                        { label: 'Result capped', value: solveResult.capped ? 'YES' : 'no', color: solveResult.capped ? 'text-neon-amber' : 'text-text-secondary' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="bg-bg-2 border border-border rounded-lg p-3">
                          <div className="text-[10px] text-text-tertiary font-mono mb-1">{label}</div>
                          <div className={cn('text-lg font-mono font-semibold', color)}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Worker status */}
                    <div className="bg-bg-2 border border-border rounded-lg p-3">
                      <div className="text-[10px] text-text-tertiary font-mono mb-2">Pipeline execution</div>
                      {['Lexer', 'Parser', 'Normalizer', 'ConstraintEngine', 'Solver (worker thread)', 'ResultFormatter'].map((stage) => (
                        <div key={stage} className="flex items-center gap-2 py-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-DEFAULT flex-shrink-0" />
                          <span className="text-xs font-mono text-text-secondary">{stage}</span>
                          <span className="ml-auto text-[10px] font-mono text-green-600">✓</span>
                        </div>
                      ))}
                    </div>

                    {/* Warnings */}
                    {solveResult.warnings && solveResult.warnings.length > 0 && (
                      <div className="bg-neon-amber-dim border border-neon-amber-border rounded-lg p-3">
                        <div className="text-[10px] text-neon-amber font-mono mb-1">Warnings</div>
                        {solveResult.warnings.map((w, i) => (
                          <p key={i} className="text-xs text-neon-amber/80 font-mono">{w}</p>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-text-tertiary font-mono py-6 text-center">
                    Solve an equation to see metadata
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
