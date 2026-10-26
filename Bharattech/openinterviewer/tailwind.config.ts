import type { Config } from 'tailwindcss'

// The BharatTech portal's look (pk-redesign-thread-story src/styles/base.css), so opening the tool from the portal
// feels like one product: the screens' blue classes take the portal's Electric Violet, their slate classes its warm
// ink and paper, and the candidate's side of the chat its Tango Orange. Every shade is replaced, so no old blue or
// cold grey is left in between.
const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Figtree', 'Helvetica Neue', 'Arial', 'sans-serif'],
        'display': ['Bricolage Grotesque', 'Helvetica Neue', 'Arial', 'sans-serif'],
        'mono': ['Geist Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        // Electric Violet (portal --violet #6E58F5) in the place of blue
        blue: {
          50: '#F4F2FF',
          100: '#EAE6FF',
          200: '#D6CEFF',
          300: '#B9ABFF',
          400: '#9784FB',
          500: '#806AF8',
          600: '#6E58F5',
          700: '#5A41E2',
          800: '#4A33BF',
          900: '#3B2A94',
          950: '#241A5C',
        },
        // warm paper to ink (portal --bg #F8F7F3, --bg-2 #EFECE5, --muted #6E675C, --ink-soft #5C574E, --ink #14130F)
        slate: {
          50: '#F8F7F3',
          100: '#EFECE5',
          200: '#E4E0D8',
          250: '#DAD5CC',
          300: '#CBC5BA',
          350: '#B8B1A5',
          400: '#A39E92',
          450: '#8E877B',
          500: '#6E675C',
          600: '#5C574E',
          700: '#3F3B34',
          750: '#35322C',
          800: '#2B2923',
          850: '#201E1A',
          900: '#14130F',
          950: '#0B0A08',
        },
        // Tango Orange (portal --tangerine #FF8643), for the candidate
        tangerine: {
          50: '#FFF3EC',
          100: '#FFE6D6',
          200: '#FFCBAD',
          300: '#FFAE80',
          400: '#FF9A5E',
          500: '#FF8643',
          600: '#EA6A23',
          700: '#C2511A',
          800: '#9A3412',
          900: '#7C2D12',
        },
        stone: {
          850: '#1c1917',
        },
        red: {
          550: '#ef4444',
          650: '#dc2626',
        },
        green: {
          250: '#bbf7d0',
        }
      },
      // the portal's rounder cards (--p-radius 26px)
      borderRadius: {
        '2xl': '1.375rem',
        '3xl': '1.625rem',
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(20, 19, 15, 0.05)',
        'card': '0 0 0 1px rgba(20, 19, 15, 0.04), 0 18px 40px -30px rgba(40, 30, 90, 0.3)',
        'card-hover': '0 0 0 1px rgba(20, 19, 15, 0.08), 0 18px 36px -20px rgba(110, 88, 245, 0.35)',
        'card-active': '0 4px 12px 0 rgba(20, 19, 15, 0.08)',
        'glass': '0 8px 32px 0 rgba(40, 30, 90, 0.08)',
      }
    },
  },
  plugins: [],
}
export default config
