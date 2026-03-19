/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'rose-gold': {
                    50: '#fdf2f4',
                    100: '#fbe6ea',
                    200: '#f4c7cf',
                    300: '#eba0ac',
                    400: '#d97281',  // light rose gold
                    500: '#b76e79',  // core rose gold
                    600: '#96374a',  // deep rose
                    700: '#7d2a3c',
                    800: '#5c1f2e',
                    900: '#3d1020',
                },
                'warm-gold': {
                    300: '#e8c99a',
                    400: '#d4a574',
                    500: '#c9956a',  // warm gold
                    600: '#b07848',
                },
            },
            fontFamily: {
                outfit: ['Outfit', 'Inter', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
