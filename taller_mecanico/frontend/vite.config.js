/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:8000',
      '/media': 'http://localhost:8000',
      '/static': 'http://localhost:8000',
    },
  },
  // Vitest: configuración de tests unitarios / componentes.
  // Usamos jsdom para simular el navegador (React Testing Library lo requiere).
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.js'],
    css: true,
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.js',
        'src/main.jsx',
      ],
    },
  },
})
