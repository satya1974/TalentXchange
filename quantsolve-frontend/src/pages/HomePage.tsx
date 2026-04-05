import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { EXAMPLE_EQUATIONS, clientLex, TOKEN_COLORS, formatSolveTime, API_BASE, cn } from '../lib/utils';

// Animated counter
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const duration = 1200;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// Typewriter equation cycle
const CYCLING_EQUATIONS = [
  { eq: '150a + 100b + 50c = 5000', result: '847 portfolio combinations' },
  { eq: '10x + 20y = 100', result: '6 whole-number solutions' },
  { eq: '((10x + 20y) * 2) + 5z = 500', result: 'BODMAS parsed correctly' },
  { eq: '2x + 4y = 3', result: 'No solutions — GCD check failed' },
  { eq: '10a + 15b + 20c + 50d + 5e = 1000', result: '1000+ combinations found' },
];

function EquationTypewriter() {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');

  useEffect(() => {
    const timings = { in: 600, hold: 2600, out: 500 };
    const timer = setTimeout(() => {
      if (phase === 'in') setPhase('hold');
      else if (phase === 'hold') setPhase('out');
      else { setIdx(i => (i + 1) % CYCLING_EQUATIONS.length); setPhase('in'); }
    }, timings[phase]);
    return () => clearTimeout(timer);
  }, [phase, idx]);

  const current = CYCLING_EQUATIONS[idx];

  return (
    <div className="font-mono text-lg md:text-2xl h-16 flex flex-col justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: phase === 'out' ? 0 : 1, y: phase === 'out' ? -8 : 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="text-green-DEFAULT mb-1">{current.eq}</div>
          <div className="text-text-tertiary text-sm flex items-center gap-2">
            <span className="text-green-600">→</span>
            <span>{current.result}</span>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Mini solver embedded in landing
function MiniSolver() {
  const [equation, setEquation] = useState('');
  const [result, setResult] = useState<{ count?: number; time?: number; error?: string; solutions?: Record<string,number>[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const tokens = clientLex(equation);

  const handleSolve = async () => {
    if (!equation.trim()) return;
    setLoading(true);
    setResult(null);
    const start = performance.now();
    try {
      const res = await fetch(`${API_BASE}/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equation }),
      });
      const data = await res.json();
      const time = performance.now() - start;
      if (data.success) {
        setResult({ count: data.solutionCount, time, solutions: data.solutions?.slice(0, 5) });
      } else {
        setResult({ error: data.error });
      }
    } catch {
      setResult({ error: 'Server unreachable — run quantsolve-server locally' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-bg-2 border border-border rounded-2xl overflow-hidden shadow-surface-lg">
      {/* Terminal bar */}
      <div className="px-4 py-2.5 bg-surface border-b border-border flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-neon-red/60" />
          <div className="w-3 h-3 rounded-full bg-neon-amber/60" />
          <div className="w-3 h-3 rounded-full bg-green-DEFAULT/60" />
        </div>
        <span className="text-xs font-mono text-text-tertiary ml-2">quantsolve — live demo</span>
      </div>

      {/* Input */}
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 bg-bg border border-border rounded-lg flex items-center px-3">
            <span className="text-green-DEFAULT font-mono text-sm mr-2">›</span>
            <input
              type="text"
              value={equation}
              onChange={e => setEquation(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSolve()}
              placeholder="10x + 20y = 100"
              className="flex-1 bg-transparent py-2.5 font-mono text-sm text-text-primary placeholder-text-muted outline-none"
              spellCheck={false}
            />
          </div>
          <button
            onClick={handleSolve}
            disabled={loading || !equation.trim()}
            className="btn-primary px-5 py-2.5 text-sm font-semibold disabled:opacity-40"
          >
            {loading ? '...' : 'Run'}
          </button>
        </div>

        {/* Token preview */}
        {tokens.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tokens.slice(0, 20).map((tok, i) => (
              <span key={i} className="font-mono text-[10px] px-1.5 py-0.5 bg-surface rounded" style={{ color: TOKEN_COLORS[tok.type] ?? '#ff4466' }}>
                {tok.value}
              </span>
            ))}
          </div>
        )}

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {result.error ? (
                <div className="bg-neon-red-dim border border-neon-red-border rounded-lg p-3">
                  <p className="text-neon-red text-xs font-mono">{result.error}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-green-DEFAULT font-mono font-semibold">
                      {result.count?.toLocaleString()} solutions
                    </span>
                    <span className="tag-green">{result.time ? formatSolveTime(result.time) : ''}</span>
                  </div>
                  {result.solutions && result.solutions.length > 0 && (
                    <div className="bg-bg border border-border rounded-lg overflow-hidden">
                      {result.solutions.map((sol, i) => (
                        <div key={i} className="px-3 py-1.5 border-b border-border/40 last:border-0 font-mono text-xs text-text-secondary">
                          {Object.entries(sol).map(([k, v]) => `${k}=${v}`).join(',  ')}
                        </div>
                      ))}
                      {(result.count ?? 0) > 5 && (
                        <div className="px-3 py-1.5 text-xs text-text-tertiary font-mono">
                          + {((result.count ?? 0) - 5).toLocaleString()} more →{' '}
                          <Link to="/solve" className="text-green-DEFAULT hover:underline">Open full solver</Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Pipeline stage component
const PIPELINE = [
  { id: 'input', label: 'Input', sub: 'raw string', color: '#4a5d70' },
  { id: 'lexer', label: 'Lexer', sub: '6 token types', color: '#ffaa00' },
  { id: 'parser', label: 'Parser', sub: 'recursive descent', color: '#4af3ff' },
  { id: 'ast', label: 'AST', sub: 'expression tree', color: '#4af3ff' },
  { id: 'norm', label: 'Normalizer', sub: 'collect terms', color: '#00ff88' },
  { id: 'solver', label: 'Solver', sub: '3-layer pruning', color: '#00ff88' },
  { id: 'out', label: 'Output', sub: 'sorted results', color: '#00ff88' },
];

export function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, -40]);
  const [activePipelineStage, setActivePipelineStage] = useState<string | null>(null);

  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true, margin: '-100px' });

  return (
    <div className="bg-bg text-text-primary overflow-x-hidden">
      {/* Grid background */}
      <div className="fixed inset-0 bg-grid-pattern bg-grid opacity-100 pointer-events-none" />

      {/* ─── HERO ─── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col justify-center items-center pt-14 px-6">
        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-glow rounded-full blur-3xl pointer-events-none" />

        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="relative z-10 text-center max-w-4xl"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-dim border border-green-border mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-DEFAULT animate-pulse-green" />
            <span className="font-mono text-xs text-green-DEFAULT">No eval() · No SymPy · 100% from scratch</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display font-bold text-5xl md:text-7xl mb-6 tracking-tight leading-tight"
          >
            Solve what{' '}
            <span className="text-gradient-green">calculators</span>
            <br />
            can't.
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-text-secondary text-lg mb-8 max-w-2xl mx-auto leading-relaxed"
          >
            A full algebraic parser & multi-variable integer equation solver — built from scratch.
            Find every whole-number portfolio combination, instantly.
          </motion.p>

          {/* Typewriter */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mb-10"
          >
            <EquationTypewriter />
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="flex items-center justify-center gap-4"
          >
            <Link to="/solve" className="btn-primary px-8 py-3.5 text-base font-semibold animate-glow-pulse">
              Solve your equation →
            </Link>
            <Link to="/how-it-works" className="btn-ghost px-6 py-3.5 text-sm font-body">
              See the engine
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-xs text-text-tertiary font-mono">scroll</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-4 h-4 text-text-tertiary"
          >
            ↓
          </motion.div>
        </motion.div>
      </section>

      {/* ─── STATS BAR ─── */}
      <section ref={statsRef} className="border-y border-border bg-bg-2 py-12 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: 0, suffix: ' external libs', label: 'Parser built from scratch', color: 'text-green-DEFAULT' },
            { value: 200, suffix: 'ms', label: 'max latency for 4 variables', color: 'text-neon-blue' },
            { value: 15, suffix: '', label: 'distinct error types handled', color: 'text-neon-amber' },
            { value: 3, suffix: '-layer', label: 'pruning strategy in solver', color: 'text-green-DEFAULT' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={statsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="text-center"
            >
              <div className={cn('font-display font-bold text-4xl mb-1', stat.color)}>
                {statsInView ? <Counter target={stat.value} suffix={stat.suffix} /> : '0'}
              </div>
              <div className="text-xs text-text-tertiary font-body">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── PIPELINE ─── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="tag-green mb-4 inline-block">Engine pipeline</span>
            <h2 className="font-display font-bold text-3xl md:text-4xl mb-4">From string to solutions</h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              Click any stage to see exactly what happens to your equation.
            </p>
          </div>

          <div className="flex items-center gap-0 flex-wrap justify-center">
            {PIPELINE.map((stage, i) => (
              <div key={stage.id} className="flex items-center">
                <motion.button
                  onClick={() => setActivePipelineStage(s => s === stage.id ? null : stage.id)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className={cn(
                    'relative px-5 py-4 rounded-xl border transition-all duration-200 text-left',
                    activePipelineStage === stage.id
                      ? 'bg-green-dim border-green-border shadow-green-glow-sm'
                      : 'bg-surface border-border hover:border-border-2',
                  )}
                >
                  <div className="font-semibold text-sm font-body mb-0.5" style={{ color: activePipelineStage === stage.id ? stage.color : undefined }}>
                    {stage.label}
                  </div>
                  <div className="text-xs text-text-tertiary font-mono">{stage.sub}</div>
                </motion.button>
                {i < PIPELINE.length - 1 && (
                  <div className="w-6 h-px bg-border mx-1 flex-shrink-0 relative">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 text-text-muted text-xs">›</div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Stage detail */}
          <AnimatePresence>
            {activePipelineStage && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-bg-2 border border-green-border rounded-xl p-6">
                  {activePipelineStage === 'lexer' && (
                    <div>
                      <h3 className="font-semibold text-neon-amber mb-3">Lexer — tokenization</h3>
                      <p className="text-text-secondary text-sm mb-3">Converts raw string into typed tokens. Handles unicode operators, implicit multiplication injection, and decimal rejection.</p>
                      <div className="font-mono text-xs bg-bg rounded-lg p-3 text-text-secondary">
                        <span className="text-text-tertiary">Input: </span><span className="text-text-primary">"10x + 20y = 100"</span><br/>
                        <span className="text-text-tertiary">Output: </span>
                        <span className="text-neon-amber">[NUM:10]</span>{' '}
                        <span className="text-green-DEFAULT">[VAR:x]</span>{' '}
                        <span className="text-text-secondary">[PLUS]</span>{' '}
                        <span className="text-neon-amber">[NUM:20]</span>{' '}
                        <span className="text-green-DEFAULT">[VAR:y]</span>{' '}
                        <span className="text-neon-blue">[EQ]</span>{' '}
                        <span className="text-neon-amber">[NUM:100]</span>
                      </div>
                    </div>
                  )}
                  {activePipelineStage === 'solver' && (
                    <div>
                      <h3 className="font-semibold text-green-DEFAULT mb-3">Solver — 3-layer pruning backtracker</h3>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        {['Layer 1: Budget ceiling — maxVal = floor(remaining/coeff)', 'Layer 2: Suffix min/max — O(1) remainder bounds check', 'Layer 3: Parity step — step=2 for even/odd constraints'].map((l, i) => (
                          <div key={i} className="bg-bg border border-green-border/30 rounded-lg p-3">
                            <span className="text-text-secondary text-xs font-mono">{l}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {!['lexer', 'solver'].includes(activePipelineStage) && (
                    <p className="text-text-secondary text-sm">
                      Stage: <span className="text-green-DEFAULT font-mono">{activePipelineStage}</span> — click the stage for detailed docs in the{' '}
                      <Link to="/how-it-works" className="text-green-DEFAULT hover:underline">How it works</Link> page.
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ─── LIVE DEMO ─── */}
      <section className="py-24 px-6 bg-bg-2 border-y border-border">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <span className="tag-green mb-4 inline-block">Live engine</span>
            <h2 className="font-display font-bold text-3xl md:text-4xl mb-4">Try it right here</h2>
            <p className="text-text-secondary">Type any equation. Press Enter. Your server must be running on port 5500.</p>
          </div>
          <MiniSolver />
        </div>
      </section>

      {/* ─── EXAMPLES ─── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="tag-blue mb-4 inline-block">Problem statement examples</span>
            <h2 className="font-display font-bold text-3xl md:text-4xl">6 scenarios. All solved.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {EXAMPLE_EQUATIONS.map((ex, i) => (
              <motion.div
                key={ex.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                whileHover={{ y: -2 }}
              >
                <Link
                  to={`/solve?eq=${encodeURIComponent(ex.equation)}`}
                  className="block bg-surface border border-border hover:border-green-border rounded-xl p-4 transition-all duration-200 hover:shadow-green-glow-sm group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="tag-blue">{ex.tag}</span>
                    <span className="text-text-tertiary group-hover:text-green-DEFAULT transition-colors text-sm">→</span>
                  </div>
                  <div className="font-mono text-sm text-green-DEFAULT mb-1 truncate">{ex.equation}</div>
                  <div className="text-xs text-text-tertiary">{ex.description}</div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA FOOTER SECTION ─── */}
      <section className="py-24 px-6 bg-bg-2 border-t border-border relative overflow-hidden">
        {/* Equation ticker */}
        <div className="absolute inset-x-0 top-0 h-8 flex overflow-hidden opacity-10 pointer-events-none">
          <motion.div
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            className="flex gap-16 text-xs font-mono text-green-DEFAULT whitespace-nowrap"
          >
            {[...Array(4)].flatMap(() =>
              EXAMPLE_EQUATIONS.map(ex => (
                <span key={Math.random()}>{ex.equation}</span>
              ))
            )}
          </motion.div>
        </div>

        <div className="max-w-2xl mx-auto text-center relative z-10">
          <h2 className="font-display font-bold text-4xl md:text-5xl mb-6 leading-tight">
            Ready to solve the<br />
            <span className="text-gradient-green">unsolvable?</span>
          </h2>
          <p className="text-text-secondary mb-10">
            Multi-variable. Constrained. Bracket-nested. GCD-impossible. QuantSolve handles all of it.
          </p>
          <Link
            to="/solve"
            className="btn-primary inline-block px-10 py-4 text-lg font-semibold animate-glow-pulse"
          >
            Launch QuantSolve →
          </Link>
        </div>
      </section>
    </div>
  );
}
