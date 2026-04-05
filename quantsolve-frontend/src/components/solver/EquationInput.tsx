import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSolverStore } from '../../store/solverStore';
import { clientLex, TOKEN_COLORS, cn } from '../../lib/utils';
import { useSolveMutation, buildApiConstraints } from '../../hooks/useApi';

interface EquationInputProps {
  onParsed?: (vars: string[], coeffs: Record<string, number>, target: number) => void;
}

type ParseStatus = 'idle' | 'valid' | 'error' | 'solving' | 'done';

export function EquationInput({ onParsed }: EquationInputProps) {
  const {
    equation, setEquation,
    constraints,
    isParsed, parseError,
    setParseState, setSolveResult, setSolving,
    resetConstraints,
    addHistory,
  } = useSolverStore();

  const [status, setStatus] = useState<ParseStatus>('idle');
  const [tokens, setTokens] = useState<ReturnType<typeof clientLex>>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const solveMutation = useSolveMutation();

  // Live tokenize on input
  const handleChange = useCallback((val: string) => {
    setEquation(val);
    if (!val.trim()) {
      setTokens([]);
      setStatus('idle');
      setLocalError(null);
      setParseState([], null);
      return;
    }
    const toks = clientLex(val);
    setTokens(toks);

    // Quick client-side validity check
    const hasEqual = toks.some(t => t.type === 'EQUAL');
    const hasVar = toks.some(t => t.type === 'VARIABLE');
    const hasInvalid = toks.some(t => t.type === 'INVALID');

    if (hasInvalid) { setStatus('error'); setLocalError('Invalid character detected'); }
    else if (!hasEqual) { setStatus('error'); setLocalError("Missing '=' sign"); }
    else if (!hasVar) { setStatus('error'); setLocalError('No variables found'); }
    else { setStatus('valid'); setLocalError(null); }
  }, [setEquation, setParseState]);

  // Parse → call API once to get coeffs + variables
  const handleParse = useCallback(async () => {
    if (!equation.trim() || status === 'error') return;
    setStatus('solving');

    try {
      const result = await solveMutation.mutateAsync({ equation, constraints: {} });
      if (result.success && result.coeffs && result.variableOrder) {
        setParseState(result.variableOrder, null);
        resetConstraints(result.coeffs, result.target ?? 0);
        onParsed?.(result.variableOrder, result.coeffs, result.target ?? 0);
        setStatus('valid');
      } else {
        setParseState([], result.error ?? 'Parse failed');
        setLocalError(result.error ?? 'Parse failed');
        setStatus('error');
      }
    } catch {
      setLocalError('Server unreachable');
      setStatus('error');
    }
  }, [equation, status, solveMutation, setParseState, resetConstraints, onParsed, constraints]);

  // Full solve
  const handleSolve = useCallback(async () => {
    if (!isParsed) return;
    setSolving(true);
    setStatus('solving');

    const apiConstraints = buildApiConstraints(constraints);
    try {
      const result = await solveMutation.mutateAsync({ equation, constraints: apiConstraints });
      setSolveResult(result);
      setStatus('done');
      if (result.success && result.solutionCount !== undefined) {
        addHistory({
          id: Date.now().toString(),
          equation,
          timestamp: Date.now(),
          solutionCount: result.solutionCount,
          solveTime: Math.round(result.solveTime ?? 0),
        });
      }
    } catch {
      setStatus('error');
    } finally {
      setSolving(false);
    }
  }, [isParsed, equation, constraints, solveMutation, setSolveResult, setSolving, addHistory]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && document.activeElement === inputRef.current) {
        e.preventDefault();
        if (!isParsed) handleParse();
        else if (e.metaKey || e.ctrlKey) handleSolve();
        else handleParse();
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isParsed, handleParse, handleSolve]);

  const statusColor = {
    idle: 'bg-text-tertiary',
    valid: 'bg-green-DEFAULT',
    error: 'bg-neon-red',
    solving: 'bg-neon-amber',
    done: 'bg-green-DEFAULT',
  }[status];

  const statusLabel = {
    idle: 'enter equation',
    valid: 'valid syntax',
    error: localError || parseError || 'syntax error',
    solving: 'processing...',
    done: 'solved',
  }[status];

  return (
    <div className="w-full space-y-2">
      {/* Main input row */}
      <div className="relative">
        <div
          className={cn(
            'flex items-center gap-0 rounded-xl border transition-all duration-200',
            status === 'error' && 'border-neon-red-border shadow-[0_0_0_3px_rgba(255,68,102,0.06)]',
            status === 'valid' || status === 'done' ? 'border-green-border shadow-green-glow-sm' : '',
            status === 'idle' && 'border-border',
            status === 'solving' && 'border-neon-amber-border',
          )}
        >
          {/* Status dot */}
          <div className="pl-4 pr-3 flex items-center">
            <motion.div
              className={cn('w-2 h-2 rounded-full', statusColor)}
              animate={status === 'solving' ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
              transition={{ duration: 0.8, repeat: status === 'solving' ? Infinity : 0 }}
            />
          </div>

          {/* Equation input */}
          <input
            ref={inputRef}
            type="text"
            value={equation}
            onChange={e => handleChange(e.target.value)}
            placeholder="e.g. 150a + 100b + 50c = 5000"
            className="flex-1 bg-transparent py-3.5 text-base font-mono text-text-primary placeholder-text-muted outline-none"
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
          />

          {/* Status label */}
          <div className="px-3 flex-shrink-0">
            <AnimatePresence mode="wait">
              <motion.span
                key={status}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  'text-xs font-mono',
                  status === 'error' && 'text-neon-red',
                  (status === 'valid' || status === 'done') && 'text-green-DEFAULT',
                  status === 'solving' && 'text-neon-amber',
                  status === 'idle' && 'text-text-tertiary',
                )}
              >
                {statusLabel}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-border self-center" />

          {/* Parse button */}
          <button
            onClick={handleParse}
            disabled={status === 'solving' || status === 'idle' || status === 'error'}
            className={cn(
              'px-5 py-3.5 text-sm font-semibold font-body transition-all duration-150 rounded-r-xl',
              status === 'valid'
                ? 'bg-green-DEFAULT text-bg hover:bg-green-600 cursor-pointer'
                : 'text-text-tertiary cursor-not-allowed bg-transparent',
            )}
          >
            {status === 'solving' ? (
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                Parsing...
              </motion.span>
            ) : 'Parse →'}
          </button>
        </div>

        {/* Keyboard hint */}
        <div className="absolute -bottom-5 right-0 flex items-center gap-3 text-xs text-text-tertiary font-mono">
          <span>↵ parse</span>
          {isParsed && <span>⌘↵ solve</span>}
        </div>
      </div>

      {/* Token stream */}
      <AnimatePresence>
        {tokens.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-1.5 flex-wrap px-1 pt-3">
              <span className="text-xs text-text-tertiary font-mono mr-1">tokens:</span>
              {tokens.map((tok, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.1, delay: i * 0.02 }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface border border-border text-xs font-mono"
                  title={`${tok.type} @ pos ${tok.position}`}
                >
                  <span style={{ color: TOKEN_COLORS[tok.type] ?? '#ff4466' }}>{tok.value}</span>
                  <span className="text-text-muted text-[10px]">{tok.type.toLowerCase()}</span>
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Solve button — appears after parse */}
      <AnimatePresence>
        {isParsed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="pt-1"
          >
            <button
              onClick={handleSolve}
              disabled={solveMutation.isPending}
              className="btn-primary w-full py-3 text-base font-semibold tracking-tight relative overflow-hidden group"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                initial={{ x: '-100%' }}
                animate={solveMutation.isPending ? {} : { x: '200%' }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
              />
              {solveMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="inline-block w-4 h-4 border-2 border-bg border-t-transparent rounded-full"
                  />
                  Solving...
                </span>
              ) : (
                'Solve all combinations →'
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
