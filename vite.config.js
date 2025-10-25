// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import viteCompression from "vite-plugin-compression";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [
    react(),

    // Kompresi output build → download lebih kecil
    viteCompression({ algorithm: "brotliCompress" }),
    viteCompression({ algorithm: "gzip" }),

    // PWA runtime caching
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        runtimeCaching: [
          // Cache data JSON (StaleWhileRevalidate)
          {
            // Sesuai rute yang dipakai app sekarang (/data/*.json /geojson)
            urlPattern: ({ url }) =>
              url.pathname.startsWith("/data/") ||
              url.pathname.endsWith(".geojson") ||
              url.pathname.includes("/kecamatan.geojson") ||
              url.pathname.includes("/desa.geojson"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "ps-json",
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          // Cache tile peta & aset gambar
          {
            urlPattern: ({ url }) =>
              url.origin.includes("tile.openstreetmap.org") ||
              url.pathname.endsWith(".png") ||
              url.pathname.endsWith(".jpg") ||
              url.pathname.endsWith(".svg"),
            handler: "CacheFirst",
            options: {
              cacheName: "ps-assets",
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { "@": resolve(process.cwd(), "src") },
  },
  build: {
    target: "es2018",
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          leaflet: ["leaflet", "react-leaflet"],
          recharts: ["recharts"],
        },
      },
    },
  },
});
