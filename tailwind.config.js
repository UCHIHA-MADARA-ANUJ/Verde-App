/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#090a0f",
          card: "#11131a",
          border: "#1f2430",
          green: "#22c55e",
          blue: "#06b6d4",
          purple: "#a855f7",
          red: "#ef4444"
        }
      },
      boxShadow: {
        'neon-green': '0 0 15px rgba(34, 197, 94, 0.25)',
        'neon-blue': '0 0 15px rgba(6, 182, 212, 0.25)',
        'neon-purple': '0 0 15px rgba(168, 85, 247, 0.3)',
        'neon-red': '0 0 15px rgba(239, 68, 68, 0.35)',
      }
    },
  },
  plugins: [],
}
