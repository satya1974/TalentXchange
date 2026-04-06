import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE, EXAMPLE_EQUATIONS, formatSolveTime, cn } from '../lib/utils';

interface BatchResult {
  equation: string;
  status: 'pending' | 'solving' | 'success' | 'error';
  count?: number;
  time?: number;
  error?: string;
}

export function PlaygroundPage() {
  const [batchInput, setBatchInput] = useState(
    EXAMPLE_EQUATIONS.map(e => e.equation).join('\n')
  );
  const [results, setResults] = useState<BatchResult[]>([]);
  const [running, setRunning] = useState(false);

  const runBatch = async () => {
    const equations = batchInput.split('\n').map(e => e.trim()).filter(Boolean);
    if (!equations.length) return;

    setRunning(true);
    const initial: BatchResult[] = equations.map(eq => ({ equation: eq, status: 'pending' }));
    setResults(initial);

    for (let i = 0; i < equations.length; i++) {
      setResults(r => r.map((row, j) => j === i ? { ...row, status: 'solving' } : row));
      const start = performance.now();
      try {
        const res = await fetch(`${API_BASE}/solve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ equation: equations[i] }),
        });
        const data = await res.json();
        const time = performance.now() - start;
        setResults(r => r.map((row, j) => j === i ? {
          ...row,
          status: data.success ? 'success' : 'error',
          count: data.solutionCount,
          time: Math.round(time),
          error: data.error,
        } : row));
      } catch {
        setResults(r => r.map((row, j) => j === i ? { ...row, status: 'error', error: 'Server unreachable' } : row));
      }
    }
    setRunning(false);
  };

  const [stressResult, setStressResult] = useState<{ time?: number; count?: number; error?: string } | null>(null);
  const [stressRunning, setStressRunning] = useState(false);

  const runStress = async () => {
    setStressRunning(true);
    setStressResult(null);
    const start = performance.now();
    try {
      const res = await fetch(`${API_BASE}/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equation: '10a + 15b + 20c + 50d + 5e = 1000' }),
      });
      const data = await res.json();
      const time = performance.now() - start;
      setStressResult({ time: Math.round(time), count: data.solutionCount, error: data.error });
    } catch {
      setStressResult({ error: 'Server unreachable' });
    } finally {
      setStressRunning(false);
    }
  };

  return (
    <div className="bg-bg text-text-primary pt-14 min-h-screen">
      <div className="fixed inset-0 bg-grid-pattern bg-grid opacity-50 pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-20 space-y-16">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <span className="tag-blue mb-6 inline-block">Playground</span>
          <h1 className="font-display font-bold text-5xl mb-4">Stress-test the engine</h1>
          <p className="text-text-secondary text-lg">Batch runs, benchmarks, and stress tests. Push the limits.</p>
        </motion.div>

        {/* Stress test */}
        <section>
          <div className="mb-6">
            <h2 className="font-display font-bold text-2xl mb-2">5-variable benchmark</h2>
            <p className="text-text-secondary text-sm">
              <span className="font-mono text-green-DEFAULT">10a + 15b + 20c + 50d + 5e = 1000</span> — the hardest PS example.
              This is where brute-force dies and pruning wins.
            </p>
          </div>

          <div className="bg-bg-2 border border-border rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={runStress}
                disabled={stressRunning}
                className="btn-primary px-6 py-2.5 font-semibold"
              >
                {stressRunning ? (
                  <span className="flex items-center gap-2">
                    <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="inline-block w-4 h-4 border-2 border-bg border-t-transparent rounded-full" />
                    Running benchmark...
                  </span>
                ) : 'Run 5-variable benchmark →'}
              </button>
              <span className="text-xs text-text-tertiary font-mono">Target: &lt;200ms</span>
            </div>

            <AnimatePresence>
              {stressResult && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  {stressResult.error ? (
                    <div className="bg-neon-red-dim border border-neon-red-border rounded-lg p-3 text-neon-red text-sm font-mono">{stressResult.error}</div>
                  ) : (
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: 'Solve time', value: stressResult.time !== undefined ? formatSolveTime(stressResult.time) : '—', good: (stressResult.time ?? 999) < 200 },
                        { label: 'Solutions found', value: stressResult.count?.toLocaleString() ?? '—', good: true },
                        { label: 'NFR1 status', value: (stressResult.time ?? 999) < 200 ? 'PASS ✓' : 'FAIL ✗', good: (stressResult.time ?? 999) < 200 },
                      ].map(({ label, value, good }) => (
                        <div key={label} className={cn('border rounded-xl p-4', good ? 'bg-green-dim border-green-border' : 'bg-neon-red-dim border-neon-red-border')}>
                          <div className="text-xs text-text-tertiary font-mono mb-1">{label}</div>
                          <div className={cn('font-display font-bold text-2xl', good ? 'text-green-DEFAULT' : 'text-neon-red')}>{value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Batch solver */}
        <section>
          <div className="mb-6">
            <h2 className="font-display font-bold text-2xl mb-2">Batch solver</h2>
            <p className="text-text-secondary text-sm">One equation per line. Runs sequentially. Perfect for running all 6 PS examples at once.</p>
          </div>

          <div className="bg-bg-2 border border-border rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <span className="text-xs text-text-tertiary font-mono">equations — one per line</span>
              <button onClick={runBatch} disabled={running} className="btn-primary px-5 py-2 text-sm font-semibold">
                {running ? 'Running...' : `Run all (${batchInput.split('\n').filter(l => l.trim()).length}) →`}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
              {/* Input */}
              <div className="p-4">
                <textarea
                  value={batchInput}
                  onChange={e => setBatchInput(e.target.value)}
                  rows={10}
                  className="w-full bg-transparent font-mono text-sm text-text-primary resize-none outline-none placeholder-text-muted"
                  placeholder="10x + 20y = 100&#10;50a = 200&#10;2x + 4y = 3"
                  spellCheck={false}
                />
              </div>

              {/* Results */}
              <div className="p-4">
                {results.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-text-tertiary text-sm font-mono">
                    Results appear here
                  </div>
                ) : (
                  <div className="space-y-2">
                    {results.map((r, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0"
                      >
                        {/* Status icon */}
                        <div className="w-5 flex-shrink-0">
                          {r.status === 'pending' && <span className="text-text-muted text-xs">○</span>}
                          {r.status === 'solving' && (
                            <motion.span animate={{ opacity: [1,0.3,1] }} transition={{ duration: 0.8, repeat: Infinity }} className="text-neon-amber text-xs">●</motion.span>
                          )}
                          {r.status === 'success' && <span className="text-green-DEFAULT text-xs">✓</span>}
                          {r.status === 'error' && <span className="text-neon-red text-xs">✗</span>}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-xs text-text-secondary truncate">{r.equation}</div>
                          {r.status === 'success' && (
                            <div className="text-[10px] text-text-tertiary font-mono mt-0.5">
                              <span className="text-green-DEFAULT">{r.count?.toLocaleString()} sols</span>
                              {r.time !== undefined && <span className="ml-2">{r.time}ms</span>}
                            </div>
                          )}
                          {r.status === 'error' && (
                            <div className="text-[10px] text-neon-red font-mono mt-0.5 truncate">{r.error}</div>
                          )}
                        </div>

                        {r.time !== undefined && (
                          <span className={cn(
                            'text-[10px] font-mono flex-shrink-0',
                            r.time < 200 ? 'text-green-DEFAULT' : r.time < 500 ? 'text-neon-amber' : 'text-neon-red',
                          )}>
                            {r.time}ms
                          </span>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
