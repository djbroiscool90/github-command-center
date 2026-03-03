module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        github: {
          50: '#f6f8fa',
          100: '#eaeef2',
          200: '#d0d7de',
          300: '#afb8c1',
          400: '#6e7681',
          500: '#57606a',
          600: '#424a55',
          700: '#32383f',
          800: '#24292f',
          900: '#0d1117',
        }
      }
    },
  },
  plugins: [],
}
