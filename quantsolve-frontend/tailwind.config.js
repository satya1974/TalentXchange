/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        bg: {
          DEFAULT: '#080c10',
          2: '#0d1117',
          3: '#111820',
        },
        surface: {
          DEFAULT: '#141c26',
          2: '#1a2535',
          3: '#1f2d3d',
        },
        border: {
          DEFAULT: '#1f2d3d',
          2: '#243447',
          3: '#2d3f52',
        },
        green: {
          DEFAULT: '#00ff88',
          dim: 'rgba(0,255,136,0.08)',
          glow: 'rgba(0,255,136,0.15)',
          border: 'rgba(0,255,136,0.25)',
          600: '#00cc6a',
          800: '#009950',
        },
        neon: {
          blue: '#4af3ff',
          'blue-dim': 'rgba(74,243,255,0.08)',
          'blue-border': 'rgba(74,243,255,0.2)',
          amber: '#ffaa00',
          'amber-dim': 'rgba(255,170,0,0.08)',
          'amber-border': 'rgba(255,170,0,0.2)',
          red: '#ff4466',
          'red-dim': 'rgba(255,68,102,0.08)',
          'red-border': 'rgba(255,68,102,0.2)',
        },
        text: {
          primary: '#e2eaf4',
          secondary: '#8899aa',
          tertiary: '#4a5d70',
          muted: '#2d3f52',
        },
      },
      backgroundImage: {
        'grid-pattern': `
          linear-gradient(rgba(0,255,136,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,136,0.03) 1px, transparent 1px)
        `,
        'grid-pattern-dense': `
          linear-gradient(rgba(0,255,136,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,136,0.04) 1px, transparent 1px)
        `,
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
      backgroundSize: {
        'grid': '40px 40px',
        'grid-sm': '20px 20px',
      },
      boxShadow: {
        'green-glow': '0 0 20px rgba(0,255,136,0.15), 0 0 60px rgba(0,255,136,0.05)',
        'green-glow-sm': '0 0 10px rgba(0,255,136,0.1)',
        'blue-glow': '0 0 20px rgba(74,243,255,0.12)',
        'surface': '0 4px 24px rgba(0,0,0,0.4)',
        'surface-lg': '0 8px 48px rgba(0,0,0,0.6)',
        'inset-green': 'inset 0 1px 0 rgba(0,255,136,0.1)',
      },
      animation: {
        'pulse-green': 'pulseGreen 2s ease-in-out infinite',
        'ticker': 'ticker 30s linear infinite',
        'scan': 'scan 3s linear infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'grid-fade': 'gridFade 0.6s ease-out forwards',
      },
      keyframes: {
        pulseGreen: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0,255,136,0.15)' },
          '50%': { boxShadow: '0 0 40px rgba(0,255,136,0.3)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        gridFade: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
