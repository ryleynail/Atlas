const colors = require('tailwindcss/colors');

/**
 * Tailwind configuration for Atlas.  
 *
 * We define a dark navy, gold and background palette to mirror the
 * requirements of the Atlas product spec.  These colours are used
 * throughout the UI to give the app a distinctive look and feel.
 */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0A1F44',
        gold: '#C49A4A',
        background: '#0A0F24',
      },
    },
  },
  plugins: [],
};