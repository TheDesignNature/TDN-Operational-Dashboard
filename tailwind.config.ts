import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // TDN Brand Palette — from brand guide
      colors: {
        teal: {
          DEFAULT: "#1C3B44",
          mid: "#2a5563",
          light: "#3d7a8a",
          pale: "#e8f0f2",
        },
        green: {
          DEFAULT: "#AFBAAB",
          dark: "#7a8f75",
          pale: "#f0f3ef",
        },
        blue: {
          DEFAULT: "#A1B4B7",
          dark: "#6a8a8e",
          pale: "#eef2f3",
        },
        stone: {
          DEFAULT: "#F8F4F1",
          mid: "#ede7e0",
        },
        sand: {
          DEFAULT: "#C8BDAC",
          light: "#e8e2d8",
          pale: "#f5f2ee",
        },
        // Semantic status colours
        status: {
          normal: "#2d6a4a",
          "normal-bg": "#edf5f0",
          "normal-border": "#b7d8c6",
          watch: "#7a5800",
          "watch-bg": "#fdf5e0",
          "watch-border": "#f0d080",
          action: "#7a2828",
          "action-bg": "#fdf0f0",
          "action-border": "#f0b0b0",
        },
      },
      fontFamily: {
        heading: ["'Barlow Condensed'", "sans-serif"],
        body: ["'DM Sans'", "sans-serif"],
      },
      fontSize: {
        "2xs": ["11px", "1.4"],
      },
      borderRadius: {
        card: "12px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(28,59,68,0.06), 0 4px 12px rgba(28,59,68,0.04)",
        "card-hover": "0 2px 8px rgba(28,59,68,0.1), 0 8px 24px rgba(28,59,68,0.07)",
      },
    },
  },
  plugins: [],
};

export default config;
