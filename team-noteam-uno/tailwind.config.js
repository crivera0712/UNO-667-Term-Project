/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/views/**/*.{ejs,js,jsx}",
    "./src/public/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      animation: {
        'gradient': 'gradient 15s ease infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        }
      }
    },
  },
  plugins: [],
}
