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
    hmr: {
      overlay: true,
      protocol: 'ws',
      host: 'localhost',
    },
  },
  build: {
    // Split large vendor chunks so the initial JS is small
    rollupOptions: {
      output: {
        manualChunks: {
          // Clerk auth — large, rarely changes
          'vendor-clerk':  ['@clerk/clerk-react'],
          // React core
          'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
          // Utility libs
          'vendor-ui':     ['lucide-react', 'react-hot-toast', 'axios'],
        },
      },
    },
    // Warn when any chunk exceeds 500 KB
    chunkSizeWarningLimit: 500,
    // Minify with esbuild (default, fastest)
    minify: 'esbuild',
  },
})
