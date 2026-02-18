/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0a0e27',
        'dark-card': '#151932',
        'dark-border': '#1f2542',
        'purple-accent': '#8b5cf6',
        'purple-light': '#a78bfa',
      },
    },
  },
  plugins: [],
}
