import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#102024",
        mist: "#f4f8f7",
        ocean: "#155e75",
        sand: "#f8f5ef",
      },
      boxShadow: {
        soft: "0 18px 60px rgba(16, 32, 36, 0.10)",
        glow: "0 24px 80px rgba(16, 185, 129, 0.14)",
        "card-hover": "0 28px 70px rgba(15, 23, 42, 0.12)",
        hero: "0 32px 90px rgba(15, 23, 42, 0.18)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "Segoe UI", "sans-serif"],
      },
      animation: {
        "fade-up": "fade-up 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "hero-glow": "hero-glow 8s ease-in-out infinite",
        "hero-drift": "hero-drift 20s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(1.5rem)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "hero-glow": {
          "0%, 100%": { opacity: "0.45", transform: "scale(1)" },
          "50%": { opacity: "0.7", transform: "scale(1.06)" },
        },
        "hero-drift": {
          "0%, 100%": { transform: "translate(0, 0)" },
          "50%": { transform: "translate(12px, -8px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% center" },
          "100%": { backgroundPosition: "-200% center" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
