/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Design system CivilDesk — industrial precision
        navy:    { 950: '#030B14', 900: '#0B1E33', 800: '#0F2D4A', 700: '#1A3D5E', 600: '#1E5C8E' },
        amber:   { 400: '#FBB740', 500: '#F0A500', 600: '#D4920A' },
        slate:   { 50: '#F8FAFC', 100: '#F1F5F9', 200: '#E2E8F0', 800: '#1E293B', 900: '#0F172A' },
        emerald: { 400: '#34D399', 500: '#10B981', 600: '#059669' },
        rose:    { 400: '#FB7185', 500: '#F43F5E' },
        violet:  { 500: '#8B5CF6', 600: '#7C3AED' },
        // semantic
        background:   'hsl(var(--background))',
        foreground:   'hsl(var(--foreground))',
        card:         { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        border:       'hsl(var(--border))',
        input:        'hsl(var(--input))',
        ring:         'hsl(var(--ring))',
        primary:      { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary:    { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted:        { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent:       { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive:  { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
      },
      fontFamily: {
        sans:    ['Syne', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
        display: ['Syne', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'slide-in-right': { from: { transform: 'translateX(100%)', opacity: 0 }, to: { transform: 'translateX(0)', opacity: 1 } },
        'fade-up':        { from: { transform: 'translateY(16px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } },
        'pulse-slow':     { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
        'shimmer':        { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
        'count-up':       { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
      animation: {
        'slide-in':    'slide-in-right 0.3s cubic-bezier(0.16,1,0.3,1)',
        'fade-up':     'fade-up 0.4s cubic-bezier(0.16,1,0.3,1)',
        'fade-up-200': 'fade-up 0.4s 0.1s cubic-bezier(0.16,1,0.3,1) both',
        'fade-up-400': 'fade-up 0.4s 0.2s cubic-bezier(0.16,1,0.3,1) both',
        'fade-up-600': 'fade-up 0.4s 0.3s cubic-bezier(0.16,1,0.3,1) both',
        'pulse-slow':  'pulse-slow 2s ease-in-out infinite',
        'shimmer':     'shimmer 2s linear infinite',
        'count-up':    'count-up 0.5s 0.2s ease-out both',
      },
      backgroundImage: {
        'grid-navy':   'linear-gradient(rgba(30,92,142,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(30,92,142,0.08) 1px,transparent 1px)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      backgroundSize: {
        'grid': '24px 24px',
      },
      boxShadow: {
        'glow-amber': '0 0 20px rgba(240,165,0,0.25)',
        'glow-blue':  '0 0 20px rgba(30,92,142,0.30)',
        'card':       '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.15)',
      },
    },
  },
  plugins: [],
}
