import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "space-black": "#05070B",
        "deep-navy": "#09111F",
        "midnight-blue": "#0E1628",
        "soft-white": "#E8EDF5",
        "cyan-accent": "#78C8FF",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          '"Segoe UI"',
          "Inter",
          "Roboto",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          '"SF Mono"',
          '"Geist Mono"',
          '"JetBrains Mono"',
          "ui-monospace",
          "Menlo",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
