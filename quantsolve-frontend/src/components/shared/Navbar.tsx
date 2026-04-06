import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useSolverStore } from '../../store/solverStore';
import { cn } from '../../lib/utils';

export function Navbar() {
  const location = useLocation();
  const { history, clearHistory } = useSolverStore();
  const [historyOpen, setHistoryOpen] = useState(false);

  const navLinks = [
    { href: '/how-it-works', label: 'How it works' },
    { href: '/playground', label: 'Playground' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-surface border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-green-dim border border-green-border flex items-center justify-center">
              <span className="font-display font-bold text-green-DEFAULT text-sm">QS</span>
            </div>
            <div className="absolute inset-0 rounded-lg bg-green-glow opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
          <span className="font-display font-semibold text-text-primary text-sm tracking-tight">
            QuantSolve
          </span>
        </Link>

        {/* Center nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(link => (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-body transition-all duration-150',
                location.pathname === link.href
                  ? 'text-text-primary bg-surface-2'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* History dropdown */}
          <div className="relative">
            <button
              onClick={() => setHistoryOpen(o => !o)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-body transition-all duration-150 btn-ghost',
                historyOpen && 'border-border-3 text-text-primary bg-surface'
              )}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v5l3 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
              </svg>
              <span className="text-xs">History</span>
              {history.length > 0 && (
                <span className="bg-green-dim text-green-DEFAULT border border-green-border text-xs rounded-full px-1.5 py-0.5 font-mono leading-none">
                  {history.length}
                </span>
              )}
            </button>

            <AnimatePresence>
              {historyOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-80 bg-bg-2 border border-border rounded-xl shadow-surface-lg overflow-hidden"
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                    <span className="text-xs text-text-tertiary font-mono uppercase tracking-wider">Solve history</span>
                    {history.length > 0 && (
                      <button onClick={clearHistory} className="text-xs text-text-tertiary hover:text-neon-red transition-colors">
                        Clear
                      </button>
                    )}
                  </div>
                  {history.length === 0 ? (
                    <div className="px-3 py-6 text-center text-text-tertiary text-xs">No solves yet</div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto no-scrollbar">
                      {history.map((entry) => (
                        <Link
                          key={entry.id}
                          to={`/solve?eq=${encodeURIComponent(entry.equation)}`}
                          onClick={() => setHistoryOpen(false)}
                          className="flex items-center justify-between px-3 py-2.5 hover:bg-surface transition-colors group"
                        >
                          <span className="font-mono text-xs text-text-secondary group-hover:text-green-DEFAULT transition-colors truncate flex-1">
                            {entry.equation}
                          </span>
                          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                            <span className="text-xs text-text-tertiary">{entry.solutionCount} sols</span>
                            <span className="text-xs text-green-600">{entry.solveTime}ms</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* GitHub */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="btn-ghost p-2 rounded-md"
            title="GitHub"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
          </a>

          {/* Launch CTA */}
          <Link
            to="/solve"
            className="btn-primary px-4 py-1.5 text-sm font-semibold"
          >
            Launch app →
          </Link>
        </div>
      </div>
    </nav>
  );
}
