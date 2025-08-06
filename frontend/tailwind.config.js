/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',   // Azul muy claro
          100: '#dbeafe',  // Azul claro
          200: '#bfdbfe',  // Azul suave
          300: '#93c5fd',  // Azul medio
          400: '#60a5fa',  // Azul semi-oscuro
          500: '#3b82f6',  // Azul principal
          600: '#2563eb',  // Azul oscuro
          700: '#1d4ed8',  // Azul muy oscuro
          800: '#1e40af',  // Azul profundo
          900: '#1e3a8a',  // Azul muy profundo
        },
        gold: {
          50: '#fffbeb',   // Dorado muy claro
          100: '#fef3c7',  // Dorado claro
          200: '#fde68a',  // Dorado suave
          300: '#fcd34d',  // Dorado medio
          400: '#fbbf24',  // Dorado principal
          500: '#f59e0b',  // Dorado oscuro
          600: '#d97706',  // Dorado muy oscuro
          700: '#b45309',  // Dorado profundo
          800: '#92400e',  // Dorado muy profundo
          900: '#78350f',  // Dorado super profundo
        },
        success: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
        },
        error: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'card': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
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
      }
    },
  },
  plugins: [],
}
