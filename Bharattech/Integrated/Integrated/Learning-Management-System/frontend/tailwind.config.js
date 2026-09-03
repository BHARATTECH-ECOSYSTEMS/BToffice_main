/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--primary-hex)"
        },
        accent: {
          DEFAULT: "var(--accent-hex)"
        },
        muted: "#EFF2F4",
      },
      borderRadius: {
        DEFAULT: '12px'
      }
    },
  },
  plugins: [],
}
