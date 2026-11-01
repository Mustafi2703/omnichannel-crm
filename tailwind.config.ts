import type { Config } from "tailwindcss";

/** EA Global brand: royal blue #3871C1 from the drop and wordmark, cyan #00ADEF from the inner drop. */
const eaBlue = {
  50: "#eef4fb",
  100: "#d9e6f6",
  200: "#b7cfee",
  300: "#88b0e2",
  400: "#5a8fd2",
  500: "#3871c1",
  600: "#3871c1",
  700: "#2c5ca3",
  800: "#254b84",
  900: "#1d3c69",
  950: "#0d2347",
};

const eaCyan = {
  50: "#e8f8fe",
  100: "#c9eefc",
  200: "#97def9",
  300: "#5ccbf5",
  400: "#22b9f1",
  500: "#00adef",
  600: "#0090c9",
  700: "#0073a2",
  800: "#055d83",
  900: "#0a4d6c",
  950: "#063148",
};

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        blue: eaBlue,
        ea: eaBlue,
        aqua: eaCyan,
      },
    },
  },
  plugins: [],
} satisfies Config;
