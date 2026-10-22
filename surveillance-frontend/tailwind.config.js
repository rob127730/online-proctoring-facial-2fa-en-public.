/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: '#2e2e2e', // Ajoute cette ligne (choisis la couleur que tu veux)
        dark: {
          900: '#0a0a0a',
          800: '#121212',
          700: '#1a1a1a',
          600: '#242424',
          500: '#2e2e2e',
        },
        blue: {
          950: '#0c1829',
          900: '#0f172a',
          850: '#1e293b',
        }
      }
    },
  },
  plugins: [],
}