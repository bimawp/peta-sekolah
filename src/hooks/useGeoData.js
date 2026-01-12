// src/hooks/useGeoData.js
import { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '@/config/mapConstants';

// Cache global supaya hanya load sekali
const geoCache = {
  isLoaded: false,
  kecamatanList: [],
  desaMap: {}, // key: NORM_KEC, value: array desa
};

const norm = (txt) => String(txt || '').trim().toUpperCase();

const loadJSON = async (path) => {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`HTTP error ${res.status} saat load ${path}`);
  return res.json();
};

async function buildGeoMaster() {
  const [kecJson, desaJson] = await Promise.all([
    loadJSON(API_ENDPOINTS.kecamatan), // /data/kecamatan.geojson
    loadJSON(API_ENDPOINTS.desa), // /data/desa.geojson
  ]);

  const kecSet = new Set();
  const desaMapRaw = {};

  // Ambil semua kecamatan
  if (Array.isArray(kecJson?.features)) {
    for (const f of kecJson.features) {
      const p = f.properties || {};
      const nama =
        p.district ||
        p.District ||
        p.kecamatan ||
        p.Kecamatan ||
        p.NAMKEC ||
        p.NAMKec ||
        p.NAMOBJ ||
        p.name ||
        p.Name;
      if (nama) kecSet.add(String(nama).trim());
    }
  }

  // Ambil desa dan mapping ke kecamatan
  if (Array.isArray(desaJson?.features)) {
    for (const f of desaJson.features) {
      const p = f.properties || {};
      const desaName =
        p.village ||
        p.Village ||
        p.KELURAHAN ||
        p.kelurahan ||
        p.NAMA_DESA ||
        p.NAMOBJ ||
        p.name ||
        p.Name;
      const kecName =
        p.district ||
        p.District ||
        p.kecamatan ||
        p.Kecamatan ||
        p.NAMA_KEC ||
        p.NAMKEC ||
        p.NAMKec;
      if (!desaName || !kecName) continue;
      const kecNorm = norm(kecName);
      if (!desaMapRaw[kecNorm]) desaMapRaw[kecNorm] = new Set();
      desaMapRaw[kecNorm].add(String(desaName).trim());
      kecSet.add(String(kecName).trim());
    }
  }

  const kecamatanList = Array.from(kecSet).sort((a, b) => a.localeCompare(b, 'id'));
  const desaMap = {};
  Object.entries(desaMapRaw).forEach(([key, set]) => {
    desaMap[key] = Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  });

  geoCache.isLoaded = true;
  geoCache.kecamatanList = kecamatanList;
  geoCache.desaMap = desaMap;

  return { kecamatanList, desaMap };
}

export default function useGeoData() {
  const [state, setState] = useState({
    loading: !geoCache.isLoaded,
    error: null,
    kecamatanList: geoCache.kecamatanList,
    desaMap: geoCache.desaMap,
  });

  useEffect(() => {
    let cancelled = false;
    if (geoCache.isLoaded) return;
    (async () => {
      try {
        const result = await buildGeoMaster();
        if (!cancelled) setState({ loading: false, error: null, ...result });
      } catch (err) {
        console.error('Gagal membangun master geo:', err);
        if (!cancelled)
          setState((prev) => ({
            ...prev,
            loading: false,
            error: err.message || String(err),
          }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const getDesaByKecamatan = (namaKecamatan) => {
    if (!namaKecamatan || namaKecamatan === 'Semua Kecamatan') return [];
    const key = norm(namaKecamatan);
    return state.desaMap[key] || [];
  };

  return { ...state, getDesaByKecamatan };
}
