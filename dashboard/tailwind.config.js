/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        thitho: {
          dark: "#0c0f0a",
          card: "#141912",
          border: "#232e1f",
          green: "#2e7d32",
          emerald: "#10b981",
          gold: "#f59e0b",
          earth: "#854d0e",
          accent: "#3b82f6",
        },
      },
    },
  },
  plugins: [],
};
