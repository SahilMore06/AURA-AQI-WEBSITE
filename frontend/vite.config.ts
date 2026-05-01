import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GOOGLE_AQ_API_KEY': JSON.stringify(env.GOOGLE_AQ_API_KEY || ""),
      'process.env.VITE_ML_API_URL': JSON.stringify(env.VITE_ML_API_URL || ""),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ""),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ""),
      'process.env.VITE_GOOGLE_AQ_API_KEY': JSON.stringify(env.VITE_GOOGLE_AQ_API_KEY || ""),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Required for Capacitor: Android WebView loads assets with relative paths
      base: './',
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
