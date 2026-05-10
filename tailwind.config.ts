import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        urbanist: ["Urbanist", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
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
          50:  "#fff3e6",
          100: "#ffe0b3",
          200: "#ffcc80",
          300: "#ffb84d",
          400: "#ffa826",
          500: "#FF8C00",
          600: "#e67e00",
          700: "#cc6f00",
          800: "#b36100",
          900: "#995200",
        },
      },
    },
  },
  plugins: [],
};
export default config;
