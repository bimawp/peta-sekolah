// src/components/schools/SchoolDetail/Pkbm/SchoolDetailPkbm.jsx
import React from 'react';
import styles from './SchoolDetailPkbm.module.css';

const getData = (data, path, defaultValue = 0) => {
  const value = path.reduce(
    (obj, key) => (obj && obj[key] != null ? obj[key] : undefined),
    data
  );
  if (value === 0.0) return 0;
  return value !== null && value !== undefined && value !== '' ? value : defaultValue;
};

const findOwnershipStatus = (obj, defaultValue = '-') => {
  if (!obj) return defaultValue;
  for (const key in obj) {
    if (obj[key] === 'Ya') {
      return key
        .charAt(0)
        .toUpperCase() + key.slice(1).replace(/_/g, ' ');
    }
  }
  return defaultValue;
};

const SchoolDetailPkbm = ({ schoolData }) => {
  const handleLocationClick = () => {
    const coordinates = getData(schoolData, ['coordinates'], []);
    if (Array.isArray(coordinates) && coordinates.length === 2) {
      const lngCandidate = Number(coordinates[0]);
      const latCandidate = Number(coordinates[1]);
      let lat = latCandidate;
      let lng = lngCandidate;

      // Swap kalau kebalik (lat > 90 dll)
      if (Math.abs(latCandidate) > 90 && Math.abs(lngCandidate) <= 90) {
        lat = lngCandidate;
        lng = latCandidate;
      }
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }
    }
    alert('Data koordinat lokasi untuk sekolah ini tidak tersedia atau tidak valid.');
  };

  if (!schoolData) {
    return (
      <div className={styles.container}>
        <p>Memuat data...</p>
      </div>
    );
  }

  /* ===================== I. IDENTITAS (POP: IDENTITAS) ===================== */
  const jenjang =
    schoolData.jenjang ||
    schoolData.level ||
    'PKBM';

  const statusSekolah =
    schoolData.status ||
    schoolData.status_sekolah ||
    '-';

  /* ===================== II. SISWA (POP: SISWA) ===================== */
  const siswaL = Number(getData(schoolData, ['st_male'], 0));
  const siswaP = Number(getData(schoolData, ['st_female'], 0));
  const totalDariSt = siswaL + siswaP;
  const totalSiswa = totalDariSt > 0
    ? totalDariSt
    : Number(getData(schoolData, ['student_count'], 0));

  // Placeholder kalau nanti ada data ABK di PKBM (ikut pola POP, tapi aman kalau belum ada)
  const abkL = Number(getData(schoolData, ['st_special_male'], 0));
  const abkP = Number(getData(schoolData, ['st_special_female'], 0));

  /* ===================== III. KONDISI RUANG KELAS (POP: KONDISI PRASARANA) ===================== */
  const rusakBerat = Number(
    getData(schoolData, ['class_condition', 'classrooms_heavy_damage'], 0)
  );
  const rusakSedang = Number(
    getData(schoolData, ['class_condition', 'classrooms_moderate_damage'], 0)
  );
  const kurangRkb = Number(
    getData(schoolData, ['class_condition', 'lacking_rkb'], 0)
  );
  const rehabKegiatan = Number(getData(schoolData, ['rehabRuangKelas'], 0));
  const pembangunanKegiatan = Number(getData(schoolData, ['pembangunanRKB'], 0));

  const allValues = [rusakBerat, rusakSedang, kurangRkb, rehabKegiatan, pembangunanKegiatan];
  const maxRoomValue = Math.max(...allValues, 1);

  const calculateHeight = (value) => {
    const numValue = Number(value) || 0;
    if (numValue === 0) return 'calc(0% + 20px)';
    return `calc(${(numValue / maxRoomValue) * 100}% + 20px)`;
  };

  /* ===================== IV. KONDISI PRASARANA LAIN (POP: KONDISI PRASARANA) ===================== */

  // Status tanah & gedung
  const landOwnership = findOwnershipStatus(
    getData(schoolData, ['building_status', 'tanah'], null),
    'Tidak Ada'
  );
  const buildingOwnership = findOwnershipStatus(
    getData(schoolData, ['building_status', 'gedung'], null),
    'Tidak Diketahui'
  );
  const luasLahan = getData(
    schoolData,
    ['building_status', 'tanah', 'land_available'],
    '0'
  );

  // Toilet
  const toiletAvailable = Number(getData(schoolData, ['toilets', 'available'], 0));
  const toiletShortage = Number(getData(schoolData, ['toilets', 'n_available'], 0));
  const toiletBaik = getData(schoolData, ['toilets', 'good'], '-');
  const toiletRusakSedang = getData(
    schoolData,
    ['toilets', 'moderate_damage'],
    '-'
  );
  const toiletRusakBerat = getData(schoolData, ['toilets', 'heavy_damage'], '-');

  // RGKS
  const rgksAvailable = getData(
    schoolData,
    ['rgks', 'n_available'],
    'Tidak Tersedia'
  );
  const rgksGood = getData(schoolData, ['rgks', 'good'], '-');
  const rgksModerate = getData(
    schoolData,
    ['rgks', 'moderate_damage'],
    '-'
  );
  const rgksHeavy = getData(schoolData, ['rgks', 'heavy_damage'], '-');

  // UKS
  const uksAvailable = getData(
    schoolData,
    ['uks', 'n_available'],
    'Tidak Tersedia'
  );

  /* ===================== V. FURNITURE & KOMPUTER (POP: KONDISI PRASARANA - MEBELAIR) ===================== */
  const meja = Number(getData(schoolData, ['furniture_computer', 'tables'], 0));
  const kursi = Number(getData(schoolData, ['furniture_computer', 'chairs'], 0));
  const kurangMeja = Number(getData(schoolData, ['furniture_computer', 'n_tables'], 0));
  const kurangKursi = Number(
    getData(schoolData, ['furniture_computer', 'n_chairs'], 0)
  );
  const papanTulis = Number(getData(schoolData, ['furniture_computer', 'boards'], 0));
  const komputer = Number(
    getData(schoolData, ['furniture_computer', 'computer'], 0)
  );

  /* ===================== VI. GURU (POP: GURU) ===================== */
  const jumlahGuru = Number(getData(schoolData, ['teacher', 'teachers'], 0));
  const kekuranganGuru = Number(getData(schoolData, ['teacher', 'n_teachers'], 0));
  const tenagaKependidikan = Number(
    getData(schoolData, ['teacher', 'tendik'], 0)
  );

  return (
    <div className={styles.container}>
      {/* ===================== I. IDENTITAS (POP: IDENTITAS) ===================== */}
      <div className={styles.header}>
        <h1 className={styles.schoolName}>
          {getData(schoolData, ['name'], 'Nama PKBM Tidak Tersedia')}
        </h1>

        <div className={styles.schoolInfo}>
          <div className={styles.infoRow}>
            <span className={styles.label}>Jenjang</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{jenjang}</span>
          </div>
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
            <span className={styles.label}>Jumlah Peserta Didik (Total)</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{totalSiswa}</span>
          </div>
        </div>

        <button onClick={handleLocationClick} className={styles.locationButton}>
          📍 Lihat Lokasi di Google Maps
        </button>
      </div>

      {/* ===================== II. SISWA (POP: SISWA & SISWA BERKEBUTUHAN KHUSUS) ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>II. Data Peserta Didik (Struktur POP)</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Peserta Didik Reguler</h3>
            <div className={styles.dataRow}>
              <span>Jumlah Laki-Laki: {siswaL}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Perempuan: {siswaP}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Total: {totalSiswa}</span>
            </div>
          </div>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Peserta Didik Berkebutuhan Khusus</h3>
            <div className={styles.dataRow}>
              <span>ABK Laki-Laki: {abkL}</span>
            </div>
            <div className={styles.dataRow}>
              <span>ABK Perempuan: {abkP}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== III. KONDISI & INTERVENSI RUANG KELAS ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          III. Kondisi & Intervensi Ruang Kelas (Struktur POP)
        </h2>
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

      {/* ===================== IV. STATUS TANAH, GEDUNG & BANGUNAN ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>IV. Status Tanah, Gedung & Bangunan</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Status Tanah</h3>
            <div className={styles.dataRow}>
              <span>Kepemilikan: {landOwnership}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Lahan Tersedia: {luasLahan} m²</span>
            </div>
          </div>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Status Gedung</h3>
            <div className={styles.dataRow}>
              <span>Kepemilikan: {buildingOwnership}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== V. SARANA PENDUKUNG (RGKS, TOILET, UKS) ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>V. Sarana Pendukung</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>RGKS</h3>
            <div className={styles.dataRow}>
              <span>RGKS: {rgksAvailable}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {rgksGood}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {rgksModerate}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {rgksHeavy}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Toilet</h3>
            <div className={styles.dataRow}>
              <span>Toilet Tersedia: {toiletAvailable}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Toilet Kekurangan: {toiletShortage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Kondisi Toilet Baik: {toiletBaik}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {toiletRusakSedang}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {toiletRusakBerat}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>UKS</h3>
            <div className={styles.dataRow}>
              <span>Fasilitas UKS: {uksAvailable}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== VI. FURNITURE & KOMPUTER ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>VI. Data Furniture dan Komputer</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Jumlah Meja: {meja}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Kursi: {kursi}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kekurangan Meja: {kurangMeja}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kekurangan Kursi: {kurangKursi}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Papan Tulis: {papanTulis}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Komputer: {komputer}</span>
          </div>
        </div>
      </div>

      {/* ===================== VII. DATA GURU ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>VII. Data Guru & Tendik</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Jumlah Guru: {jumlahGuru}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kekurangan Guru: {kekuranganGuru}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Tenaga Kependidikan: {tenagaKependidikan}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolDetailPkbm;
