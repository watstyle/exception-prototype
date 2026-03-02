import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "host-border": "#d7dde5",
        "host-panel": "#f6f8fb",
        "host-accent": "#0b74d1",
        "host-text": "#1f2937"
      }
    }
  },
  plugins: []
} satisfies Config;
