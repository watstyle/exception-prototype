import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "iframe-border": "#d3dae4",
        "iframe-accent": "#0b74d1"
      }
    }
  },
  plugins: []
} satisfies Config;
