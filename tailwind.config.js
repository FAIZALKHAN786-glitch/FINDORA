/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f4f4f2',
        surface: '#fffdf9',
        ink: '#1d1d1b',
        muted: '#66665f',
        line: '#deddd7',
        clay: {
          DEFAULT: '#a8461f',
          hover: '#8f3a1d',
          soft: '#f6e9e2',
        },
        accent: {
          DEFAULT: '#a8461f',
          hover: '#8f3a1d',
          soft: '#f6e9e2',
        },
        success: '#3f6b57',
        warning: '#8a6a2f',
        danger: '#9c3a26',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(29,29,27,.04), 0 18px 38px -30px rgba(29,29,27,.45)',
        lift: '0 2px 4px rgba(29,29,27,.05), 0 24px 48px -30px rgba(29,29,27,.5)',
        press: '0 3px 0 #7f3217',
      },
      borderRadius: {
        card: '20px',
        notice: '14px',
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
