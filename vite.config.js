import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  envDir: __dirname,            // <- pastikan baca dari root proyek
  envPrefix: ['VITE_'],         // <- hanya expose yang berawalan VITE_ (default juga ini)
});
