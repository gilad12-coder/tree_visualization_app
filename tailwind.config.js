// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        merriweather: ['Merriweather', 'serif'],
        hebrew: ['Assistant', 'sans-serif'],
        arabic: ['Merriweather', 'serif'],
      },
    },
  },
  plugins: [],
}