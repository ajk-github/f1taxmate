import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0ea5e9', // blue for buttons (replacing green)
        },
        brand: {
          dark: '#0f172a',   // dark blue header/background
          darker: '#0c1222',
          accent: '#38bdf8', // light blue logo/links
          muted: '#1e293b',  // card blue
        },
        cream: {
          DEFAULT: '#FBF8F2',
          card: '#F5F0E8',
        },
        silver: {
          DEFAULT: '#c0c0c0',
          light: '#e5e7eb',
          dark: '#9ca3af',
        },
      },
    },
  },
  plugins: [],
}
export default config
