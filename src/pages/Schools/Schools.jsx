// src/pages/Schools/Schools.jsx - GANTI SELURUH ISI FILE INI

import React from 'react';
import useSchoolData from '../../hooks/useSchoolData';
import FilterPanel from '../Map/FilterPanel'; // Import FilterPanel
import styles from './Schools.module.css';

const Schools = () => {
  const { schools, loading, error } = useSchoolData();

  // Perbaikan: Format data 'schools' yang merupakan array, 
  // menjadi objek yang diharapkan oleh FilterPanel.
  const structuredSchoolData = React.useMemo(() => {
    if (!schools) return null;
    const data = { paud: [], sd: [], smp: [], pkbm: [] };
    schools.forEach(school => {
      const jenjangKey = school.jenjang?.toLowerCase();
      if (jenjangKey && data[jenjangKey]) {
        data[jenjangKey].push(school);
      }
    });
    return data;
  }, [schools]);

  if (loading) {
    return <div className={styles.loading}>Memuat data sekolah...</div>;
  }

  if (error) {
    return <div className={styles.error}>Gagal memuat data sekolah: {error.message}</div>;
  }

  // Render FilterPanel hanya jika data sudah siap dan diformat dengan benar
  if (!structuredSchoolData) {
    return <div className={styles.loading}>Memuat data...</div>;
  }

  return (
    <div className={styles.schools}>
      <h1>Daftar Sekolah</h1>
      {/* Meneruskan data yang sudah diformat dengan benar */}
      {/* Catatan: Di sini, saya mengasumsikan Anda ingin menggunakan FilterPanel di halaman Schools. */}
      {/* Jika tidak, Anda bisa menghapus bagian ini. */}
      <FilterPanel schoolData={structuredSchoolData} geoData={null} /> 
      {/* Tambahkan komponen tabel sekolah atau filter lainnya di sini */}
    </div>
  );
};

export default Schools;