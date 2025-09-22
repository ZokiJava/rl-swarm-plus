import { withAccountKitUi, createColorSet } from "@account-kit/react/tailwind";

// wrap your existing tailwind config with 'withAccountKitUi'
export default withAccountKitUi({
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'gensyn-pink': '#eed2cc',
      },
      fontFamily: {
        'mondwest': ['Mondwest', 'serif'],
        'auxmono': ['AuxMono', 'mono'],
        'simplon': ['Simplon', 'mono'],
      }
    }
  }
  // your tailwind config here
  // if using tailwind v4, this can be left empty since most options are configured via css
  // if using tailwind v3, add your existing tailwind config here - https://v3.tailwindcss.com/docs/installation/using-postcss
}, {
  // override account kit themes
  colors: {
    "btn-primary": createColorSet("#eed2cc", "#eed2cc"),
    "btn-auth": createColorSet("#eed2cc", "#eed2cc"),
    "fg-accent-brand": createColorSet("#fad7d1", "#fad7d1"),
    "bg-surface-default": createColorSet("#fff", "#fff"), // Set modal background color
    "fg-primary": createColorSet("#000", "#000"), // Set text color
  },
  borderRadius: "none",
})