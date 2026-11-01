import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: {
    'process.env': {},
    'process.platform': JSON.stringify('browser'),
    'process.version': JSON.stringify(''),
    'process.browser': true,
    'global': 'globalThis'
  },
  build: {
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'zustand'],
          'vendor-capacitor': [
            '@capacitor/core',
            '@capacitor/app',
            '@capacitor/camera',
            '@capacitor/device',
            '@capacitor/filesystem',
            '@capacitor/geolocation',
            '@capacitor/local-notifications',
            '@capacitor/preferences',
            '@capgo/capacitor-native-biometric'
          ]
        }
      }
    }
  },
  esbuild: {
    drop: mode === 'production' ? ['debugger'] : [],
  },
  worker: {
    format: 'es'
  }
}))
