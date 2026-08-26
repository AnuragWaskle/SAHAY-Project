/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset")],
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'brand-orange': '#FF7E67',
        'brand-blue': '#4A90E2',
        'brand-green': '#2E8B57',
        'brand-indigo': '#4B0082',
        'brand-gray': '#495057',
      },
    },
  },
  plugins: [],
}
