/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        oliva: { DEFAULT: '#4f6b2d', oscuro: '#2f4420', claro: '#e9efdd' },
        canal: { DEFAULT: '#1b86c0', oscuro: '#125f8a', claro: '#dcedf6' },
        arcilla: { DEFAULT: '#c94f25', oscuro: '#96381a', claro: '#f9e6dd' },
        brote: '#5c7f1e',
        tinta: '#1b2414',
        hoja: '#e8ece5',
      },
      fontFamily: {
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
        titulo: ['"Bricolage Grotesque"', '"Instrument Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
