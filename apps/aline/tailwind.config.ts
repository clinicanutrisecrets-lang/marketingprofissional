import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx,mdx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aline: {
          scanner: "#0BB8A8",
          nutrisecrets: "#D946EF",
          text: "#1A2E45",
          bg: "#FAFBFC",
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
