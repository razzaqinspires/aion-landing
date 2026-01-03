/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aion: {
          main: '#00f3ff',   // Cyan
          neon: '#0aff68',   // Green Bio
          alert: '#ff003c',  // Red Hazard
          dark: '#020205',   // Void Black
          panel: 'rgba(255, 255, 255, 0.05)',
        }
      },
      fontFamily: {
        orbitron: ['"Orbitron"', 'sans-serif'],
        rajdhani: ['"Rajdhani"', 'sans-serif'],
        mono: ['"Share Tech Mono"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        }
      }
    },
  },
  plugins: [],
}