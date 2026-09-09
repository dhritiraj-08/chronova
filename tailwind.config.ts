import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-outfit)", "system-ui", "sans-serif"],
      },
      colors: {
        // Brand
        brand: {
          50:  "#f0edff",
          100: "#e0daff",
          200: "#c4b5fd",
          300: "#a78bfa",
          400: "#8b5cf6",
          500: "#7c3aed",
          600: "#6d28d9",
          700: "#5b21b6",
          800: "#4c1d95",
          900: "#2e1065",
        },
        // Accent blue
        accent: {
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
        },
        // Dark surfaces
        surface: {
          DEFAULT: "#0f0f1a",
          50:  "#1a1a2e",
          100: "#16213e",
          200: "#0f3460",
          card: "rgba(255,255,255,0.04)",
          border: "rgba(255,255,255,0.08)",
        },
      },
      backgroundImage: {
        "gradient-brand":
          "linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)",
        "gradient-dark":
          "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%)",
        "gradient-card":
          "linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(59,130,246,0.05) 100%)",
        "gradient-glow":
          "radial-gradient(ellipse at top, rgba(124,58,237,0.3) 0%, transparent 70%)",
      },
      boxShadow: {
        glow:    "0 0 40px rgba(124,58,237,0.25)",
        "glow-sm": "0 0 20px rgba(124,58,237,0.15)",
        glass:   "0 8px 32px rgba(0,0,0,0.4)",
        card:    "0 4px 24px rgba(0,0,0,0.3)",
      },
      animation: {
        "fade-in":      "fadeIn 0.5s ease forwards",
        "slide-up":     "slideUp 0.5s ease forwards",
        "slide-in-right":"slideInRight 0.4s ease forwards",
        "pulse-glow":   "pulseGlow 3s ease-in-out infinite",
        "float":        "float 6s ease-in-out infinite",
        "shimmer":      "shimmer 2s linear infinite",
        "spin-slow":    "spin 8s linear infinite",
        "bounce-slow":  "bounce 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%":   { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(124,58,237,0.2)" },
          "50%":      { boxShadow: "0 0 40px rgba(124,58,237,0.5)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-15px)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition:  "200% 0" },
        },
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
