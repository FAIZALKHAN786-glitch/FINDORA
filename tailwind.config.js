/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f8f6f1',
        surface: '#fffdf9',
        ink: '#172033',
        muted: '#667085',
        line: '#e7e2d9',
        accent: {
          DEFAULT: '#4f46e5',
          hover: '#4338ca',
          soft: '#eef2ff',
        },
        success: '#16713c',
        warning: '#9a5b00',
        danger: '#b42318',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(23, 32, 51, 0.04), 0 16px 40px -28px rgba(23, 32, 51, 0.35)',
        lift: '0 2px 4px rgba(23, 32, 51, 0.05), 0 22px 50px -30px rgba(23, 32, 51, 0.45)',
      },
      borderRadius: {
        card: '18px',
      },
      keyframes: {
        rise: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        rise: 'rise 240ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
      },
    },
  },
  plugins: [],
};
