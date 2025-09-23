// src/hooks/useMapData.js

import { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config/mapConstants.js';
import * as turf from '@turf/turf';

// Fungsi fetch tetap sama, namun kita akan lebih memperhatikan hasilnya
const fetchJSON = async (url) => {
  const response = await fetch(process.env.PUBLIC_URL + url); // Menggunakan PUBLIC_URL untuk path yang lebih aman
  if (!response.ok) {
    throw new Error(`Gagal memuat ${url}: Status ${response.status}`);
  }
  return response.json();
};

let dataCache = null; // Cache untuk menyimpan data yang sudah diproses

const useMapData = () => {
  const [processedData, setProcessedData] = useState({
    schools: [],
    kecamatanData: [],
    desaGeoJSON: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAndProcessData = async () => {
      if (dataCache) {
        setProcessedData(dataCache);
        setLoading(false);
        return;
      }

      console.log("MEMULAI PROSES PEMUATAN DAN PENGOLAHAN DATA PETA...");
      setLoading(true);
      try {
        const [paud, pkbm, sd, smp, kecamatanGeoJSON, desaGeoJSON] = await Promise.all([
          fetchJSON(API_ENDPOINTS.paud),
          fetchJSON(API_ENDPOINTS.pkbm),
          fetchJSON(API_ENDPOINTS.sd),
          fetchJSON(API_ENDPOINTS.smp),
          fetchJSON(API_ENDPOINTS.kecamatan),
          fetchJSON(API_ENDPOINTS.desa),
        ]);

        const allSchools = [
          ...Object.values(paud).flat(),
          ...Object.values(pkbm).flat(),
          ...Object.values(sd).flat(),
          ...Object.values(smp).flat(),
        ].filter(s => s.coordinates && s.coordinates.length === 2 && s.kecamatan);

        // **PERBAIKAN KUNCI #1: NORMALISASI DATA & AGREGASI**
        // Buat peta (Map object) untuk menghitung sekolah, dengan kunci kecamatan dalam HURUF BESAR.
        const schoolCounts = allSchools.reduce((acc, school) => {
          const kecamatanKey = school.kecamatan.toUpperCase(); // Ubah jadi uppercase
          acc[kecamatanKey] = (acc[kecamatanKey] || 0) + 1;
          return acc;
        }, {});
        
        console.log("Hasil Perhitungan Sekolah per Kecamatan:", schoolCounts);

        // **PERBAIKAN KUNCI #2: PROSES DATA KECAMATAN DENGAN KUNCI NORMAL**
        // Siapkan data akhir untuk dirender di peta
        const kecamatanData = kecamatanGeoJSON.features.map(feature => {
          const districtName = feature.properties.district; // Ini sudah UPPERCASE
          const center = turf.centroid(feature.geometry).geometry.coordinates;
          
          return {
            name: feature.properties.district, // Tetap gunakan nama asli untuk display
            schoolCount: schoolCounts[districtName] || 0, // Mencocokkan dengan kunci UPPERCASE
            center: [center[1], center[0]], // Balik ke format [lat, lon] untuk Leaflet
          };
        }).filter(kec => kec.schoolCount > 0); // Opsional: hanya tampilkan kecamatan yg ada sekolahnya

        console.log("Data Kecamatan yang Siap Ditampilkan:", kecamatanData);
        
        if (kecamatanData.length === 0) {
            console.error("Tidak ada data kecamatan yang berhasil diproses. Cek kembali logika pencocokan nama.");
        }

        const finalData = {
          schools: allSchools,
          kecamatanData,
          desaGeoJSON,
        };
        dataCache = finalData;
        setProcessedData(finalData);

      } catch (err) {
        console.error("KESALAHAN FATAL SAAT MEMUAT DATA:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadAndProcessData();
  }, []);

  return { ...processedData, loading, error };
};

export default useMapData;