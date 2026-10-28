/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        kitty: {
          bg: '#FFF5F8',
          pastel: '#F8BBD0',
          soft: '#FCE4EC',
          accent: '#EC6A9A',
          dark: '#D84B7F',
          text: '#43313A',
          muted: '#7E6570',
          border: '#F5D0DF',
        },
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Quicksand"', '"Be Vietnam Pro"', 'sans-serif'],
      },
      boxShadow: {
        kitty: '0 8px 30px -4px rgba(236, 106, 154, 0.12)',
        'kitty-lg': '0 14px 40px -6px rgba(236, 106, 154, 0.18)',
        'kitty-sm': '0 4px 14px -2px rgba(236, 106, 154, 0.1)',
      },
    },
  },
  plugins: [],
};
