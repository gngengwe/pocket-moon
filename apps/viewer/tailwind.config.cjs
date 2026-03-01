/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#edf1ff",
        card: "#f8f9ff",
        ink: "#1c2a57",
        muted: "#516392",
        accent: "#f0c887"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(35, 49, 92, 0.18)"
      }
    }
  },
  plugins: []
};
