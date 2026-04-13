import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#0BB8A8",
          secondary: "#7C3AED",
          accent: "#F59E0B",
          text: "#1A2E45",
          bg: "#FFFFFF",
          muted: "#F4F6FA",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
