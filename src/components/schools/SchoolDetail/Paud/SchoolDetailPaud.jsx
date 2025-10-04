// src/components/schools/SchoolDetail/Paud/SchoolDetailPaud.jsx - KODE FINAL DAN TERKOREKSI
import React from 'react';
import styles from './SchoolDetailPaud.module.css';
import Button from '../../../ui/Button/Button';

// Helper function untuk mendapatkan data secara aman dari objek
const getData = (data, path, defaultValue = 0) => {
    const value = path.reduce((obj, key) => (obj && obj[key] != null) ? obj[key] : undefined, data);
    if (value === 0.0) return 0;
    return value !== null && value !== undefined && value !== '' ? value : defaultValue;
};

// Helper function untuk mencari status kepemilikan
const findOwner = (obj, defaultValue = '-') => {
    if (!obj) return defaultValue;
    for (const key in obj) {
        if (obj[key] === 'Ya') {
            // Mengubah format dari 'snake_case' menjadi 'Title Case'
            return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
        }
    }
    return defaultValue;
};


const SchoolDetailPaud = ({ schoolData, onBack }) => {

  const handleLocationClick = () => {
    if (schoolData?.coordinates?.length === 2) {
      const [lat, lng] = schoolData.coordinates;
      const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      alert('Koordinat lokasi untuk sekolah ini tidak tersedia.');
    }
  };

  if (!schoolData) {
    return (
      <div className={styles.container}>
        <button onClick={onBack} className={styles.backButton}>← Kembali</button>
        <p>Data sekolah tidak ditemukan.</p>
      </div>
    );
  }

  // === DATA UNTUK BAR CHART KONDISI KELAS (SESUAI paud.json) ===
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
    if (numValue === 0) return '0%';
    return `${(numValue / numMax) * 100}%`;
  };
  // =============================================================
  
  const totalSiswa = Number(getData(schoolData, ['student_count'], 0));
  const landOwnership = findOwner(getData(schoolData, ['building_status', 'tanah'], null), 'Tidak Ada');
  const buildingOwnership = findOwner(getData(schoolData, ['building_status', 'gedung'], null), 'Tidak Diketahui');

  return (
    <div className={styles.container}>
      <button onClick={onBack} className={styles.backButton}>
        ← Kembali ke Daftar Sekolah
      </button>

      <div className={styles.header}>
        <h1 className={styles.schoolName}>{schoolData.name || 'Nama Sekolah Tidak Tersedia'}</h1>
        <div className={styles.schoolInfo}>
          <div className={styles.infoRow}><span className={styles.label}>NPSN</span><span className={styles.colon}>:</span><span className={styles.value}>{schoolData.npsn || '-'}</span></div>
          <div className={styles.infoRow}><span className={styles.label}>Alamat</span><span className={styles.colon}>:</span><span className={styles.value}>{schoolData.address || '-'}</span></div>
          <div className={styles.infoRow}><span className={styles.label}>Desa</span><span className={styles.colon}>:</span><span className={styles.value}>{schoolData.village || '-'}</span></div>
          <div className={styles.infoRow}><span className={styles.label}>Kecamatan</span><span className={styles.colon}>:</span><span className={styles.value}>{schoolData.kecamatan || '-'}</span></div>
          <div className={styles.infoRow}><span className={styles.label}>Jumlah Siswa</span><span className={styles.colon}>:</span><span className={styles.value}>{totalSiswa}</span></div>
        </div>
        <button onClick={handleLocationClick} className={styles.locationButton}>
          Lihat Lokasi {schoolData.name || ''} di Google Maps
        </button>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Kondisi & Intervensi Ruang Kelas</h2>
        <div className={styles.card}>
            <div className={styles.chartContainer}>
                <div className={styles.chart}>
                    <div className={styles.barContainer}>
                        <div className={`${styles.bar} ${styles.barRed}`} style={{ height: calculateHeight(rusakBerat) }}><span className={styles.barLabel}>{rusakBerat}</span></div>
                        <span className={styles.barText}>Rusak Berat</span>
                    </div>
                    <div className={styles.barContainer}>
                        <div className={`${styles.bar} ${styles.barYellow}`} style={{ height: calculateHeight(rusakSedang) }}><span className={styles.barLabel}>{rusakSedang}</span></div>
                        <span className={styles.barText}>Rusak Sedang</span>
                    </div>
                    <div className={styles.barContainer}>
                        <div className={`${styles.bar} ${styles.barBlue}`} style={{ height: calculateHeight(kurangRkb) }}><span className={styles.barLabel}>{kurangRkb}</span></div>
                        <span className={styles.barText}>Kurang RKB</span>
                    </div>
                    <div className={styles.barContainer}>
                        <div className={`${styles.bar} ${styles.barPurple}`} style={{ height: calculateHeight(rehabKegiatan) }}><span className={styles.barLabel}>{rehabKegiatan}</span></div>
                        <span className={styles.barText}>Rehabilitasi</span>
                    </div>
                    <div className={styles.barContainer}>
                        <div className={`${styles.bar} ${styles.barOrange}`} style={{ height: calculateHeight(pembangunanKegiatan) }}><span className={styles.barLabel}>{pembangunanKegiatan}</span></div>
                        <span className={styles.barText}>Pembangunan RKB</span>
                    </div>
                </div>
            </div>
        </div>
      </div>
      
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Status Tanah, Gedung & Bangunan</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Status Tanah</h3>
            {/* PERBAIKAN LOGIKA: Menampilkan status kepemilikan tanah */}
            <div className={styles.dataRow}><span>Kepemilikan: {landOwnership}</span></div>
            <div className={styles.dataRow}><span>Lahan Tersedia: {getData(schoolData, ['building_status', 'tanah', 'land_available'], '-')} m²</span></div>
          </div>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Status Gedung</h3>
            {/* PERBAIKAN LOGIKA: Menampilkan status kepemilikan gedung */}
            <div className={styles.dataRow}><span>Kepemilikan: {buildingOwnership}</span></div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Siswa</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Jumlah Siswa Laki-Laki : {getData(schoolData, ['st_male'], 0)}</span></div>
          <div className={styles.dataRow}><span>Jumlah Siswa Perempuan : {getData(schoolData, ['st_female'], 0)}</span></div>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Rombel</h3>
            <div className={styles.dataRow}><span>KB: {getData(schoolData, ['rombel', 'kb'], 0)}</span></div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Furniture dan Komputer</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Jumlah Meja: {getData(schoolData, ['furniture_computer', 'tables'], 0)}</span></div>
          <div className={styles.dataRow}><span>Jumlah Kursi: {getData(schoolData, ['furniture_computer', 'chairs'], 0)}</span></div>
          <div className={styles.dataRow}><span>Kekurangan Meja: {getData(schoolData, ['furniture_computer', 'n_tables'], 0)}</span></div>
          <div className={styles.dataRow}><span>Kekurangan Kursi: {getData(schoolData, ['furniture_computer', 'n_chairs'], 0)}</span></div>
          <div className={styles.dataRow}><span>Jumlah Papan Tulis: {getData(schoolData, ['furniture_computer', 'boards'], 0)}</span></div>
          <div className={styles.dataRow}><span>Jumlah Komputer: {getData(schoolData, ['furniture_computer', 'computer'], 0)}</span></div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Guru</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Jumlah Guru: {getData(schoolData, ['teacher', 'teachers'], 0)}</span></div>
          <div className={styles.dataRow}><span>Kekurangan Guru: {getData(schoolData, ['teacher', 'n_teachers'], 0)}</span></div>
          <div className={styles.dataRow}><span>Tenaga Kependidikan: {getData(schoolData, ['teacher', 'tendik'], 0)}</span></div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data RGKS</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>RGKS: {getData(schoolData, ['rgks', 'n_available'], 'Tidak Ada')}</span></div>
          <div className={styles.dataRow}><span>Kondisi RGKS Baik: {getData(schoolData, ['rgks', 'good'], '-')}</span></div>
          <div className={styles.dataRow}><span>Kondisi RGKS Rusak Sedang: {getData(schoolData, ['rgks', 'moderate_damage'], '-')}</span></div>
          <div className={styles.dataRow}><span>Kondisi RGKS Rusak Berat: {getData(schoolData, ['rgks', 'heavy_damage'], '-')}</span></div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Toilet</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Toilet Tersedia: {getData(schoolData, ['toilets', 'available'], 0)}</span></div>
          <div className={styles.dataRow}><span>Toilet Kekurangan: {getData(schoolData, ['toilets', 'n_available'], 0)}</span></div>
          <div className={styles.dataRow}><span>Kondisi Toilet Baik: {getData(schoolData, ['toilets', 'good'], 0)}</span></div>
          <div className={styles.dataRow}><span>Kondisi Toilet Rusak Sedang: {getData(schoolData, ['toilets', 'moderate_damage'], 0)}</span></div>
          <div className={styles.dataRow}><span>Kondisi Toilet Rusak Berat: {getData(schoolData, ['toilets', 'heavy_damage'], 0)}</span></div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Alat Permainan Edukatif</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>APE Luar</h3>
            <div className={styles.dataRow}><span>APE Luar: {getData(schoolData, ['ape', 'luar', 'available'], '-')}</span></div>
            <div className={styles.dataRow}><span>Kondisi APE Luar: {getData(schoolData, ['ape', 'luar', 'condition'], '-')}</span></div>
          </div>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>APE Dalam</h3>
            <div className={styles.dataRow}><span>APE Dalam: {getData(schoolData, ['ape', 'dalam', 'available'], '-')}</span></div>
            <div className={styles.dataRow}><span>Kondisi APE Dalam: {getData(schoolData, ['ape', 'dalam', 'condition'], '-')}</span></div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>UKS</h2>
        <div className={styles.card}>
            <div className={styles.dataRow}><span>Fasilitas UKS: {getData(schoolData, ['uks', 'n_available'], 'Tidak Ada')}</span></div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Area Bermain</h2>
        <div className={styles.card}>
            <div className={styles.dataRow}><span>Lahan Bermain: {getData(schoolData, ['playground_area', 'n_available'], '-')}</span></div>
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <Button onClick={onBack}>Kembali</Button>
      </div>
    </div>
  );
};

export default SchoolDetailPaud;