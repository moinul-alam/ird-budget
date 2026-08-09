/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-kalpurush)', 'sans-serif'],
        mono: ['var(--font-kalpurush)', 'monospace'],
        serif: ['var(--font-kalpurush)', 'serif'],
      },
    },
  },
  plugins: [],
}
