// src/hooks/useSchoolData.js - FILE BARU

import { useState, useEffect } from 'react';
import { getSchools } from '../services/api/schoolApi'; // Asumsi fungsi ini ada untuk fetch data

const useSchoolData = () => {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        setLoading(true);
        const data = await getSchools(); // Memanggil fungsi API
        setSchools(data);
        setError(null);
      } catch (err) {
        setError(err);
        console.error('Gagal mengambil data sekolah:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchools();
  }, []); // Array dependensi kosong agar hanya berjalan sekali saat komponen mount

  return { schools, loading, error };
};

export default useSchoolData;