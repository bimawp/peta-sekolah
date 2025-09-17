// src/config/mapConstants.js

// Titik tengah peta untuk tampilan awal
export const GARUT_CENTER = [-7.2279, 107.9087];

// Kumpulan semua URL API agar mudah dikelola di satu tempat
export const API_ENDPOINTS = {
  paud: "https://peta-sekolah.vercel.app/paud/data/paud.json",
  sd: "https://peta-sekolah.vercel.app/sd/data/sd_new.json",
  smp: "https://peta-sekolah.vercel.app/smp/data/smp.json",
  pkbm: "https://peta-sekolah.vercel.app/pkbm/data/pkbm.json",
  kecamatan: "https://peta-sekolah.vercel.app/data/kecamatan.geojson",
  desa: "https://peta-sekolah.vercel.app/data/desa.geojson"
};

// Palet warna untuk kondisi fasilitas agar konsisten
export const FACILITY_COLORS = {
  "Rusak Berat": "#ef4444",      // Merah
  "Rusak Sedang": "#f97316",     // Oranye
  "Kekurangan RKB": "#eab308",  // Kuning
  "Baik/Rehabilitasi": "#22c55e", // Hijau
  "default": "#6b7280"           // Abu-abu
};