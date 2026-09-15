/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0B3D91', // primary
          dark: '#082C6B',
          light: '#163A70',   // secondary
        },
        saffron: { DEFAULT: '#FF9933', dark: '#E07B18', light: '#FFF4E6' },
        india: { green: '#138808', dark: '#0E6606', light: '#EAF6E9' },
        govgrey: {
          50: '#FAFAFB',
          100: '#F5F6F8', // light section background
          200: '#E8EAEE',
          300: '#D6D9E0',
          400: '#AEB4C0',
          500: '#7C8494',
          600: '#5A6172',
          700: '#3D4352',
          800: '#242936',
        },
        alert: { DEFAULT: '#C62828', light: '#FDECEC', dark: '#9B1C1C' },
        warn: { DEFAULT: '#B26A00', light: '#FFF7E6' },
      },
      fontFamily: {
        sans: ['"Noto Sans"', 'Inter', '"Source Sans 3"', 'system-ui', 'sans-serif'],
        hindi: ['"Noto Sans Devanagari"', '"Noto Sans"', 'sans-serif'],
      },
      fontSize: {
        // Base is 16px; these map to the prescribed 28 / 20 / 17 / 14 / 13 px scale.
        'gov-title': ['1.75rem', { lineHeight: '2.125rem', fontWeight: '700' }],
        'gov-section': ['1.25rem', { lineHeight: '1.625rem', fontWeight: '600' }],
        'gov-card': ['1.0625rem', { lineHeight: '1.5rem', fontWeight: '600' }],
        'gov-body': ['0.875rem', { lineHeight: '1.375rem' }],
        'gov-table': ['0.8125rem', { lineHeight: '1.25rem' }],
        'gov-xs': ['0.75rem', { lineHeight: '1.125rem' }],
      },
      borderRadius: {
        gov: '6px',
      },
      boxShadow: {
        gov: '0 1px 2px rgba(11, 61, 145, 0.08)',
        'gov-md': '0 2px 6px rgba(20, 30, 60, 0.10)',
      },
      maxWidth: {
        gov: '1280px',
      },
    },
  },
  plugins: [],
};
