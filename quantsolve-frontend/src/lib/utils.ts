import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5500';

export const EXAMPLE_EQUATIONS = [
  {
    id: 'ex1',
    label: 'Single variable',
    equation: '50x = 200',
    description: 'The simplest case — one unknown',
    tag: 'basics',
  },
  {
    id: 'ex2',
    label: 'Two variables',
    equation: '10x + 20y = 100',
    description: 'Two-asset allocation',
    tag: '2-var',
  },
  {
    id: 'ex3',
    label: '5-variable benchmark',
    equation: '10a + 15b + 20c + 50d + 5e = 1000',
    description: 'The real challenge — 5 stocks',
    tag: '5-var',
  },
  {
    id: 'ex4',
    label: 'With constraints',
    equation: '10x + 20y + 5z = 100',
    description: 'Market rules applied',
    tag: 'constrained',
  },
  {
    id: 'ex5',
    label: 'BODMAS brackets',
    equation: '((10x + 20y) * 2) + 5z = 500',
    description: 'Full order-of-operations parsing',
    tag: 'brackets',
  },
  {
    id: 'ex6',
    label: 'Impossible math',
    equation: '2x + 4y = 3',
    description: 'GCD = 2, target = 3 — no solutions exist',
    tag: 'impossible',
  },
] as const;

export const TOKEN_COLORS: Record<string, string> = {
  NUMBER: '#ffaa00',
  VARIABLE: '#00ff88',
  PLUS: '#8899aa',
  MINUS: '#8899aa',
  MUL: '#8899aa',
  DIV: '#8899aa',
  EQUAL: '#4af3ff',
  LPAREN: '#e2eaf4',
  RPAREN: '#e2eaf4',
  EOF: '#4a5d70',
};

// Client-side mini lexer — mirrors server lexer for live preview only
export function clientLex(input: string): Array<{ type: string; value: string; position: number }> {
  const tokens: Array<{ type: string; value: string; position: number }> = [];
  let i = 0;
  const src = input
    .replace(/\u2212/g, '-')
    .replace(/\u00D7/g, '*');

  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }

    if (/[0-9]/.test(ch)) {
      let num = '';
      const pos = i;
      while (i < src.length && /[0-9]/.test(src[i])) num += src[i++];
      tokens.push({ type: 'NUMBER', value: num, position: pos });
      continue;
    }

    if (/[a-zA-Z]/.test(ch)) {
      let name = '';
      const pos = i;
      while (i < src.length && /[a-zA-Z0-9]/.test(src[i])) name += src[i++];
      tokens.push({ type: 'VARIABLE', value: name.toLowerCase(), position: pos });
      continue;
    }

    const opMap: Record<string, string> = {
      '+': 'PLUS', '-': 'MINUS', '*': 'MUL', '/': 'DIV',
      '(': 'LPAREN', ')': 'RPAREN', '=': 'EQUAL',
    };

    if (opMap[ch]) {
      tokens.push({ type: opMap[ch], value: ch, position: i });
    } else {
      tokens.push({ type: 'INVALID', value: ch, position: i });
    }
    i++;
  }

  // Inject implicit multiplication
  const result: typeof tokens = [];
  for (let j = 0; j < tokens.length; j++) {
    result.push(tokens[j]);
    if (j < tokens.length - 1) {
      const a = tokens[j], b = tokens[j + 1];
      const needsMul =
        (a.type === 'NUMBER' && b.type === 'VARIABLE') ||
        (a.type === 'NUMBER' && b.type === 'LPAREN') ||
        (a.type === 'RPAREN' && b.type === 'VARIABLE') ||
        (a.type === 'RPAREN' && b.type === 'NUMBER') ||
        (a.type === 'RPAREN' && b.type === 'LPAREN');
      if (needsMul) {
        result.push({ type: 'MUL', value: '×', position: a.position });
      }
    }
  }
  return result;
}

export function formatSolveTime(ms: number): string {
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}
