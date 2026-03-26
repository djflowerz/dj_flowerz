/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./context/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        display: ['Poppins', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
      },
      colors: {
        brand: {
          primary: '#7B5CFF',
          secondary: '#28E6DC',
          dark: '#131313',
          card: '#1a1a1a',
          purple: '#7B5CFF',
          cyan: '#28E6DC',
          pink: '#FF287E',
          red: '#f42c37',
          gold: '#fbbf24',
        }
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
