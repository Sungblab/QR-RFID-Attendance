/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable dark mode with class strategy
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Roboto', 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'sans-serif'],
      },
      colors: {
        // Primary Colors
        'primary-navy': '#1e40af',
        'primary-blue': '#3b82f6',
        'primary-light': '#dbeafe',
        
        // Status Colors
        'success': '#059669',
        'warning': '#d97706',
        'danger': '#dc2626',
        'info': '#0284c7',
        
        // Text Colors
        'text-primary': '#1e293b',
        'text-secondary': '#64748b',
        'text-muted': '#94a3b8',
        'text-white': '#ffffff',
      }
    },
  },
  plugins: [],
}