/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // the portal's own palette and type (website src/styles/base.css + portal.css), for the learner pages
      colors: {
        paper: "#F6F4EE",
        card: "#FDFCF9",
        ink: { DEFAULT: "#14130F", soft: "#5C574E" },
        muted: "#6E675C",
        line: { DEFAULT: "rgb(20 19 15 / 0.08)", strong: "rgb(20 19 15 / 0.16)" },
        act: { DEFAULT: "#6E58F5", deep: "#5A41E2", wash: "#EEEBFE" },
        tangerine: { DEFAULT: "#FF8643", wash: "#FFEDE2", text: "#B4501B" },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
        body: ["Figtree", "system-ui", "sans-serif"],
      },
      fontSize: {
        "course-details-heading-small": ["26px", "36px"],
        "course-details-heading-large": ["36px", "44px"],
        "home-heading-small": ["28px", "34px"],
        "home-heading-large": ["48px", "56px"],
        default: ["15px", "21px"],
      },
      gridTemplateColumns: {
        auto: "repeat(auto-fill, minmax(200px, 1fr))",
      },
      spacing: {
        "section-height": "500px",
      },
      maxWidth: {
        "course-card": "424px",
      },
      boxShadow: {
        "custom-card": "0px 4px 15px 2px rgba(0, 0, 0, 0.1)",
      },
      // learner pages' motion (owner's refinement A): one strong ease-out, feedback only
      transitionTimingFunction: {
        snappy: "cubic-bezier(0.23, 1, 0.32, 1)",
      },
      keyframes: {
        "chapter-in": {
          from: { opacity: "0", transform: "translateY(-4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // course cards and rows on a list's first show (owner's 1A, 2026-10-27); `backwards` keeps a waiting card hidden
        "card-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "none" },
        },
        "card-fade": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        // the video window (owner's 3A, 2026-10-27): grows in a little and fades; closing is quicker than opening
        "window-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "none" },
        },
        "window-out": {
          from: { opacity: "1", transform: "none" },
          to: { opacity: "0", transform: "scale(0.98)" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
      },
      animation: {
        "chapter-in": "chapter-in 200ms cubic-bezier(0.23, 1, 0.32, 1)",
        "card-in": "card-in 250ms cubic-bezier(0.23, 1, 0.32, 1) backwards",
        "card-fade": "card-fade 200ms ease backwards",
        "window-in": "window-in 200ms cubic-bezier(0.23, 1, 0.32, 1)",
        "window-out": "window-out 150ms cubic-bezier(0.23, 1, 0.32, 1) forwards",
        "fade-out": "fade-out 150ms ease forwards",
      },
    },
  },
  plugins: [
    // hover styles only where there is a real pointer: a tap on a phone shouldn't leave a card "hovered"
    ({ addVariant }) => {
      addVariant("mhover", "@media (hover: hover) and (pointer: fine) { &:hover }");
      addVariant("group-mhover", "@media (hover: hover) and (pointer: fine) { :merge(.group):hover & }");
    },
  ],
};
