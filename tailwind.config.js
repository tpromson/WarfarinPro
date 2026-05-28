/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        clinic: {
          ink: "#17324d",
          blue: "#176087",
          cyan: "#d8f3f6",
          orange: "#f97316",
          red: "#c24132",
          paper: "#f7fbfb",
          line: "#d8e4e8",
        },
      },
      boxShadow: {
        soft: "0 12px 30px rgba(23, 50, 77, 0.08)",
      },
    },
  },
  plugins: [],
};
