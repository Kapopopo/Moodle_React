export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--ink)', surface: 'var(--surface)', 'surface-soft': 'var(--surface-soft)',
        'text-secondary': 'var(--text-secondary)', 'text-muted': 'var(--text-muted)',
        'text-placeholder': 'var(--text-placeholder)', 'hero-empty': 'var(--hero-empty)',
        chip: 'var(--chip)', 'border-dashed': 'var(--border-dashed)', masked: 'var(--masked)',
        weekend: 'var(--weekend)', danger: 'var(--danger)',
        violet: 'var(--mood-1)', blue: 'var(--mood-2)', mint: 'var(--mood-3)',
        yellow: 'var(--mood-4)', peach: 'var(--mood-5)',
        'violet-soft': 'var(--mood-1-soft)', 'blue-soft': 'var(--mood-2-soft)',
        'mint-soft': 'var(--mood-3-soft)', 'yellow-soft': 'var(--mood-4-soft)', 'peach-soft': 'var(--mood-5-soft)',
      },
      fontFamily: { sans: ['Inter', 'sans-serif'], display: ['Bricolage Grotesque', 'sans-serif'] },
      borderRadius: { card: '24px', tile: '18px', field: '16px', chart: '22px' },
    },
  },
  plugins: [],
};
