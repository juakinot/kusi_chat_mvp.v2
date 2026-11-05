/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: { colors: { oliva: { DEFAULT: '#4f6b2d', oscuro: '#3c5222', claro: '#eef2e6' } } } },
  plugins: [],
};
