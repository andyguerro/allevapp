/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#E31E24',
          'red-light': '#FF6B70',
          'red-dark': '#B91C1C',
          blue: '#1E3A8A',
          'blue-light': '#3B82F6',
          'blue-dark': '#1E40AF',
          coral: '#FF9F9B',
          'coral-light': '#FFC4C1',
          gray: '#8B9DC3',
          'gray-light': '#E5E7EB',
        }
      }
    },
  },
  plugins: [],
};
