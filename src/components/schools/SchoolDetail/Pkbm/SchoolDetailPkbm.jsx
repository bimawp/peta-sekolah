// src/components/schools/SchoolDetail/Pkbm/SchoolDetailPkbm.jsx - KODE FINAL DAN TERKOREKSI
import React from 'react';
import styles from './SchoolDetailPkbm.module.css';

// Fungsi bantuan untuk mengambil data secara aman
const getData = (data, path, defaultValue = 0) => {
    const value = path.reduce((obj, key) => (obj && obj[key] != null ? obj[key] : undefined), data);
    if (value === 0.0) return 0;
    return value !== null && value !== undefined && value !== '' ? value : defaultValue;
};

// Fungsi bantuan untuk mencari status kepemilikan
const findOwnershipStatus = (obj, defaultValue = '-') => {
    if (!obj) return defaultValue;
    for (const key in obj) {
        if (obj[key] === 'Ya') {
            return key.charAt(0).toUpperCase() + key.slice(1);
        }
    }
    return defaultValue;
};

const SchoolDetailPkbm = ({ schoolData, onBack }) => {

  const handleLocationClick = () => {
    const coordinates = getData(schoolData, ['coordinates'], []);
    if (Array.isArray(coordinates) && coordinates.length === 2 && (coordinates[0] !== 0.0 || coordinates[1] !== 0.0)) {
        const [lat, lng] = coordinates;
        const url = `https://www.google.com/maps?q=${lat},${lng}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    } else {
        alert('Data koordinat lokasi untuk sekolah ini tidak tersedia atau tidak valid.');
    }
  };

  if (!schoolData) {
    return <div className={styles.container}><p>Memuat data...</p></div>;
  }

  // === DATA UNTUK BAR CHART KONDISI KELAS (SESUAI pkbm.json) ===
  const rusakBerat = Number(getData(schoolData, ['class_condition', 'classrooms_heavy_damage'], 0));
  const rusakSedang = Number(getData(schoolData, ['class_condition', 'classrooms_moderate_damage'], 0));
  const kurangRkb = Number(getData(schoolData, ['class_condition', 'lacking_rkb'], 0));
  
  const rehabKegiatan = Number(getData(schoolData, ['rehabRuangKelas'], 0)); 
  const pembangunanKegiatan = Number(getData(schoolData, ['pembangunanRKB'], 0)); 

  const allValues = [rusakBerat, rusakSedang, kurangRkb, rehabKegiatan, pembangunanKegiatan];
  const maxRoomValue = Math.max(...allValues, 1); 

  const calculateHeight = (value) => {
    const numValue = Number(value) || 0;
    const numMax = Number(maxRoomValue) || 1;
    if (numValue === 0) return '8px'; // Minimum height untuk visibility
    const percentage = (numValue / numMax) * 100;
    return `${Math.max(percentage, 5)}%`; // Minimum 5% agar terlihat
  };
  // =============================================================

  const landOwnership = findOwnershipStatus(getData(schoolData, ['building_status', 'tanah'], null), 'Tidak Ada');
  const buildingOwnership = findOwnershipStatus(getData(schoolData, ['building_status', 'gedung'], null), 'Tidak Diketahui');

  return (
    <div className={styles.container}>
      <button onClick={onBack} className={styles.backButton}>
        ← Kembali ke Daftar Sekolah
      </button>

      {/* HEADER */}
      <div className={styles.header}>
        <h1 className={styles.schoolName}>{getData(schoolData, ['name'], 'Nama PKBM Tidak Tersedia')}</h1>
        <div className={styles.schoolInfo}>
          <div className={styles.infoRow}>
            <span className={styles.label}>NPSN</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{getData(schoolData, ['npsn'], '-')}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Alamat</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{getData(schoolData, ['address'], '-')}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Desa</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{getData(schoolData, ['village'], '-')}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Kecamatan</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{getData(schoolData, ['kecamatan'], '-')}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Jumlah Siswa</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{getData(schoolData, ['student_count'], 0)}</span>
          </div>
        </div>
        <button onClick={handleLocationClick} className={styles.locationButton}>
          📍 Lihat Lokasi di Google Maps
        </button>
      </div>

      {/* BAR CHART SECTION */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Kondisi & Intervensi Ruang Kelas</h2>
        <div className={styles.card}>
          <div className={styles.chartContainer}>
            <div className={styles.chart}>
              <div className={styles.barContainer}>
                <div 
                  className={`${styles.bar} ${styles.barRed}`} 
                  style={{ height: calculateHeight(rusakBerat) }}
                >
                  <span className={styles.barLabel}>{rusakBerat}</span>
                </div>
                <span className={styles.barText}>Rusak Berat</span>
              </div>
              
              <div className={styles.barContainer}>
                <div 
                  className={`${styles.bar} ${styles.barYellow}`} 
                  style={{ height: calculateHeight(rusakSedang) }}
                >
                  <span className={styles.barLabel}>{rusakSedang}</span>
                </div>
                <span className={styles.barText}>Rusak Sedang</span>
              </div>
              
              <div className={styles.barContainer}>
                <div 
                  className={`${styles.bar} ${styles.barBlue}`} 
                  style={{ height: calculateHeight(kurangRkb) }}
                >
                  <span className={styles.barLabel}>{kurangRkb}</span>
                </div>
                <span className={styles.barText}>Kurang RKB</span>
              </div>
              
              <div className={styles.barContainer}>
                <div 
                  className={`${styles.bar} ${styles.barPurple}`} 
                  style={{ height: calculateHeight(rehabKegiatan) }}
                >
                  <span className={styles.barLabel}>{rehabKegiatan}</span>
                </div>
                <span className={styles.barText}>Rehabilitasi</span>
              </div>
              
              <div className={styles.barContainer}>
                <div 
                  className={`${styles.bar} ${styles.barOrange}`} 
                  style={{ height: calculateHeight(pembangunanKegiatan) }}
                >
                  <span className={styles.barLabel}>{pembangunanKegiatan}</span>
                </div>
                <span className={styles.barText}>Pembangunan RKB</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* DETAIL CARDS */}
      <div className={styles.detailsGrid}>
        <div className={styles.detailCard}>
          <h2>Status Tanah, Gedung & Bangunan</h2>
          <h3>Status Tanah</h3>
          <p><strong>Kepemilikan:</strong> {landOwnership}</p>
          <p><strong>Lahan Tersedia:</strong> {getData(schoolData, ['building_status', 'tanah', 'land_available'], '0')} m²</p>
          <h3>Status Gedung</h3>
          <p><strong>Kepemilikan:</strong> {buildingOwnership}</p>
        </div>

        <div className={styles.detailCard}>
          <h2>Data Siswa</h2>
          <p><strong>Jumlah Siswa Laki-Laki:</strong> {getData(schoolData, ['st_male'], 0)}</p>
          <p><strong>Jumlah Siswa Perempuan:</strong> {getData(schoolData, ['st_female'], 0)}</p>
        </div>

        <div className={styles.detailCard}>
          <h2>Data Furniture dan Komputer</h2>
          <p><strong>Jumlah Meja:</strong> {getData(schoolData, ['furniture_computer', 'tables'], 0)}</p>
          <p><strong>Jumlah Kursi:</strong> {getData(schoolData, ['furniture_computer', 'chairs'], 0)}</p>
          <p><strong>Kekurangan Meja:</strong> {getData(schoolData, ['furniture_computer', 'n_tables'], 0)}</p>
          <p><strong>Kekurangan Kursi:</strong> {getData(schoolData, ['furniture_computer', 'n_chairs'], 0)}</p>
          <p><strong>Jumlah Papan Tulis:</strong> {getData(schoolData, ['furniture_computer', 'boards'], 0)}</p>
          <p><strong>Jumlah Komputer:</strong> {getData(schoolData, ['furniture_computer', 'computer'], 0)}</p>
        </div>

        <div className={styles.detailCard}>
          <h2>Data Guru</h2>
          <p><strong>Jumlah Guru:</strong> {getData(schoolData, ['teacher', 'teachers'], 0)}</p>
          <p><strong>Kekurangan Guru:</strong> {getData(schoolData, ['teacher', 'n_teachers'], 0)}</p>
          <p><strong>Tenaga Kependidikan:</strong> {getData(schoolData, ['teacher', 'tendik'], 0)}</p>
        </div>

        <div className={styles.detailCard}>
          <h2>Data RGKS</h2>
          <p><strong>RGKS:</strong> {getData(schoolData, ['rgks', 'n_available'], 'Tidak Tersedia')}</p>
          <p><strong>Kondisi RGKS Baik:</strong> {getData(schoolData, ['rgks', 'good'], '-')}</p>
          <p><strong>Kondisi RGKS Rusak Sedang:</strong> {getData(schoolData, ['rgks', 'moderate_damage'], '-')}</p>
          <p><strong>Kondisi RGKS Rusak Berat:</strong> {getData(schoolData, ['rgks', 'heavy_damage'], '-')}</p>
        </div>

        <div className={styles.detailCard}>
          <h2>Toilet</h2>
          <p><strong>Toilet Tersedia:</strong> {getData(schoolData, ['toilets', 'available'], 0)}</p>
          <p><strong>Toilet Kekurangan:</strong> {getData(schoolData, ['toilets', 'n_available'], 0)}</p>
          <p><strong>Kondisi Toilet Baik:</strong> {getData(schoolData, ['toilets', 'good'], '-')}</p>
          <p><strong>Kondisi Toilet Rusak Sedang:</strong> {getData(schoolData, ['toilets', 'moderate_damage'], '-')}</p>
          <p><strong>Kondisi Toilet Rusak Berat:</strong> {getData(schoolData, ['toilets', 'heavy_damage'], '-')}</p>
        </div>

        <div className={styles.detailCard}>
          <h2>UKS</h2>
          <p><strong>Fasilitas UKS:</strong> {getData(schoolData, ['uks', 'n_available'], 'Tidak Tersedia')}</p>
        </div>
      </div>
    </div>
  );
};

export default SchoolDetailPkbm;