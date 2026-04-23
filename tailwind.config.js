/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#fff1f3',
          100: '#ffe0e5',
          200: '#ffc7d0',
          300: '#ffa3b2',
          400: '#ff6e87',
          500: '#ff385c',
          600: '#ed1545',
          700: '#c80d38',
          800: '#a80e34',
          900: '#8f1032',
        },
        ink: {
          900: '#222222',
          800: '#3f3f3f',
          700: '#555555',
          600: '#6a6a6a',
          500: '#8a8a8a',
          400: '#a0a0a0',
          300: '#c1c1c1',
          200: '#e0e0e0',
          100: '#f2f2f2',
          50: '#f7f7f7',
        }
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '32px',
      },
      boxShadow: {
        'card': 'rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px',
        'card-hover': 'rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.06) 0px 4px 12px, rgba(0,0,0,0.14) 0px 8px 16px',
        'button': 'rgba(0,0,0,0.08) 0px 4px 12px',
      }
    },
  },
  plugins: [],
}
