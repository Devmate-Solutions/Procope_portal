import type { Config } from "tailwindcss"

const config = {
  
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1F4280",
          foreground: "#FFFFFF",
          50: "#E6EAF4",
          100: "#C0CFEA",
          200: "#99B3E0",
          300: "#7297D6",
          400: "#4B7CCC",
          500: "#1F4280",
          600: "#1C3B73",
          700: "#193466",
          800: "#162D59",
          900: "#13264C",
        },
        secondary: {
          DEFAULT: "#000000",
          foreground: "#FFFFFF",
        },
        background: "#FFFFFF",
        foreground: "#333333",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config 