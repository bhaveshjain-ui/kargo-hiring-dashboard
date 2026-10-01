import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-hover": "rgb(var(--surface-hover) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        "border-strong": "rgb(var(--border-strong) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          hover: "rgb(var(--primary-hover) / <alpha-value>)",
          foreground: "rgb(var(--primary-foreground) / <alpha-value>)",
          soft: "rgb(var(--primary-soft) / <alpha-value>)",
        },
        success: "rgb(var(--success) / <alpha-value>)",
        "success-soft": "rgb(var(--success-soft) / <alpha-value>)",
        warn: "rgb(var(--warn) / <alpha-value>)",
        "warn-soft": "rgb(var(--warn-soft) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        "danger-soft": "rgb(var(--danger-soft) / <alpha-value>)",
      },
      // Deliberately tight — an instrument panel, not a friendly app. Nothing
      // in this system should round past 6px; most structural chrome stays
      // sharp (0-2px) so the grid itself reads as the design.
      borderRadius: {
        none: "0px",
        sm: "2px",
        DEFAULT: "3px",
        md: "4px",
        lg: "6px",
        xl: "6px",
        "2xl": "6px",
        full: "9999px", // kept only for avatars/dots, never for badges or cards
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        raised: "0 2px 8px -2px rgb(0 0 0 / 0.12), 0 1px 2px -1px rgb(0 0 0 / 0.08)",
      },
      letterSpacing: {
        label: "0.08em",
      },
    },
  },
  plugins: [],
};

export default config;
