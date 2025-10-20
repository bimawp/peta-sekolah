// src/hooks/useDashboardData.js - FILE BARU

import { useState, useEffect } from 'react';

// Daftar file JSON yang dibutuhkan oleh dashboard
const DATA_FILES = [
  '/data/paud.json',
  '/data/sd_new.json',
  '/data/smp.json',
  '/data/pkbm.json',
  '/data/data_kegiatan_paud.json',
  '/data/data_kegiatan_sd.json',
  '/data/data_kegiatan_smp.json',
  '/data/data_kegiatan_pkbm.json',
];

const useDashboardData = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const responses = await Promise.all(
          DATA_FILES.map((file) => fetch(file))
        );

        for (const res of responses) {
          if (!res.ok) {
            throw new Error(`Gagal memuat data: ${res.status} ${res.statusText}`);
          }
        }

        const jsonData = await Promise.all(responses.map((res) => res.json()));
console.log('test : ', {
          paud: jsonData[0],
          sd: jsonData[1],
          smp: jsonData[2],
          pkbm: jsonData[3],
          kegiatanPaud: jsonData[4],
          kegiatanSd: jsonData[5],
          kegiatanSmp: jsonData[6],
          kegiatanPkbm: jsonData[7],
        })
        setData({
          paud: jsonData[0],
          sd: jsonData[1],
          smp: jsonData[2],
          pkbm: jsonData[3],
          kegiatanPaud: jsonData[4],
          kegiatanSd: jsonData[5],
          kegiatanSmp: jsonData[6],
          kegiatanPkbm: jsonData[7],
        });
        setError(null);
      } catch (err) {
        console.error('Error memuat data dashboard:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return { data, loading, error };
};

export default useDashboardData;