/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        gv: {
          black:    "#050a05",
          dark:     "#0a140a",
          panel:    "#0f1f0f",
          card:     "#142014",
          border:   "#1a3a1a",
          green:    "#00ff88",
          "green-dim": "#00cc66",
          "green-glow":"rgba(0,255,136,0.15)",
          cyan:     "#00ffcc",
          text:     "#c8e6c9",
          muted:    "#4a7a4a",
          danger:   "#ff4444",
          amber:    "#ffaa00",
        }
      },
      fontFamily: {
        heading: ["Rajdhani", "sans-serif"],
        mono:    ["JetBrains Mono", "monospace"],
        body:    ["Inter", "sans-serif"],
      },
      boxShadow: {
        "glow-sm":  "0 0 10px rgba(0,255,136,0.2)",
        "glow-md":  "0 0 20px rgba(0,255,136,0.3)",
        "glow-lg":  "0 0 40px rgba(0,255,136,0.25)",
        "inner-glow":"inset 0 0 20px rgba(0,255,136,0.05)",
      },
      backgroundImage: {
        "grid-dark":
          "linear-gradient(rgba(0,255,136,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.03) 1px, transparent 1px)",
      },
      backgroundSize: {
        "grid": "40px 40px",
      },
      animation: {
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "scan-line":  "scanLine 3s linear infinite",
        "float":      "float 6s ease-in-out infinite",
      },
      keyframes: {
        pulseGlow: {
          "0%,100%": { boxShadow: "0 0 10px rgba(0,255,136,0.2)" },
          "50%":     { boxShadow: "0 0 30px rgba(0,255,136,0.5)" },
        },
        scanLine: {
          "0%":   { top: "0%" },
          "100%": { top: "100%" },
        },
        float: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%":     { transform: "translateY(-12px)" },
        }
      }
    }
  },
  plugins: []
};
