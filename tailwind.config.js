/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff8ec',
          100: '#f8ebd0',
          200: '#f2d8aa',
          300: '#dfbf84',
          400: '#c8a15f',
          500: '#a87d40',
          600: '#8d6633',
          700: '#6f4f27',
          800: '#50371b',
          900: '#342311',
        },
        honey: {
          50: '#fffcdf',
          100: '#fff7bf',
          200: '#ffec82',
          300: '#f7dd4f',
          400: '#e5c129',
          500: '#cba117',
          600: '#a67f11',
          700: '#7b5f0f',
          800: '#56400b',
          900: '#382a07',
        },
      },
    },
  },
  plugins: [],
};
