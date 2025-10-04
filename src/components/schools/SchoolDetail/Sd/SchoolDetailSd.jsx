// src/components/schools/SchoolDetail/Sd/SchoolDetailSd.jsx - KODE FINAL DAN TERKOREKSI
import React from 'react';
import styles from './SchoolDetailSd.module.css';
import Button from '../../../ui/Button/Button';

// Helper function untuk mendapatkan data dengan aman. Mencegah error jika ada data yang hilang.
const getData = (data, path, defaultValue = 'N/A') => {
  // Menggunakan fungsi reduce untuk mengakses properti bersarang
  const value = path.reduce((obj, key) => (obj && obj[key] != null ? obj[key] : undefined), data);
  
  // Mengembalikan 0 untuk nilai 0.0 (yang merupakan angka valid), jika tidak N/A
  if (value === 0.0) return 0; 
  return value !== undefined ? value : defaultValue;
};

const SchoolDetailSd = ({ schoolData, onBack }) => {

  const handleLocationClick = () => {
    const coordinates = getData(schoolData, ['coordinates'], []);
    if (Array.isArray(coordinates) && coordinates.length === 2) {
      const [latitude, longitude] = coordinates;
      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      window.open(mapUrl, '_blank', 'noopener', 'noreferrer');
    } else {
      alert('Data koordinat lokasi untuk sekolah ini tidak tersedia.');
    }
  };

  if (!schoolData) {
    return (
      <div className={styles.container}>
        <p>Memuat data sekolah...</p>
        <Button onClick={onBack}>Kembali</Button>
      </div>
    );
  }
  
  const classCondition = getData(schoolData, ['class_condition'], {});
  
  // Ambil data untuk 5 Bar Chart (NEED + INTERVENTION)
  // Data ini diambil dari objek 'class_condition'
  const rusakBerat = Number(getData(classCondition, ['classrooms_heavy_damage'], 0));
  const rusakSedang = Number(getData(classCondition, ['classrooms_moderate_damage'], 0));
  const kurangRkb = Number(getData(classCondition, ['lacking_rkb'], 0));
  
  // Asumsi data intervensi (Rehab/Pembangunan) dilewatkan dengan nilai 0 jika tidak ada
  const rehabKegiatan = Number(getData(schoolData, ['rehabRuangKelas'], 0)); 
  const pembangunanKegiatan = Number(getData(schoolData, ['pembangunanRKB'], 0)); 

  // Menghitung total maksimum untuk penskalaan bar
  const allValues = [rusakBerat, rusakSedang, kurangRkb, rehabKegiatan, pembangunanKegiatan];
  const maxRoomValue = Math.max(...allValues, 1); 

  const calculateHeight = (value) => {
    const numValue = Number(value) || 0;
    const numMax = Number(maxRoomValue) || 1;
    if (numValue === 0) return '0%';
    return `${(numValue / numMax) * 100}%`;
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

      {/* Kondisi Kelas - Bar Chart yang Dinamis */}
      <div className={styles.section}>
        <h2>Kondisi Kelas (Need & Intervensi)</h2>
        <div className={styles.chartContainer}>
          <div className={styles.chart}>
            
            {/* Rusak Berat (NEED) */}
            <div className={styles.chartBar}>
              <div className={styles.bar} style={{ height: calculateHeight(rusakBerat), backgroundColor: '#FF4444' }}>
                {rusakBerat}
              </div>
              <span>Rusak Berat</span>
            </div>
            
            {/* Rusak Sedang (NEED) */}
            <div className={styles.chartBar}>
              <div className={styles.bar} style={{ height: calculateHeight(rusakSedang), backgroundColor: '#F59E0B' }}>
                {rusakSedang}
              </div>
              <span>Rusak Sedang</span>
            </div>
            
            {/* Kurang RKB (NEED) */}
            <div className={styles.chartBar}>
              <div className={styles.bar} style={{ height: calculateHeight(kurangRkb), backgroundColor: '#3B82F6' }}>
                {kurangRkb}
              </div>
              <span>Kurang RKB</span>
            </div>
            
            {/* Rehabilitasi Ruang Kelas (INTERVENSI) */}
            <div className={styles.chartBar}>
              <div className={styles.bar} style={{ height: calculateHeight(rehabKegiatan), backgroundColor: '#10b981' }}>
                {rehabKegiatan}
              </div>
              <span>Rehabilitasi Ruang Kelas</span>
            </div>
            
            {/* Pembangunan RKB (INTERVENSI) */}
            <div className={styles.chartBar}>
              <div className={styles.bar} style={{ height: calculateHeight(pembangunanKegiatan), backgroundColor: '#8B5CF6' }}>
                {pembangunanKegiatan}
              </div>
              <span>Pembangunan RKB</span>
            </div>
            
          </div>
          <p className={styles.chartNote}>* Angka di atas mewakili jumlah unit ruangan. Bar diskalakan berdasarkan nilai maksimum dari lima kategori di atas.</p>
        </div>
      </div>

      {/* Data Fisik Bangunan Sekolah */}
      <div className={styles.section}>
        <h2>Data Fisik Bangunan Sekolah</h2>
        <p><strong>Luas Tanah:</strong> {getData(schoolData, ['facilities', 'land_area'])} m²</p>
        <p><strong>Luas Bangunan:</strong> {getData(schoolData, ['facilities', 'building_area'])} m²</p>
        <p><strong>Luas Halaman:</strong> {getData(schoolData, ['facilities', 'yard_area'])} m²</p>
      </div>

      {/* Data Kelas */}
      <div className={styles.section}>
        <h2>Data Kelas</h2>
        <div className={styles.gradeGrid}>
          <div className={styles.gradeItem}><p><strong>Kelas 1 Laki-laki:</strong> {getData(schoolData, ['classes', '1_L'], 0)}</p><p><strong>Kelas 1 Perempuan:</strong> {getData(schoolData, ['classes', '1_P'], 0)}</p></div>
          <div className={styles.gradeItem}><p><strong>Kelas 2 Laki-laki:</strong> {getData(schoolData, ['classes', '2_L'], 0)}</p><p><strong>Kelas 2 Perempuan:</strong> {getData(schoolData, ['classes', '2_P'], 0)}</p></div>
          <div className={styles.gradeItem}><p><strong>Kelas 3 Laki-laki:</strong> {getData(schoolData, ['classes', '3_L'], 0)}</p><p><strong>Kelas 3 Perempuan:</strong> {getData(schoolData, ['classes', '3_P'], 0)}</p></div>
          <div className={styles.gradeItem}><p><strong>Kelas 4 Laki-laki:</strong> {getData(schoolData, ['classes', '4_L'], 0)}</p><p><strong>Kelas 4 Perempuan:</strong> {getData(schoolData, ['classes', '4_P'], 0)}</p></div>
          <div className={styles.gradeItem}><p><strong>Kelas 5 Laki-laki:</strong> {getData(schoolData, ['classes', '5_L'], 0)}</p><p><strong>Kelas 5 Perempuan:</strong> {getData(schoolData, ['classes', '5_P'], 0)}</p></div>
          <div className={styles.gradeItem}><p><strong>Kelas 6 Laki-laki:</strong> {getData(schoolData, ['classes', '6_L'], 0)}</p><p><strong>Kelas 6 Perempuan:</strong> {getData(schoolData, ['classes', '6_P'], 0)}</p></div>
        </div>
      </div>

      {/* Rombel */}
      <div className={styles.section}>
        <h2>Rombel</h2>
        <p><strong>Jumlah Rombel Kelas 1:</strong> {getData(schoolData, ['rombel', '1'])}</p>
        <p><strong>Jumlah Rombel Kelas 2:</strong> {getData(schoolData, ['rombel', '2'])}</p>
        <p><strong>Jumlah Rombel Kelas 3:</strong> {getData(schoolData, ['rombel', '3'])}</p>
        <p><strong>Jumlah Rombel Kelas 4:</strong> {getData(schoolData, ['rombel', '4'])}</p>
        <p><strong>Jumlah Rombel Kelas 5:</strong> {getData(schoolData, ['rombel', '5'])}</p>
        <p><strong>Jumlah Rombel Kelas 6:</strong> {getData(schoolData, ['rombel', '6'])}</p>
        <p><strong>Jumlah Keseluruhan Rombel:</strong> {getData(schoolData, ['rombel', 'total'])}</p>
      </div>

      {/* Data Perpustakaan (Library) */}
      <div className={styles.section}>
        <h2>Data Perpustakaan</h2>
        <p><strong>Jumlah Ruang Perpustakaan:</strong> {getData(schoolData, ['library', 'total'])}</p>
        <p><strong>Kondisi Baik:</strong> {getData(schoolData, ['library', 'good'])}</p>
        <p><strong>Rusak Sedang:</strong> {getData(schoolData, ['library', 'moderate_damage'])}</p>
        <p><strong>Rusak Berat:</strong> {getData(schoolData, ['library', 'heavy_damage'])}</p>
      </div>
      
      {/* Data Ruang Guru (Teacher Room) */}
      <div className={styles.section}>
        <h2>Data Ruang Guru</h2>
        <p><strong>Jumlah Ruang Guru:</strong> {getData(schoolData, ['teacher_room', 'total'])}</p>
        <p><strong>Kondisi Baik:</strong> {getData(schoolData, ['teacher_room', 'good'])}</p>
        <p><strong>Rusak Sedang:</strong> {getData(schoolData, ['teacher_room', 'moderate_damage'])}</p>
        <p><strong>Rusak Berat:</strong> {getData(schoolData, ['teacher_room', 'heavy_damage'])}</p>
      </div>

      {/* UKS (UKS Room) */}
      <div className={styles.section}>
        <h2>UKS</h2>
        <p><strong>Jumlah Ruang UKS:</strong> {getData(schoolData, ['uks_room', 'total'])}</p>
        <p><strong>Kondisi Baik:</strong> {getData(schoolData, ['uks_room', 'good'])}</p>
        <p><strong>Rusak Sedang:</strong> {getData(schoolData, ['uks_room', 'moderate_damage'])}</p>
        <p><strong>Rusak Berat:</strong> {getData(schoolData, ['uks_room', 'heavy_damage'])}</p>
      </div>

      {/* Toilet */}
      <div className={styles.section}>
        <h2>Toilet</h2>
        <p><strong>Jumlah Toilet:</strong> {getData(schoolData, ['toilets', 'total'])}</p>
        <p><strong>Kondisi Baik:</strong> {getData(schoolData, ['toilets', 'good'])}</p>
        <p><strong>Rusak Sedang:</strong> {getData(schoolData, ['toilets', 'moderate_damage'])}</p>
        <p><strong>Rusak Berat:</strong> {getData(schoolData, ['toilets', 'heavy_damage'])}</p>
      </div>

      {/* Data Furniture dan Komputer - PATH DIKOREKSI SESUAI JSON */}
      <div className={styles.section}>
        <h2>Data Furniture dan Komputer</h2>
        <div className={styles.subSection}>
            <h3>Meja</h3>
            <p><strong>Jumlah Meja:</strong> {getData(schoolData, ['furniture', 'tables', 'total'])}</p>
            <p><strong>Kondisi Baik:</strong> {getData(schoolData, ['furniture', 'tables', 'good'])}</p>
            <p><strong>Rusak Sedang:</strong> {getData(schoolData, ['furniture', 'tables', 'moderate_damage'])}</p>
            <p><strong>Rusak Berat:</strong> {getData(schoolData, ['furniture', 'tables', 'heavy_damage'])}</p>
        </div>
        <div className={styles.subSection}>
            <h3>Kursi</h3>
            <p><strong>Jumlah Kursi:</strong> {getData(schoolData, ['furniture', 'chairs', 'total'])}</p>
            <p><strong>Kondisi Baik:</strong> {getData(schoolData, ['furniture', 'chairs', 'good'])}</p>
            <p><strong>Rusak Sedang:</strong> {getData(schoolData, ['furniture', 'chairs', 'moderate_damage'])}</p>
            <p><strong>Rusak Berat:</strong> {getData(schoolData, ['furniture', 'chairs', 'heavy_damage'])}</p>
        </div>
        {/* Asumsi Papan Tulis dan Komputer tidak ada di JSON, jadi akan tetap N/A */}
        <p><strong>Jumlah Papan Tulis:</strong> {getData(schoolData, ['furniture', 'boards'])}</p>
        <p><strong>Jumlah Komputer:</strong> {getData(schoolData, ['furniture', 'computer'])}</p>
      </div>

      {/* Data Rumah Dinas - PATH DIKOREKSI SESUAI JSON */}
      <div className={styles.section}>
        <h2>Data Rumah Dinas</h2>
        <p><strong>Jumlah Rumah Dinas:</strong> {getData(schoolData, ['official_residences', 'total'])}</p>
        <p><strong>Kondisi Baik:</strong> {getData(schoolData, ['official_residences', 'good'])}</p>
        <p><strong>Rusak Sedang:</strong> {getData(schoolData, ['official_residences', 'moderate_damage'])}</p>
        <p><strong>Rusak Berat:</strong> {getData(schoolData, ['official_residences', 'heavy_damage'])}</p>
      </div>
    </div>
  );
};

export default SchoolDetailSd;