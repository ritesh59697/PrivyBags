import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // Safelist prevents Tailwind from purging classes that are built dynamically
  // (e.g. constructed via string interpolation or template literals).
  // Any class you build from a variable must either be here OR be written
  // as a complete static string in your JSX.
  safelist: [
    "bg-purple-950", "border-purple-900", "text-purple-400",
    "bg-green-950", "border-green-900", "text-green-400",
    "bg-yellow-950", "border-yellow-900", "text-yellow-400",
    "bg-blue-950", "border-blue-900", "text-blue-400",
    "bg-red-950", "border-red-800", "text-red-400",
    "bg-green-900", "border-green-700", "text-green-300",
    "text-green-400", "text-red-400",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
