// src/components/schools/SchoolDetail/Paud/SchoolDetailPaud.jsx
import React from 'react';
import styles from './SchoolDetailPaud.module.css';

const getData = (data, path, defaultValue = 0) => {
  const value = path.reduce(
    (obj, key) => (obj && obj[key] != null ? obj[key] : undefined),
    data
  );
  if (value === 0.0) return 0;
  return value !== null && value !== undefined && value !== '' ? value : defaultValue;
};

const findOwner = (obj, defaultValue = '-') => {
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

const SchoolDetailPaud = ({ schoolData }) => {
  const handleLocationClick = () => {
    if (Array.isArray(schoolData?.coordinates) && schoolData.coordinates.length === 2) {
      const lng = Number(schoolData.coordinates[0]);
      const lat = Number(schoolData.coordinates[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }
    }
    alert('Koordinat lokasi untuk sekolah ini tidak tersedia.');
  };

  if (!schoolData) {
    return (
      <div className={styles.container}>
        <p>Data sekolah tidak ditemukan.</p>
      </div>
    );
  }

  /* ===================== IDENTITAS / JENJANG (POP: IDENTITAS) ===================== */
  const jenjang =
    schoolData.jenjang ||
    schoolData.level ||
    'PAUD';

  const statusSekolah =
    schoolData.status ||
    schoolData.status_sekolah ||
    '-';

  /* ===================== SISWA (POP: SISWA & SISWA BERKEBUTUHAN KHUSUS) ===================== */
  const siswaL = Number(getData(schoolData, ['student_data', 'male_students'], 0));
  const siswaP = Number(getData(schoolData, ['student_data', 'female_students'], 0));
  const totalSiswa = siswaL + siswaP;

  // Placeholder ABK (bisa diisi dari Supabase/POP nanti)
  const abkL = Number(getData(schoolData, ['student_data', 'special_need_male'], 0));
  const abkP = Number(getData(schoolData, ['student_data', 'special_need_female'], 0));

  /* ===================== ROMBEL (POP: ROMBEL) ===================== */
  // Untuk PAUD saat ini hanya ada rombel KB, disamakan ke struktur POP ROMBEL.JUMLAH
  const rombelKb = Number(getData(schoolData, ['rombel', 'kb'], 0));
  const totalRombel = rombelKb; // nanti bisa diperluas kalau ada rombel lain

  /* ===================== KONDISI PRASARANA (POP: KONDISI PRASARANA) ===================== */

  // Ruang kelas - mapping ke POP: RUSAK BERAT, RUSAK SEDANG, KURANG RKB, REHABILITASI, RKB TAMBAHAN
  const rusakBerat = Number(getData(schoolData, ['class_condition', 'heavy_damage'], 0));      // RUSAK BERAT
  const rusakSedang = Number(getData(schoolData, ['class_condition', 'moderate_damage'], 0));   // RUSAK SEDANG
  const kurangRkb = Number(getData(schoolData, ['class_condition', 'lacking_rkb'], 0));         // KURANG RKB
  const rehabKegiatan = Number(getData(schoolData, ['rehabRuangKelas'], 0));                    // Rehabilitasi (kegiatan)
  const pembangunanKegiatan = Number(getData(schoolData, ['pembangunanRKB'], 0));               // Pembangunan RKB (tambahan)

  const allValues = [rusakBerat, rusakSedang, kurangRkb, rehabKegiatan, pembangunanKegiatan];
  const maxRoomValue = Math.max(...allValues, 1);

  const calculateHeight = (value) => {
    const numValue = Number(value) || 0;
    if (numValue === 0) return 'calc(0% + 20px)';
    return `calc(${(numValue / maxRoomValue) * 100}% + 20px)`;
  };

  // Status tanah & gedung → bagian dari KONDISI PRASARANA (UKURAN / STATUS TANAH & GEDUNG)
  const landOwnership = findOwner(
    getData(schoolData, ['building_status', 'tanah'], null),
    'Tidak Ada'
  );
  const buildingOwnership = findOwner(
    getData(schoolData, ['building_status', 'gedung'], null),
    'Tidak Diketahui'
  );

  const luasTanah = getData(schoolData, ['building_status', 'tanah', 'land_available'], '-');
  // Kalau nanti mau mengikuti POP TANAH/BANGUNAN/HALAMAN (M2),
  // bisa tambahkan mapping lain di sini.

  // Toilet → bagian dari KONDISI PRASARANA (TOILET GURU DAN SISWA)
  const toiletAvailable = Number(getData(schoolData, ['toilets', 'available'], 0));
  const toiletShortage = Number(getData(schoolData, ['toilets', 'n_available'], 0));
  const toiletBaik = Number(getData(schoolData, ['toilets', 'good'], 0));
  const toiletRusakSedang = Number(getData(schoolData, ['toilets', 'moderate_damage'], 0));
  const toiletRusakBerat = Number(getData(schoolData, ['toilets', 'heavy_damage'], 0));

  // RGKS / UKS / Playground / APE → juga dimasukkan ke KONDISI PRASARANA
  const rgksAvailable = getData(schoolData, ['rgks', 'n_available'], 'Tidak Ada');
  const rgksGood = getData(schoolData, ['rgks', 'good'], '-');
  const rgksModerate = getData(schoolData, ['rgks', 'moderate_damage'], '-');
  const rgksHeavy = getData(schoolData, ['rgks', 'heavy_damage'], '-');

  const uksAvailable = getData(schoolData, ['uks', 'n_available'], 'Tidak Ada');
  const playgroundArea = getData(schoolData, ['playground_area', 'n_available'], '-');

  const apeLuarAvailable = getData(schoolData, ['ape', 'luar', 'available'], '-');
  const apeLuarCondition = getData(schoolData, ['ape', 'luar', 'condition'], '-');
  const apeDalamAvailable = getData(schoolData, ['ape', 'dalam', 'available'], '-');
  const apeDalamCondition = getData(schoolData, ['ape', 'dalam', 'condition'], '-');

  // Furniture & komputer → Mebeulair / Peralatan
  const meja = Number(getData(schoolData, ['furniture_computer', 'tables'], 0));
  const kursi = Number(getData(schoolData, ['furniture_computer', 'chairs'], 0));
  const kurangMeja = Number(getData(schoolData, ['furniture_computer', 'n_tables'], 0));
  const kurangKursi = Number(getData(schoolData, ['furniture_computer', 'n_chairs'], 0));
  const papanTulis = Number(getData(schoolData, ['furniture_computer', 'boards'], 0));
  const komputer = Number(getData(schoolData, ['furniture_computer', 'computer'], 0));

  /* ===================== GURU (POP: GURU) ===================== */
  const jumlahGuru = Number(getData(schoolData, ['teacher', 'teachers'], 0));
  const kekuranganGuru = Number(getData(schoolData, ['teacher', 'n_teachers'], 0));
  const tenagaKependidikan = Number(getData(schoolData, ['teacher', 'tendik'], 0));

  return (
    <div className={styles.container}>
      {/* ===================== I. IDENTITAS SEKOLAH (POP: IDENTITAS) ===================== */}
      <div className={styles.header}>
        <h1 className={styles.schoolName}>
          {schoolData.name || 'Nama Sekolah Tidak Tersedia'}
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
            <span className={styles.value}>{schoolData.npsn || '-'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Alamat</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{schoolData.address || '-'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Desa</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{schoolData.village || '-'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Kecamatan</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{schoolData.kecamatan || '-'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Jumlah Siswa (Total)</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{totalSiswa}</span>
          </div>
        </div>
        <button onClick={handleLocationClick} className={styles.locationButton}>
          📍 Lihat Lokasi di Google Maps
        </button>
      </div>

      {/* ===================== II. DATA SISWA (POP: SISWA & SISWA BERKEBUTUHAN KHUSUS) ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>II. Data Siswa</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Siswa Reguler</h3>
            <div className={styles.dataRow}>
              <span>Jumlah Siswa Laki-Laki: {siswaL}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Siswa Perempuan: {siswaP}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Siswa (Total): {totalSiswa}</span>
            </div>
          </div>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Siswa Berkebutuhan Khusus</h3>
            <div className={styles.dataRow}>
              <span>ABK Laki-Laki: {abkL}</span>
            </div>
            <div className={styles.dataRow}>
              <span>ABK Perempuan: {abkP}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== III. ROMBEL (POP: ROMBEL) ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>III. Rombongan Belajar (Rombel)</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Jumlah Rombel (KB): {rombelKb}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Rombel (Total POP): {totalRombel}</span>
          </div>
        </div>
      </div>

      {/* ===================== IV. KONDISI PRASARANA (POP: KONDISI PRASARANA) ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>IV. Kondisi Prasarana </h2>

        {/* 1) Ruang Kelas - RKB / Kerusakan */}
        <div className={styles.card}>
          <h3 className={styles.subsectionTitle}>Ruang Kelas & Intervensi (RKB)</h3>
          <div className={styles.chartContainer}>
            <div className={styles.chart}>
              <div className={styles.barContainer}>
                <div
                  className={`${styles.bar} ${styles.barRed}`}
                  style={{ height: calculateHeight(rusakBerat) }}
                >
                  <span className={styles.barLabel}>{rusakBerat}</span>
                </div>
                <span className={styles.barText}>Ruang Kelas Rusak Berat</span>
              </div>
              <div className={styles.barContainer}>
                <div
                  className={`${styles.bar} ${styles.barYellow}`}
                  style={{ height: calculateHeight(rusakSedang) }}
                >
                  <span className={styles.barLabel}>{rusakSedang}</span>
                </div>
                <span className={styles.barText}>Ruang Kelas Rusak Sedang</span>
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
                <span className={styles.barText}>Rehabilitasi (Kegiatan)</span>
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

        {/* 2) Status Tanah & Gedung */}
        <div className={styles.card}>
          <h3 className={styles.subsectionTitle}>Status Tanah, Gedung & Bangunan</h3>
          <div className={styles.subsection}>
            <h4 className={styles.subsectionTitle}>Status Tanah</h4>
            <div className={styles.dataRow}>
              <span>Kepemilikan Tanah: {landOwnership}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Luas Lahan (m²): {luasTanah}</span>
            </div>
          </div>
          <div className={styles.subsection}>
            <h4 className={styles.subsectionTitle}>Status Gedung</h4>
            <div className={styles.dataRow}>
              <span>Kepemilikan Gedung: {buildingOwnership}</span>
            </div>
          </div>
        </div>

        {/* 3) Toilet */}
        <div className={styles.card}>
          <h3 className={styles.subsectionTitle}>Toilet Guru & Siswa</h3>
          <div className={styles.dataRow}>
            <span>Jumlah Toilet Tersedia: {toiletAvailable}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kekurangan Toilet: {toiletShortage}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kondisi Baik: {toiletBaik}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Rusak Sedang: {toiletRusakSedang}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Rusak Berat: {toiletRusakBerat}</span>
          </div>
        </div>

        {/* 4) RGKS / UKS / Area Bermain */}
        <div className={styles.card}>
          <h3 className={styles.subsectionTitle}>Ruang Penunjang & Area Bermain</h3>
          <div className={styles.subsection}>
            <h4 className={styles.subsectionTitle}>RGKS</h4>
            <div className={styles.dataRow}>
              <span>RGKS Tersedia: {rgksAvailable}</span>
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
            <h4 className={styles.subsectionTitle}>UKS</h4>
            <div className={styles.dataRow}>
              <span>Fasilitas UKS: {uksAvailable}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h4 className={styles.subsectionTitle}>Area Bermain</h4>
            <div className={styles.dataRow}>
              <span>Lahan Bermain: {playgroundArea}</span>
            </div>
          </div>
        </div>

        {/* 5) APE (Alat Permainan Edukatif) */}
        <div className={styles.card}>
          <h3 className={styles.subsectionTitle}>Alat Permainan Edukatif (APE)</h3>
          <div className={styles.subsection}>
            <h4 className={styles.subsectionTitle}>APE Luar</h4>
            <div className={styles.dataRow}>
              <span>APE Luar: {apeLuarAvailable}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Kondisi APE Luar: {apeLuarCondition}</span>
            </div>
          </div>
          <div className={styles.subsection}>
            <h4 className={styles.subsectionTitle}>APE Dalam</h4>
            <div className={styles.dataRow}>
              <span>APE Dalam: {apeDalamAvailable}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Kondisi APE Dalam: {apeDalamCondition}</span>
            </div>
          </div>
        </div>

        {/* 6) Mebeulair & Komputer */}
        <div className={styles.card}>
          <h3 className={styles.subsectionTitle}>Mebeulair & Peralatan Teknologi</h3>
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
            <span>Jumlah Komputer/Laptop: {komputer}</span>
          </div>
        </div>
      </div>

      {/* ===================== V. DATA GURU (POP: GURU) ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>V. Data Guru</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Jumlah Guru: {jumlahGuru}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kekurangan Guru: {kekuranganGuru}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Tenaga Kependidikan (Tendik): {tenagaKependidikan}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolDetailPaud;