/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#f6f8fc",
        card: "#ffffff",
        ink: "#1b2533",
        muted: "#66758b",
        accent: "#4a769a"
      },
      boxShadow: {
        soft: "0 16px 48px rgba(37, 55, 77, 0.12)"
      }
    }
  },
  plugins: []
};