// src/hooks/useMapData.js

import { useState, useEffect, useMemo } from 'react';
import { API_ENDPOINTS } from '../config/mapConstants.js';

const fetchJSON = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Gagal memuat data dari ${url}: Status ${response.status}`);
  }
  return response.json();
};

let dataCache = null;

const useMapData = (filters) => {
  const [masterData, setMasterData] = useState({
    allSchools: [],
    kecamatanGeoJSON: null,
    desaGeoJSON: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAllData = async () => {
      console.log("Memulai proses memuat data peta...");
      setLoading(true);
      setError(null);

      if (dataCache) {
        console.log("Menggunakan data dari cache.");
        setMasterData(dataCache);
        setLoading(false);
        return;
      }

      try {
        const [paud, pkbm, sd, smp, kecamatanGeoJSON, desaGeoJSON] = await Promise.all([
          fetchJSON(API_ENDPOINTS.paud),
          fetchJSON(API_ENDPOINTS.pkbm),
          fetchJSON(API_ENDPOINTS.sd),
          fetchJSON(API_ENDPOINTS.smp),
          fetchJSON(API_ENDPOINTS.kecamatan),
          fetchJSON(API_ENDPOINTS.desa),
        ]);
        
        console.log("Data GeoJSON Kecamatan diterima:", kecamatanGeoJSON);
        console.log("Data GeoJSON Desa diterima:", desaGeoJSON);

        const allSchools = [
          ...Object.values(paud).flat(),
          ...Object.values(pkbm).flat(),
          ...Object.values(sd).flat(),
          ...Object.values(smp).flat(),
        ].filter(school => {
          const isValid = school.coordinates && Array.isArray(school.coordinates) && school.coordinates.length === 2;
          if (!isValid && school.name) {
            console.warn(`Sekolah "${school.name}" tidak memiliki koordinat yang valid.`);
          }
          return isValid;
        });
        
        console.log(`Total sekolah dengan koordinat valid: ${allSchools.length}`);

        const newData = { allSchools, kecamatanGeoJSON, desaGeoJSON };
        dataCache = newData;
        setMasterData(newData);

      } catch (err) {
        console.error("Kesalahan fatal saat memuat data peta:", err);
        setError(err.message);
      } finally {
        setLoading(false);
        console.log("Proses memuat data selesai.");
      }
    };

    loadAllData();
  }, []);

  const filteredSchools = useMemo(() => {
    if (loading || !masterData.allSchools) return [];

    return masterData.allSchools.filter(school => {
      const { jenjang, kecamatan, desa } = filters;
      let match = true;
      if (jenjang !== 'semua' && school.type.toLowerCase() !== jenjang) {
        match = false;
      }
      // Logika filter hanya berlaku jika KECAMATAN BUKAN 'semua'
      if (kecamatan !== 'semua' && school.kecamatan !== kecamatan) {
        match = false;
      }
      if (desa !== 'semua' && school.village !== desa) {
        match = false;
      }
      return match;
    });
  }, [filters, masterData.allSchools, loading]);

  return { ...masterData, allSchools: filteredSchools, loading, error };
};

export default useMapData;