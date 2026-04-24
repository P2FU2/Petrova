import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef5ff",
          100: "#d8e8ff",
          500: "#2f6df6",
          700: "#184cc7",
          900: "#102e75"
        }
      }
    }
  },
  plugins: []
};

export default config;
