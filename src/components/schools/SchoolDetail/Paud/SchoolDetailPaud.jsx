// src/components/schools/SchoolDetail/Paud/SchoolDetailPaud.jsx (KODE FINAL YANG SUDAH DIPERBAIKI)
import React from 'react';
import styles from './SchoolDetailPaud.module.css';
import Button from '../../../ui/Button/Button';

const SchoolDetailPaud = ({ schoolData, onBack }) => {
  // Fungsi untuk membuka Google Maps di tab baru
  const handleLocationClick = () => {
    if (schoolData?.coordinates && schoolData.coordinates.length === 2) {
      const lat = schoolData.coordinates[0];
      const lng = schoolData.coordinates[1];
      if (lat !== 0 && lng !== 0) {
        const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        alert('Koordinat lokasi untuk sekolah ini tidak valid.');
      }
    } else {
      alert('Koordinat lokasi untuk sekolah ini tidak tersedia.');
    }
  };

  // Fungsi bantuan untuk mengambil data secara aman, mengembalikan nilai default jika tidak ada
  const getData = (path, defaultValue = '-') => {
    if (!schoolData) return defaultValue;
    const value = path.reduce((obj, key) => (obj && obj[key] != null ? obj[key] : undefined), schoolData);
    if (value === 0) return 0;
    return value || defaultValue;
  };

  if (!schoolData) {
    return (
      <div className={styles.container}>
        <button onClick={onBack} className={styles.backButton}>← Kembali</button>
        <h1>Data Sekolah Tidak Ditemukan</h1>
        <p>Silakan kembali dan pilih sekolah lain.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Tombol Kembali */}
      <button onClick={onBack} className={styles.backButton}>
        ← Kembali ke Daftar Sekolah
      </button>

      {/* Header Section */}
      <div className={styles.header}>
        <h1>{getData(['name'])}</h1>
        <p>NPSN: {getData(['npsn'])}</p>
        <p>Alamat: {getData(['address'])}</p>
        <p>Desa: {getData(['village'])}</p>
        <p>Kecamatan: Banjarwangi</p>
        <p>Jumlah Siswa: {getData(['student_count'])}</p>
        <Button onClick={handleLocationClick} className={styles.locationButton}>
          Lihat Lokasi di Google Maps
        </Button>
      </div>

      <div className={styles.detailsGrid}>
        {/* Kondisi Kelas */}
        <div className={styles.detailCard}>
          <h2>Kondisi Kelas</h2>
          {/* Data kondisi kelas bisa ditambahkan di sini jika ada */}
        </div>

        {/* Status Tanah, Gedung & Bangunan */}
        <div className={styles.detailCard}>
          <h2>Status Tanah, Gedung & Bangunan</h2>
          <h3>Status Tanah</h3>
          <p>Hibah: {getData(['building_status', 'tanah', 'hibah'], 'Tidak Ada')}</p>
          <p>Lahan Tersedia: {getData(['building_status', 'tanah', 'land_available'])}</p>
          <h3>Status Gedung</h3>
          <p>Menumpang: {getData(['building_status', 'gedung', 'menumpang'], 'Tidak')}</p>
        </div>

        {/* Data Siswa */}
        <div className={styles.detailCard}>
          <h2>Data Siswa</h2>
          <p>Jumlah Siswa Laki-Laki: {getData(['st_male'])}</p>
          <p>Jumlah Siswa Perempuan: {getData(['st_female'])}</p>
          <h3>Rombel</h3>
          <p>KB: {getData(['rombel', 'kb'])}</p>
        </div>

        {/* Data Furniture dan Komputer */}
        <div className={styles.detailCard}>
          <h2>Data Furniture dan Komputer</h2>
          <p>Jumlah Meja: {getData(['furniture_computer', 'tables'])}</p>
          <p>Jumlah Kursi: {getData(['furniture_computer', 'chairs'])}</p>
          <p>Kekurangan Meja: {getData(['furniture_computer', 'n_tables'])}</p>
          <p>Kekurangan Kursi: {getData(['furniture_computer', 'n_chairs'])}</p>
          <p>Jumlah Papan Tulis: {getData(['furniture_computer', 'boards'])}</p>
          <p>Jumlah Komputer: {getData(['furniture_computer', 'computer'])}</p>
        </div>

        {/* Data Guru */}
        <div className={styles.detailCard}>
          <h2>Data Guru</h2>
          <p>Jumlah Guru: {getData(['teacher', 'teachers'])}</p>
          <p>Kekurangan Guru: {getData(['teacher', 'n_teachers'])}</p>
          <p>Tenaga Kependidikan: {getData(['teacher', 'tendik'])}</p>
        </div>

        {/* Data RGKS */}
        <div className={styles.detailCard}>
          <h2>Data RGKS</h2>
          <p>RGKS: {getData(['rgks', 'n_available'], 'Tidak Ada')}</p>
          <p>Kondisi RGKS Baik: {getData(['rgks', 'good'])}</p>
          <p>Kondisi RGKS Rusak Sedang: {getData(['rgks', 'moderate_damage'])}</p>
          <p>Kondisi RGKS Rusak Berat: {getData(['rgks', 'heavy_damage'])}</p>
        </div>

        {/* Toilet */}
        <div className={styles.detailCard}>
          <h2>Toilet</h2>
          <p>Toilet Tersedia: {getData(['toilets', 'available'])}</p>
          <p>Toilet Kekurangan: {getData(['toilets', 'n_available'])}</p>
          <p>Kondisi Toilet Baik: {getData(['toilets', 'good'])}</p>
          <p>Kondisi Toilet Rusak Sedang: {getData(['toilets', 'moderate_damage'])}</p>
          <p>Kondisi Toilet Rusak Berat: {getData(['toilets', 'heavy_damage'])}</p>
        </div>

        {/* Alat Permainan Edukatif */}
        <div className={styles.detailCard}>
          <h2>Alat Permainan Edukatif</h2>
          <h3>APE Luar</h3>
          <p>APE Luar: {getData(['ape', 'luar', 'available'], 'Tidak Ada')}</p>
          <p>Kondisi APE Luar: {getData(['ape', 'luar', 'condition'])}</p>
          <h3>APE Dalam</h3>
          <p>APE Dalam: {getData(['ape', 'dalam', 'available'], 'Tidak Ada')}</p>
          <p>Kondisi APE Dalam: {getData(['ape', 'dalam', 'condition'])}</p>
        </div>

        {/* UKS */}
        <div className={styles.detailCard}>
          <h2>UKS</h2>
          <p>Fasilitas UKS: {getData(['uks', 'n_available'], 'Tidak Ada')}</p>
        </div>

        {/* Area Bermain */}
        <div className={styles.detailCard}>
          <h2>Area Bermain</h2>
          <p>Lahan Bermain: {getData(['playground_area', 'available'], '-')}</p>
        </div>
      </div>
    </div>
  );
};

export default SchoolDetailPaud;