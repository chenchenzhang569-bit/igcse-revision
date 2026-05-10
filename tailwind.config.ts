import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  "#e8ecf5",
          100: "#c5cee6",
          200: "#9eadd4",
          300: "#778dc2",
          400: "#5974b4",
          500: "#3c5ca6",
          600: "#35549e",
          700: "#2b4a93",
          800: "#224087",
          900: "#001C71",
        },
        accent: {
          50:  "#fff3e8",
          100: "#ffe1c5",
          200: "#ffce9f",
          300: "#ffba78",
          400: "#ffab5b",
          500: "#ff9c3e",
          600: "#f49032",
          700: "#e68324",
          800: "#d87616",
          900: "#F48120",
        },
      },
    },
  },
  plugins: [],
};
export default config;
