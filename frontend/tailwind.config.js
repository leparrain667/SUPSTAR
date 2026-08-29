/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1F2421',
        sand: '#F6F3EC',
        coral: {
          DEFAULT: '#D85A30',
          dark: '#993C1D',
          light: '#F5C4B3',
        },
        pine: {
          DEFAULT: '#0F6E56',
          dark: '#04342C',
          light: '#9FE1CB',
        },
        line: '#E3DED2',
        paper: '#F1ECE1',
      },
      fontFamily: {
        display: ['Georgia', '"Times New Roman"', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
};
