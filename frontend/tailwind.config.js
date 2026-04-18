/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ecoGreen: '#00E676',
        ecoBlue: '#2979FF',
        ecoBg: '#F5F9F7',
        ecoNavy: '#0D1B2A',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

