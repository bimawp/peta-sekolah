import React from 'react';
import styles from './SchoolDetailPkbm.module.css'; // File CSS dari langkah sebelumnya sudah benar
import Button from '../../../ui/Button/Button';

// Fungsi bantuan untuk mengambil data secara aman, dengan nilai default jika kosong
const getData = (data, path, defaultValue = '-') => {
  const value = path.reduce((obj, key) => (obj && obj[key] != null ? obj[key] : undefined), data);
  // Mengembalikan nilai default jika value-nya kosong, null, atau undefined
  return (value !== undefined && value !== null && value !== "") ? value : defaultValue;
};

const SchoolDetailPkbm = ({ schoolData, onBack }) => {

  const handleLocationClick = () => {
    const coordinates = getData(schoolData, ['coordinates'], []);
    if (Array.isArray(coordinates) && coordinates.length === 2 && (coordinates[0] !== 0.0 || coordinates[1] !== 0.0)) {
      const [latitude, longitude] = coordinates;
      // URL yang sudah diperbaiki untuk menghindari error 404
      const mapUrl = `your-app-domain.com/maps.google.com/9%7Blatitude%7D,107.874955 was{latitude},${longitude}`;
      window.open(mapUrl, '_blank', 'noopener,noreferrer');
    } else {
      alert('Data koordinat lokasi untuk sekolah ini tidak tersedia atau tidak valid.');
    }
  };

  if (!schoolData) {
    return <div className={styles.container}><p>Memuat data...</p></div>;
  }

  return (
    <div className={styles.container}>
      {/* Tombol kembali tidak ada di format, jadi saya beri komentar. Bisa dihapus jika tidak perlu. */}
      {/* <Button onClick={onBack} style={{ marginBottom: '20px' }}> ← Kembali ke Daftar </Button> */}

      {/* Header Section - Format disesuaikan agar menyatu */}
      <div className={styles.header}>
        <h1>{getData(schoolData, ['name'])}</h1>
        <p>
          <strong>NPSN:</strong>{getData(schoolData, ['npsn'])}
          <strong>Alamat:</strong>{getData(schoolData, ['address'])}
          <strong>Desa:</strong>{getData(schoolData, ['village'])}
          <strong>Kecamatan:</strong>{getData(schoolData, ['district'], 'Cikelet')}
          <strong>Jumlah Siswa:</strong>{getData(schoolData, ['student_count'])}
        </p>
        <Button onClick={handleLocationClick} className={styles.locationButton}>
          Lihat Lokasi {getData(schoolData, ['name'])} di Google Maps
        </Button>
      </div>

      <div className={styles.detailsGrid}>
        {/* Kondisi Kelas */}
        <div className={styles.detailCard}>
          <h2>Kondisi Kelas</h2>
          {/* Teks statis sesuai format */}
          <p>Informasi kondisi kelas tidak tersedia dalam format ini.</p>
        </div>

        {/* Status Tanah, Gedung & Bangunan */}
        <div className={styles.detailCard}>
          <h2>Status Tanah, Gedung & Bangunan</h2>
          <h3>Status Tanah</h3>
          <p>Lahan Tersedia: {getData(schoolData, ['building_status', 'tanah', 'land_available'], '0')}</p>
          <h3>Status Gedung</h3>
          <p>-</p>
        </div>

        {/* Data Siswa */}
        <div className={styles.detailCard}>
          <h2>Data Siswa</h2>
          <p>Jumlah Siswa Laki-Laki : {getData(schoolData, ['st_male'])}</p>
          <p>Jumlah Siswa Perempuan : {getData(schoolData, ['st_female'])}</p>
        </div>

        {/* Rombel */}
        <div className={styles.detailCard}>
          <h2>Rombel</h2>
          <p>Tipe sekolah tidak memiliki data rombel khusus.</p>
        </div>

        {/* Data Furniture dan Komputer */}
        <div className={styles.detailCard}>
          <h2>Data Furniture dan Komputer</h2>
          <p>Jumlah Meja: {getData(schoolData, ['furniture_computer', 'tables'])}</p>
          <p>Jumlah Kursi: {getData(schoolData, ['furniture_computer', 'chairs'])}</p>
          <p>Kekurangan Meja: {getData(schoolData, ['furniture_computer', 'n_tables'])}</p>
          <p>Kekurangan Kursi: {getData(schoolData, ['furniture_computer', 'n_chairs'])}</p>
          <p>Jumlah Papan Tulis: {getData(schoolData, ['furniture_computer', 'boards'])}</p>
          <p>Jumlah Komputer: {getData(schoolData, ['furniture_computer', 'computer'])}</p>
        </div>

        {/* Data Guru */}
        <div className={styles.detailCard}>
          <h2>Data Guru</h2>
          <p>Jumlah Guru: {getData(schoolData, ['teacher', 'teachers'])}</p>
          <p>Kekurangan Guru: {getData(schoolData, ['teacher', 'n_teachers'])}</p>
          <p>Tenaga Kependidikan: {getData(schoolData, ['teacher', 'tendik'])}</p>
        </div>

        {/* Data RGKS */}
        <div className={styles.detailCard}>
          <h2>Data RGKS</h2>
          <p>RGKS: {getData(schoolData, ['rgks', 'available'])}</p>
          <p>Kondisi RGKS Baik: {getData(schoolData, ['rgks', 'good'])}</p>
          <p>Kondisi RGKS Rusak Sedang: {getData(schoolData, ['rgks', 'moderate_damage'])}</p>
          <p>Kondisi RGKS Rusak Berat: {getData(schoolData, ['rgks', 'heavy_damage'])}</p>
        </div>

        {/* Toilet */}
        <div className={styles.detailCard}>
          <h2>Toilet</h2>
          <p>Toilet Tersedia: {getData(schoolData, ['toilets', 'available'])}</p>
          <p>Toilet Kekurangan: {getData(schoolData, ['toilets', 'n_available'])}</p>
          <p>Kondisi Toilet Baik: {getData(schoolData, ['toilets', 'good'])}</p>
          <p>Kondisi Toilet Rusak Sedang: {getData(schoolData, ['toilets', 'moderate_damage'])}</p>
          <p>Kondisi Toilet Rusak Berat: {getData(schoolData, ['toilets', 'heavy_damage'])}</p>
        </div>

        {/* Alat Permainan Edukatif */}
        <div className={styles.detailCard}>
          <h2>Alat Permainan Edukatif</h2>
          <h3>APE Luar</h3>
          <p>APE Luar: {getData(schoolData, ['ape', 'luar', 'available'])}</p>
          <p>Kondisi APE Luar: {getData(schoolData, ['ape', 'luar', 'condition'])}</p>
          <h3>APE Dalam</h3>
          <p>APE Dalam: {getData(schoolData, ['ape', 'dalam', 'available'])}</p>
          <p>Kondisi APE Dalam: {getData(schoolData, ['ape', 'dalam', 'condition'])}</p>
        </div>

        {/* UKS */}
        <div className={styles.detailCard}>
          <h2>UKS</h2>
          <p>Fasilitas UKS: {getData(schoolData, ['uks', 'available'])}</p>
        </div>

        {/* Area Bermain */}
        <div className={styles.detailCard}>
          <h2>Area Bermain</h2>
          <p>Lahan Bermain: {getData(schoolData, ['playground_area', 'available'])}</p>
        </div>
      </div>
    </div>
  );
};

export default SchoolDetailPkbm;