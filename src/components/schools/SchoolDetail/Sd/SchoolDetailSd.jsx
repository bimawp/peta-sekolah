import React from 'react';
import styles from './SchoolDetailSd.module.css';
import Button from '../../../ui/Button/Button';

// Helper function untuk mendapatkan data dengan aman. Mencegah error jika ada data yang hilang.
const getData = (data, path, defaultValue = 'N/A') => {
  const value = path.reduce((obj, key) => (obj && obj[key] != null ? obj[key] : undefined), data);
  return value !== undefined ? value : defaultValue;
};

const SchoolDetailSd = ({ schoolData, onBack }) => {

  const handleLocationClick = () => {
    const coordinates = getData(schoolData, ['coordinates'], []);
    if (Array.isArray(coordinates) && coordinates.length === 2) {
      const [latitude, longitude] = coordinates;
      
      // === INI ADALAH BARIS YANG DIPERBAIKI ===
      // Menggunakan format URL Google Maps yang benar
      const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
      // =======================================

      window.open(mapUrl, '_blank', 'noopener', 'noreferrer');
    } else {
      alert('Data koordinat lokasi untuk sekolah ini tidak tersedia.');
    }
  };

  // Jika data sekolah belum ada, tampilkan pesan loading.
  if (!schoolData) {
    return (
      <div className={styles.container}>
        <p>Memuat data sekolah...</p>
        <Button onClick={onBack}>Kembali</Button>
      </div>
    );
  }
  
  // Data untuk chart kondisi kelas
  const classCondition = getData(schoolData, ['class_condition'], {});
  const totalRooms = getData(classCondition, ['total_room'], 1); // Hindari pembagian dengan nol
  const calculateHeight = (value) => {
    if (!value || totalRooms === 0) return '0%';
    return `${(value / totalRooms) * 100}%`;
  };

  return (
    <div className={styles.container}>
      {/* Tombol Kembali */}
      <div style={{ marginBottom: '20px' }}>
         <Button onClick={onBack}>Kembali</Button>
      </div>

      {/* Header Section */}
      <div className={styles.header}>
        <h1>{getData(schoolData, ['name'])}</h1>
        <div className={styles.basicInfo}>
          <p><strong>NPSN:</strong> {getData(schoolData, ['npsn'])}</p>
          <p><strong>Alamat:</strong> {getData(schoolData, ['address'])}</p>
          <p><strong>Desa:</strong> {getData(schoolData, ['village'])}</p>
          <p><strong>Kecamatan:</strong> {getData(schoolData, ['district'], 'Banjarwangi')}</p>
          <p><strong>Jumlah Siswa:</strong> {getData(schoolData, ['student_count'])}</p>
          <button onClick={handleLocationClick} className={styles.mapButton}>
            Lihat Lokasi {getData(schoolData, ['name'])} di Google Maps
          </button>
        </div>
      </div>

      {/* Kondisi Kelas */}
      <div className={styles.section}>
        <h2>Kondisi Kelas</h2>
        <div className={styles.chartContainer}>
          <div className={styles.chart}>
            <div className={styles.chartBar}>
              <div className={styles.bar} style={{ height: calculateHeight(getData(classCondition, ['classrooms_good'])) }}>
                {getData(classCondition, ['classrooms_good'], 0)}
              </div>
              <span>Baik</span>
            </div>
            <div className={styles.chartBar}>
              <div className={styles.bar} style={{ height: calculateHeight(getData(classCondition, ['classrooms_heavy_damage'])), backgroundColor: '#FF4444' }}>
                {getData(classCondition, ['classrooms_heavy_damage'], 0)}
              </div>
              <span>Rusak Berat</span>
            </div>
            <div className={styles.chartBar}>
              <div className={styles.bar} style={{ height: calculateHeight(getData(classCondition, ['classrooms_moderate_damage'])) }}>
                {getData(classCondition, ['classrooms_moderate_damage'], 0)}
              </div>
              <span>Rusak Sedang</span>
            </div>
            <div className={styles.chartBar}>
              <div className={styles.bar} style={{ height: calculateHeight(getData(classCondition, ['lacking_rkb'])), backgroundColor: '#FFFF00' }}>
                {getData(classCondition, ['lacking_rkb'], 0)}
              </div>
              <span>Kurang RKB</span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Fisik Bangunan Sekolah */}
      <div className={styles.section}>
        <h2>Data Fisik Bangunan Sekolah</h2>
        <p>Luas Tanah: {getData(schoolData, ['facilities', 'land_area'])} m²</p>
        <p>Luas Bangunan: {getData(schoolData, ['facilities', 'building_area'])} m²</p>
        <p>Luas Halaman: {getData(schoolData, ['facilities', 'yard_area'])} m²</p>
      </div>

      {/* Data Kelas */}
      <div className={styles.section}>
        <h2>Data Kelas</h2>
        <div className={styles.gradeGrid}>
          <div className={styles.gradeItem}><p>Kelas 1 Laki-laki: {getData(schoolData, ['classes', '1_L'], 0)}</p><p>Kelas 1 Perempuan: {getData(schoolData, ['classes', '1_P'], 0)}</p></div>
          <div className={styles.gradeItem}><p>Kelas 2 Laki-laki: {getData(schoolData, ['classes', '2_L'], 0)}</p><p>Kelas 2 Perempuan: {getData(schoolData, ['classes', '2_P'], 0)}</p></div>
          <div className={styles.gradeItem}><p>Kelas 3 Laki-laki: {getData(schoolData, ['classes', '3_L'], 0)}</p><p>Kelas 3 Perempuan: {getData(schoolData, ['classes', '3_P'], 0)}</p></div>
          <div className={styles.gradeItem}><p>Kelas 4 Laki-laki: {getData(schoolData, ['classes', '4_L'], 0)}</p><p>Kelas 4 Perempuan: {getData(schoolData, ['classes', '4_P'], 0)}</p></div>
          <div className={styles.gradeItem}><p>Kelas 5 Laki-laki: {getData(schoolData, ['classes', '5_L'], 0)}</p><p>Kelas 5 Perempuan: {getData(schoolData, ['classes', '5_P'], 0)}</p></div>
          <div className={styles.gradeItem}><p>Kelas 6 Laki-laki: {getData(schoolData, ['classes', '6_L'], 0)}</p><p>Kelas 6 Perempuan: {getData(schoolData, ['classes', '6_P'], 0)}</p></div>
        </div>
      </div>

      {/* Rombel */}
      <div className={styles.section}>
        <h2>Rombel</h2>
        <p>Jumlah Rombel Kelas 1: {getData(schoolData, ['rombel', '1'])}</p>
        <p>Jumlah Rombel Kelas 2: {getData(schoolData, ['rombel', '2'])}</p>
        <p>Jumlah Rombel Kelas 3: {getData(schoolData, ['rombel', '3'])}</p>
        <p>Jumlah Rombel Kelas 4: {getData(schoolData, ['rombel', '4'])}</p>
        <p>Jumlah Rombel Kelas 5: {getData(schoolData, ['rombel', '5'])}</p>
        <p>Jumlah Rombel Kelas 6: {getData(schoolData, ['rombel', '6'])}</p>
        <p><strong>Jumlah Keseluruhan Rombel: {getData(schoolData, ['rombel', 'total'])}</strong></p>
      </div>

      {/* Data Perpustakaan */}
      <div className={styles.section}>
        <h2>Data Perpustakaan</h2>
        <p>Jumlah Ruang Perpustakaan: {getData(schoolData, ['library', 'total'])}</p>
        <p>Kondisi Baik: {getData(schoolData, ['library', 'good'])}</p>
        <p>Rusak Sedang: {getData(schoolData, ['library', 'moderate_damage'])}</p>
        <p>Rusak Berat: {getData(schoolData, ['library', 'heavy_damage'])}</p>
      </div>
      
      {/* Data Ruang Guru */}
      <div className={styles.section}>
        <h2>Data Ruang Guru</h2>
        <p>Jumlah Ruang Guru: {getData(schoolData, ['teacher_room', 'total'])}</p>
        <p>Kondisi Baik: {getData(schoolData, ['teacher_room', 'good'])}</p>
        <p>Rusak Sedang: {getData(schoolData, ['teacher_room', 'moderate_damage'])}</p>
        <p>Rusak Berat: {getData(schoolData, ['teacher_room', 'heavy_damage'])}</p>
      </div>

      {/* UKS */}
      <div className={styles.section}>
        <h2>UKS</h2>
        <p>Jumlah Ruang UKS: {getData(schoolData, ['uks_room', 'total'])}</p>
        <p>Kondisi Baik: {getData(schoolData, ['uks_room', 'good'])}</p>
        <p>Rusak Sedang: {getData(schoolData, ['uks_room', 'moderate_damage'])}</p>
        <p>Rusak Berat: {getData(schoolData, ['uks_room', 'heavy_damage'])}</p>
      </div>

      {/* Toilet */}
      <div className={styles.section}>
        <h2>Toilet</h2>
        <p>Jumlah Toilet: {getData(schoolData, ['toilets', 'total'])}</p>
        <p>Kondisi Baik: {getData(schoolData, ['toilets', 'good'])}</p>
        <p>Rusak Sedang: {getData(schoolData, ['toilets', 'moderate_damage'])}</p>
        <p>Rusak Berat: {getData(schoolData, ['toilets', 'heavy_damage'])}</p>
      </div>

      {/* Data Furniture dan Komputer (Diasumsikan tidak ada di JSON, akan menampilkan N/A) */}
      <div className={styles.section}>
        <h2>Data Furniture dan Komputer</h2>
        <p>Data tidak tersedia</p>
      </div>

      {/* Data Rumah Dinas (Diasumsikan tidak ada di JSON, akan menampilkan N/A) */}
      <div className={styles.section}>
        <h2>Data Rumah Dinas</h2>
        <p>Data tidak tersedia</p>
      </div>
    </div>
  );
};

export default SchoolDetailSd;