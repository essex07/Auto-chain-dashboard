/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#4A90D9",
        success: "#22C55E",
        danger: "#EF4444",
        warning: "#F59E0B",
        info: "#8B5CF6",
        dark: "#0F172A",
      },
    },
  },
  plugins: [],
};
