import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clientLex, TOKEN_COLORS, cn } from '../lib/utils';

function LexerVisualizer() {
  const [input, setInput] = useState('10x + 20y = 100');
  const [revealed, setRevealed] = useState<number>(0);
  const [playing, setPlaying] = useState(false);
  const tokens = clientLex(input);

  useEffect(() => {
    if (!playing) return;
    if (revealed >= tokens.length) { setPlaying(false); return; }
    const timer = setTimeout(() => setRevealed(r => r + 1), 200);
    return () => clearTimeout(timer);
  }, [playing, revealed, tokens.length]);

  const reset = () => { setRevealed(0); setPlaying(false); };
  const play = () => { setRevealed(0); setPlaying(true); };

  return (
    <div className="bg-bg-2 border border-border rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-neon-red/40" />
          <div className="w-3 h-3 rounded-full bg-neon-amber/40" />
          <div className="w-3 h-3 rounded-full bg-green-DEFAULT/40" />
        </div>
        <span className="font-mono text-xs text-text-tertiary ml-1">lexer.js — tokenizer visualizer</span>
      </div>
      <div className="p-5 space-y-4">
        {/* Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value); reset(); }}
            className="input-base flex-1 px-3 py-2 text-sm font-mono"
            placeholder="Type an equation..."
          />
          <button onClick={play} className="btn-primary px-4 py-2 text-sm font-semibold">
            {playing ? 'Playing...' : 'Tokenize →'}
          </button>
          <button onClick={reset} className="btn-ghost px-3 py-2 text-sm">Reset</button>
        </div>

        {/* Character highlight */}
        <div className="font-mono text-lg tracking-wider p-3 bg-bg rounded-lg border border-border flex flex-wrap gap-0">
          {input.split('').map((ch, i) => {
            const matchedToken = tokens.find(t => i >= t.position && i < t.position + (t.value.length));
            const isActive = matchedToken && tokens.indexOf(matchedToken) < revealed;
            return (
              <motion.span
                key={i}
                animate={isActive ? { opacity: 1 } : { opacity: 0.3 }}
                style={{ color: isActive && matchedToken ? (TOKEN_COLORS[matchedToken.type] ?? '#e2eaf4') : '#4a5d70' }}
              >
                {ch === ' ' ? '\u00A0' : ch}
              </motion.span>
            );
          })}
        </div>

        {/* Token stream */}
        <div className="flex flex-wrap gap-2 min-h-[2rem]">
          {tokens.slice(0, revealed).map((tok, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.7, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center"
            >
              <div
                className="px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold"
                style={{
                  color: TOKEN_COLORS[tok.type] ?? '#e2eaf4',
                  background: (TOKEN_COLORS[tok.type] ?? '#e2eaf4') + '12',
                  borderColor: (TOKEN_COLORS[tok.type] ?? '#e2eaf4') + '30',
                }}
              >
                {tok.value === '×' ? '× (implicit)' : tok.value}
              </div>
              <span className="text-[10px] text-text-tertiary font-mono mt-1">{tok.type}</span>
            </motion.div>
          ))}
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-green-DEFAULT rounded-full"
              animate={{ width: `${(revealed / tokens.length) * 100}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
          <span className="text-xs font-mono text-text-tertiary">{revealed}/{tokens.length}</span>
        </div>
      </div>
    </div>
  );
}

const ALGO_STEPS = [
  {
    title: 'GCD pre-filter',
    tag: 'O(V log M)',
    color: '#00ff88',
    desc: 'Before backtracking a single node, compute GCD of all coefficients. If target % GCD ≠ 0, no integer solutions can exist. This instantly rejects equations like 2x + 4y = 3 (GCD=2, target=3, 3%2≠0).',
    example: { eq: '2x + 4y = 3', result: 'GCD(2,4)=2 · 3%2=1 ≠ 0 → instant rejection, no backtracking' },
  },
  {
    title: 'Coefficient-descending sort',
    tag: 'O(V log V)',
    color: '#4af3ff',
    desc: 'Sort variables by coefficient descending before backtracking. Highest coefficient = fewest possible values = shallowest branching at the top of the tree. This minimizes the explosion at the root.',
    example: { eq: '10a + 50d + 5e = 1000', result: 'Solve order: d(50) → a(10) → e(5). d only has 0–20 possible values vs e\'s 0–200.' },
  },
  {
    title: 'Suffix min/max bounds',
    tag: 'O(1) per node',
    color: '#ffaa00',
    desc: 'Precompute for every depth i: minimum and maximum contribution the variables i..n can make. At each node: if remaining < suffixMin[i] → prune. If remaining > suffixMax[i] → prune. Both checks are O(1).',
    example: { eq: '10a + 15b + 20c = 500', result: 'At depth 1 (variable b), suffixMin = 0, suffixMax = 500. If remaining=3, suffixMin check fires instantly.' },
  },
  {
    title: 'Parity step optimization',
    tag: 'cuts iterations ÷2',
    color: '#00ff88',
    desc: 'When a variable has an even/odd constraint, the loop step becomes 2 instead of 1 and the start is adjusted to the first valid value. This halves the iterations without any additional checks.',
    example: { eq: 'x + y = 100 (x must be even)', result: 'x iterates: 0, 2, 4, 6... instead of 0, 1, 2, 3... — half the nodes examined.' },
  },
];

const ERROR_TYPES = [
  { code: 'INVALID_CHARACTER', category: 'syntax', input: '10x + @y = 100', msg: "Invalid character '@' at position 6" },
  { code: 'MISSING_EQUALS', category: 'syntax', input: '10x + 20y 100', msg: "Equation must contain exactly one '=' sign" },
  { code: 'NON_LINEAR_TERM', category: 'semantic', input: 'x * y = 100', msg: 'Non-linear term detected (x*y). Only linear equations supported.' },
  { code: 'DIVISION_BY_ZERO', category: 'semantic', input: '10x / 0 = 100', msg: 'Division by zero detected.' },
  { code: 'NO_SOLUTIONS', category: 'solver', input: '2x + 4y = 3', msg: 'No whole-number solutions exist. GCD(2,4)=2 does not divide 3.' },
  { code: 'UNBOUNDED_SEARCH', category: 'solver', input: 'x + y = 100', msg: 'Infinite answers detected. Please apply market limits.' },
  { code: 'VARIABLE_IN_DENOMINATOR', category: 'semantic', input: '100 / x = 10', msg: "Non-linear: variable 'x' in denominator." },
  { code: 'FRACTIONAL_COEFFICIENT', category: 'semantic', input: '3x / 2 = 12', msg: "Fractional coefficient (1.5) for variable 'x'." },
];

export function HowItWorksPage() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="bg-bg text-text-primary pt-14">
      <div className="fixed inset-0 bg-grid-pattern bg-grid opacity-50 pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 space-y-24">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <span className="tag-green mb-6 inline-block">Technical deep dive</span>
          <h1 className="font-display font-bold text-5xl mb-6 tracking-tight">How the engine works</h1>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto leading-relaxed">
            Every algorithm, every data structure, every design decision — explained with working examples you can run.
          </p>
        </motion.div>

        {/* Lexer */}
        <section>
          <div className="mb-8">
            <span className="tag-amber mb-3 inline-block">Phase 1</span>
            <h2 className="font-display font-bold text-3xl mb-3">Lexer — tokenization</h2>
            <p className="text-text-secondary leading-relaxed">
              The lexer scans the raw string character by character, emitting typed tokens.
              Handles unicode operators, implicit multiplication injection (10x → [10][×][x]),
              and rejects invalid characters immediately. No regex on the full equation — just a character-level state machine.
            </p>
          </div>
          <LexerVisualizer />
        </section>

        {/* Algorithm */}
        <section>
          <div className="mb-8">
            <span className="tag-green mb-3 inline-block">Phase 5 — Solver</span>
            <h2 className="font-display font-bold text-3xl mb-3">3-layer pruning backtracker</h2>
            <p className="text-text-secondary leading-relaxed">
              The naive approach — try every combination — produces billions of nodes for 5 variables.
              QuantSolve's solver uses three stacked pruning layers that cut the search to thousands of real nodes.
            </p>
          </div>

          <div className="flex gap-2 mb-6 flex-wrap">
            {ALGO_STEPS.map((step, i) => (
              <button
                key={i}
                onClick={() => setActiveStep(i)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-mono transition-all duration-150',
                  activeStep === i
                    ? 'border text-bg font-semibold'
                    : 'btn-ghost text-text-secondary',
                )}
                style={activeStep === i ? { background: step.color, borderColor: step.color } : {}}
              >
                {step.title}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-bg-2 border border-border rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <h3 className="font-semibold text-lg font-body" style={{ color: ALGO_STEPS[activeStep].color }}>
                  {ALGO_STEPS[activeStep].title}
                </h3>
                <span className="tag-green">{ALGO_STEPS[activeStep].tag}</span>
              </div>
              <p className="text-text-secondary mb-4 leading-relaxed">{ALGO_STEPS[activeStep].desc}</p>
              <div className="bg-bg border border-border rounded-xl p-4">
                <div className="text-xs text-text-tertiary font-mono mb-2">example</div>
                <div className="font-mono text-sm text-green-DEFAULT mb-1">{ALGO_STEPS[activeStep].example.eq}</div>
                <div className="font-mono text-xs text-text-secondary">{ALGO_STEPS[activeStep].example.result}</div>
              </div>
            </motion.div>
          </AnimatePresence>
        </section>

        {/* Error taxonomy */}
        <section>
          <div className="mb-8">
            <span className="tag-red mb-3 inline-block">Error handling</span>
            <h2 className="font-display font-bold text-3xl mb-3">15 error types. All handled.</h2>
            <p className="text-text-secondary leading-relaxed">
              Every error has a code, a category, and a human-readable message. Nothing crashes. Nothing swallows exceptions silently.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ERROR_TYPES.map((err, i) => (
              <motion.div
                key={err.code}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-bg-2 border border-border rounded-xl p-4 hover:border-neon-red-border transition-colors group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-xs text-neon-red">{err.code}</span>
                  <span className={cn(
                    'text-[10px] font-mono px-1.5 py-0.5 rounded',
                    err.category === 'syntax' && 'tag-blue',
                    err.category === 'semantic' && 'tag-amber',
                    err.category === 'solver' && 'tag-red',
                  )}>
                    {err.category}
                  </span>
                </div>
                <div className="font-mono text-xs text-text-tertiary mb-2">trigger: <span className="text-text-secondary">{err.input}</span></div>
                <div className="text-xs text-text-secondary leading-relaxed">{err.msg}</div>
              </motion.div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
