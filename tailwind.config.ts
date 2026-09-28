import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111318",
        paper: "#f7f7f5",
        line: "#e3e3df",
        accent: "#1d4ed8",
        good: "#15803d",
        warn: "#b45309",
        bad: "#b91c1c",
      },
    },
  },
  plugins: [],
};

export default config;
