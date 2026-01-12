// src/services/api/regionApi.js

// NAMA FUNGSI DIUBAH AGAR SESUAI DENGAN YANG DIPANGGIL
export const fetchGeoData = async () => {
    try {
      // Path ke file GeoJSON Anda
      const response = await fetch('/data/kecamatan.geojson');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching kecamatan GeoJSON:", error);
      // Mengembalikan objek GeoJSON kosong agar aplikasi tidak crash jika file tidak ada
      return { type: "FeatureCollection", features: [] };
    }
  };