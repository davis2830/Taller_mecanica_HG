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
    // IMPORTANTE: usar la forma objeto con `changeOrigin: false` (default
    // de http-proxy) para PRESERVAR el Host header del browser al pasar
    // por el proxy. Vite, cuando recibe la forma string, setea
    // `changeOrigin: true` automáticamente y reescribe Host a la URL
    // del target → django-tenants ve `Host: localhost` y no encuentra
    // el tenant correcto (`admin.*` o `<tenant>.*`) → 404 en login.
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: false,
      },
      '/media': {
        target: 'http://localhost:8000',
        changeOrigin: false,
      },
      '/static': {
        target: 'http://localhost:8000',
        changeOrigin: false,
      },
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
