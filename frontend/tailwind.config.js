/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        poppins: ['var(--font-poppins)', 'system-ui', 'sans-serif'],
        inter: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // New Color Palette from https://colorhunt.co/palette/2e0249570a57a91079f806cc
        primary: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#a91079', // Bright Pink
          600: '#f806cc', // Neon Pink
          700: '#570a57', // Deep Purple
          800: '#2e0249', // Dark Purple
          900: '#1a011e',
        },
        // Alias for easier usage
        purple: {
          dark: '#2e0249',
          deep: '#570a57',
        },
        pink: {
          bright: '#a91079',
          neon: '#f806cc',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'gradient': 'gradient 3s ease infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'chemical-gradient': 'linear-gradient(135deg, #2e0249 0%, #570a57 50%, #a91079 100%)',
        'neon-gradient': 'linear-gradient(135deg, #a91079 0%, #f806cc 100%)',
      },
    },
  },
  plugins: [],
}