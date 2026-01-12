// vite.config.js
import { defineConfig, splitVendorChunkPlugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react(), splitVendorChunkPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  esbuild: {
    legalComments: "none",
  },
  build: {
    target: "es2020",
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          // pecah vendor berdasarkan halaman agar pindah cepat
          recharts: ["recharts"],
          leaflet: ["leaflet", "react-leaflet"],
          supabase: ["@supabase/supabase-js"],
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-icons": ["lucide-react"],
        },
      },
    },
    treeshake: true,
    minify: "esbuild",
  },
  optimizeDeps: {
    include: ["lucide-react"],
  },
});
