import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  'rgba(99,102,241,0.08)',
          100: 'rgba(99,102,241,0.12)',
          200: 'rgba(99,102,241,0.25)',
          500: '#818cf8',
          600: '#6366f1',
          700: '#4f46e5',
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "'Fira Mono'", 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
