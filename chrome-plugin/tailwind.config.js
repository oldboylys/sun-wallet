/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./popup.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        border: "var(--sw-border)",
        input: "var(--sw-input-bg)",
        foreground: "var(--sw-text-primary)",
        muted: "var(--sw-text-muted)",
        card: "var(--sw-surface-2)",
        sw: {
          bg: "var(--sw-bg)",
          surface: "var(--sw-surface)",
          surface2: "var(--sw-surface-2)",
          primary: "var(--sw-primary)",
          "primary-soft": "var(--sw-primary-soft)",
          danger: "var(--sw-danger)",
          success: "var(--sw-success)",
          text: "var(--sw-text-primary)",
          muted: "var(--sw-text-muted)",
        },
      },
      boxShadow: {
        glow: "0 0 42px rgba(255, 189, 33, 0.22)",
        card: "0 12px 30px rgba(0, 0, 0, 0.35)",
      },
      fontFamily: {
        sans: ["Outfit", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl2: "14px",
      },
      spacing: {
        4.5: "1.125rem",
      },
    },
  },
  plugins: [],
};
