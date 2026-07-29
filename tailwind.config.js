/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'cream-white': '#F8F5F0',
        white: '#FFFFFF',
        black: '#1C1C1C',
        'dark-grey': '#555555',
        'light-grey': '#E8E8EB',
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
      },
      borderRadius: {
        card: '20px',
      },
      boxShadow: {
        card: '0 8px 24px rgba(28, 28, 28, 0.08)',
        item: '0 4px 14px rgba(28, 28, 28, 0.08)',
      },
    },
  },
  plugins: [],
};
