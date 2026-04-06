// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0f0f0f',
          soft: '#1c1c1c',
          muted: '#2a2a2a',
          faint: '#6b6560',
        },
        surface: {
          DEFAULT: '#f5f3ef',
          alt: '#ede9e3',
          dark: '#e4dfd7',
        },
        amber: {
          DEFAULT: '#e8a030',
          dark: '#c47f18',
          light: '#ffd97a',
          pale: '#fef3d8',
        },
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}