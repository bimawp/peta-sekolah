// src/components/schools/SchoolDetail/Smp/SchoolDetailSmp.jsx
import React from 'react';
import styles from './SchoolDetailSmp.module.css';

const getData = (data, path, defaultValue = 0) => {
  const value = path.reduce(
    (obj, key) => (obj && obj[key] != null ? obj[key] : undefined),
    data
  );
  if (value === 0 || value === 0.0) return 0;
  return value ?? defaultValue;
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

const SchoolDetailSmp = ({ schoolData }) => {
  const handleLocationClick = () => {
    const coords = schoolData?.coordinates;
    const validPair =
      Array.isArray(coords) &&
      coords.length === 2 &&
      coords.every((n) => Number.isFinite(Number(n)));

    if (validPair) {
      let lng = Number(coords[0]);
      let lat = Number(coords[1]);

      // swap kalau kebalik
      if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
        [lat, lng] = [lng, lat];
      }

      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }
    }
    alert('Koordinat lokasi untuk sekolah ini tidak tersedia atau tidak valid.');
  };

  if (!schoolData) {
    return (
      <div className={styles.container}>
        <p>Data sekolah tidak ditemukan.</p>
      </div>
    );
  }

  /* ===================== I. IDENTITAS (POP: IDENTITAS) ===================== */
  const jenjang =
    schoolData.jenjang ||
    schoolData.level ||
    'SMP';

  const statusSekolah =
    schoolData.status ||
    schoolData.status_sekolah ||
    '-';

  /* ===================== II. DATA SISWA (POP: SISWA) ===================== */
  const siswaL = Number(getData(schoolData, ['students_male'], 0));
  const siswaP = Number(getData(schoolData, ['students_female'], 0));
  const totalFromLP = siswaL + siswaP;
  const totalSiswa = totalFromLP > 0
    ? totalFromLP
    : Number(getData(schoolData, ['student_count'], 0));

  // Placeholder ABK (kalau nanti ada di input POP SMP)
  const abkL = Number(getData(schoolData, ['students_special_male'], 0));
  const abkP = Number(getData(schoolData, ['students_special_female'], 0));

  /* ===================== III. RUANG KELAS & RKB (POP: KONDISI PRASARANA) ===================== */
  const rusakBerat = Number(
    getData(schoolData, ['class_condition', 'classrooms_heavy_damage'], 0)
  );
  const rusakSedang = Number(
    getData(schoolData, ['class_condition', 'classrooms_moderate_damage'], 0)
  );
  const kelasBaik = Number(
    getData(schoolData, ['class_condition', 'classrooms_good'], 0)
  );
  const kurangRkb = Number(
    getData(schoolData, ['class_condition', 'lacking_rkb'], 0)
  );
  const rehabKegiatan = Number(getData(schoolData, ['rehabRKB'], 0));
  const pembangunanKegiatan = Number(getData(schoolData, ['pembangunanRKB'], 0));

  const allValues = [rusakBerat, rusakSedang, kurangRkb, rehabKegiatan, pembangunanKegiatan];
  const maxRoomValue = Math.max(...allValues, 1);

  const calculateHeight = (value) => {
    const numValue = Number(value) || 0;
    if (numValue === 0) return 'calc(0% + 20px)';
    return `calc(${(numValue / maxRoomValue) * 100}% + 20px)`;
  };

  /* ===================== IV. STATUS TANAH & GEDUNG (POP: KONDISI PRASARANA) ===================== */
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

  /* ===================== V. LABORATORIUM & PERPUSTAKAAN (POP: KONDISI PRASARANA) ===================== */
  const perpustakaan = {
    baik: getData(schoolData, ['library', 'good'], 0),
    sedang: getData(schoolData, ['library', 'moderate_damage'], 0),
    berat: getData(schoolData, ['library', 'heavy_damage'], 0),
    totalRusak: getData(schoolData, ['library', 'total_mh'], 0),
    totalSemua: getData(schoolData, ['library', 'total_all'], 0),
  };

  const labKomputer = {
    baik: getData(schoolData, ['laboratory_comp', 'good'], 0),
    sedang: getData(schoolData, ['laboratory_comp', 'moderate_damage'], 0),
    berat: getData(schoolData, ['laboratory_comp', 'heavy_damage'], 0),
    totalRusak: getData(schoolData, ['laboratory_comp', 'total_mh'], 0),
    totalSemua: getData(schoolData, ['laboratory_comp', 'total_all'], 0),
  };

  const labBahasa = {
    baik: getData(schoolData, ['laboratory_langua', 'good'], 0),
    sedang: getData(schoolData, ['laboratory_langua', 'moderate_damage'], 0),
    berat: getData(schoolData, ['laboratory_langua', 'heavy_damage'], 0),
    totalRusak: getData(schoolData, ['laboratory_langua', 'total_mh'], 0),
    totalSemua: getData(schoolData, ['laboratory_langua', 'total_all'], 0),
  };

  const labIpa = {
    baik: getData(schoolData, ['laboratory_ipa', 'good'], 0),
    sedang: getData(schoolData, ['laboratory_ipa', 'moderate_damage'], 0),
    berat: getData(schoolData, ['laboratory_ipa', 'heavy_damage'], 0),
    totalRusak: getData(schoolData, ['laboratory_ipa', 'total_mh'], 0),
    totalSemua: getData(schoolData, ['laboratory_ipa', 'total_all'], 0),
  };

  const labFisika = {
    baik: getData(schoolData, ['laboratory_fisika', 'good'], 0),
    sedang: getData(schoolData, ['laboratory_fisika', 'moderate_damage'], 0),
    berat: getData(schoolData, ['laboratory_fisika', 'heavy_damage'], 0),
    totalRusak: getData(schoolData, ['laboratory_fisika', 'total_mh'], 0),
    totalSemua: getData(schoolData, ['laboratory_fisika', 'total_all'], 0),
  };

  const labBiologi = {
    baik: getData(schoolData, ['laboratory_biologi', 'good'], 0),
    sedang: getData(schoolData, ['laboratory_biologi', 'moderate_damage'], 0),
    berat: getData(schoolData, ['laboratory_biologi', 'heavy_damage'], 0),
    totalRusak: getData(schoolData, ['laboratory_biologi', 'total_mh'], 0),
    totalSemua: getData(schoolData, ['laboratory_biologi', 'total_all'], 0),
  };

  /* ===================== VI. RUANG PIMPINAN & TENDIK ===================== */
  const ruangKepsek = {
    baik: getData(schoolData, ['kepsek_room', 'good'], 0),
    sedang: getData(schoolData, ['kepsek_room', 'moderate_damage'], 0),
    berat: getData(schoolData, ['kepsek_room', 'heavy_damage'], 0),
    totalRusak: getData(schoolData, ['kepsek_room', 'total_mh'], 0),
    totalSemua: getData(schoolData, ['kepsek_room', 'total_all'], 0),
  };

  const ruangGuru = {
    baik: getData(schoolData, ['teacher_room', 'good'], 0),
    sedang: getData(schoolData, ['teacher_room', 'moderate_damage'], 0),
    berat: getData(schoolData, ['teacher_room', 'heavy_damage'], 0),
    totalRusak: getData(schoolData, ['teacher_room', 'total_mh'], 0),
    totalSemua: getData(schoolData, ['teacher_room', 'total_all'], 0),
  };

  const ruangTU = {
    baik: getData(schoolData, ['administration_room', 'good'], 0),
    sedang: getData(schoolData, ['administration_room', 'moderate_damage'], 0),
    berat: getData(schoolData, ['administration_room', 'heavy_damage'], 0),
    totalRusak: getData(schoolData, ['administration_room', 'total_mh'], 0),
    totalSemua: getData(schoolData, ['administration_room', 'total_all'], 0),
  };

  /* ===================== VII. TOILET GURU & SISWA (POP: KONDISI PRASARANA) ===================== */
  const toiletGuruMale = {
    baik: getData(schoolData, ['teachers_toilet', 'male', 'good'], 0),
    sedang: getData(schoolData, ['teachers_toilet', 'male', 'moderate_damage'], 0),
    berat: getData(schoolData, ['teachers_toilet', 'male', 'heavy_damage'], 0),
    totalRusak: getData(schoolData, ['teachers_toilet', 'male', 'total_mh'], 0),
    totalSemua: getData(schoolData, ['teachers_toilet', 'male', 'total_all'], 0),
  };

  const toiletGuruFemale = {
    baik: getData(schoolData, ['teachers_toilet', 'female', 'good'], 0),
    sedang: getData(schoolData, ['teachers_toilet', 'female', 'moderate_damage'], 0),
    berat: getData(schoolData, ['teachers_toilet', 'female', 'heavy_damage'], 0),
    totalRusak: getData(schoolData, ['teachers_toilet', 'female', 'total_mh'], 0),
    totalSemua: getData(schoolData, ['teachers_toilet', 'female', 'total_all'], 0),
  };

  const toiletSiswaMale = {
    baik: getData(schoolData, ['students_toilet', 'male', 'good'], 0),
    sedang: getData(schoolData, ['students_toilet', 'male', 'moderate_damage'], 0),
    berat: getData(schoolData, ['students_toilet', 'male', 'heavy_damage'], 0),
    totalRusak: getData(schoolData, ['students_toilet', 'male', 'total_mh'], 0),
    totalSemua: getData(schoolData, ['students_toilet', 'male', 'total_all'], 0),
  };

  const toiletSiswaFemale = {
    baik: getData(schoolData, ['students_toilet', 'female', 'good'], 0),
    sedang: getData(schoolData, ['students_toilet', 'female', 'moderate_damage'], 0),
    berat: getData(schoolData, ['students_toilet', 'female', 'heavy_damage'], 0),
    totalRusak: getData(schoolData, ['students_toilet', 'female', 'total_mh'], 0),
    totalSemua: getData(schoolData, ['students_toilet', 'female', 'total_all'], 0),
  };

  /* ===================== VIII. FURNITUR & KOMPUTER (MEBELAIR) ===================== */
  const meja = getData(schoolData, ['furniture_computer', 'tables'], 0);
  const kursi = getData(schoolData, ['furniture_computer', 'chairs'], 0);
  const papanTulis = getData(schoolData, ['furniture_computer', 'boards'], 0);
  const komputer = getData(schoolData, ['furniture_computer', 'computer'], 0);

  /* ===================== IX. RUMAH DINAS & GURU (POP: RUMAH DINAS & GURU) ===================== */
  const rumahDinas = {
    total: getData(schoolData, ['official_residences', 'total'], 0),
    baik: getData(schoolData, ['official_residences', 'good'], 0),
    sedang: getData(schoolData, ['official_residences', 'moderate_damage'], 0),
    berat: getData(schoolData, ['official_residences', 'heavy_damage'], 0),
  };

  const jumlahGuru = Number(getData(schoolData, ['teacher', 'teachers'], 0));
  const kekuranganGuru = Number(getData(schoolData, ['teacher', 'n_teachers'], 0));
  const tendik = Number(getData(schoolData, ['teacher', 'tendik'], 0));

  return (
    <div className={styles.container}>
      {/* ===================== I. IDENTITAS SEKOLAH ===================== */}
      <div className={styles.header}>
        <h1 className={styles.schoolName}>
          {getData(schoolData, ['name'], 'Nama Sekolah Tidak Tersedia')}
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

      {/* ===================== II. DATA SISWA ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>II. Data Siswa</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Jumlah Siswa Laki-Laki: {siswaL}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Siswa Perempuan: {siswaP}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Siswa (Total): {totalSiswa}</span>
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

      {/* ===================== III. KONDISI & INTERVENSI RUANG KELAS ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          III. Kondisi & Intervensi Ruang Kelas
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

          <div className={styles.dataRow}>
            <span>Kondisi Kelas Baik (Total Ruangan Bersih): {kelasBaik}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kondisi Kelas Rusak Sedang: {rusakSedang}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kondisi Kelas Rusak Berat: {rusakBerat}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kekurangan RKB: {kurangRkb}</span>
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

      {/* ===================== V. PERPUSTAKAAN & LABORATORIUM ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          V. Perpustakaan & Laboratorium
        </h2>
        <div className={styles.card}>
          {/* Perpustakaan */}
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Ruang Perpustakaan</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {perpustakaan.baik}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {perpustakaan.sedang}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {perpustakaan.berat}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Ruang Rusak: {perpustakaan.totalRusak}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Ruang (Total): {perpustakaan.totalSemua}</span>
            </div>
          </div>

          {/* Lab Komputer */}
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Lab. Komputer</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {labKomputer.baik}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {labKomputer.sedang}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {labKomputer.berat}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Ruang Rusak: {labKomputer.totalRusak}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Ruang (Total): {labKomputer.totalSemua}</span>
            </div>
          </div>

          {/* Lab Bahasa */}
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Lab. Bahasa</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {labBahasa.baik}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {labBahasa.sedang}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {labBahasa.berat}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Ruang Rusak: {labBahasa.totalRusak}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Ruang (Total): {labBahasa.totalSemua}</span>
            </div>
          </div>

          {/* Lab IPA */}
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Lab. IPA</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {labIpa.baik}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {labIpa.sedang}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {labIpa.berat}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Ruang Rusak: {labIpa.totalRusak}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Ruang (Total): {labIpa.totalSemua}</span>
            </div>
          </div>

          {/* Lab Fisika */}
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Lab. Fisika</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {labFisika.baik}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {labFisika.sedang}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {labFisika.berat}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Ruang Rusak: {labFisika.totalRusak}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Ruang (Total): {labFisika.totalSemua}</span>
            </div>
          </div>

          {/* Lab Biologi */}
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Lab. Biologi</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {labBiologi.baik}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {labBiologi.sedang}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {labBiologi.berat}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Ruang Rusak: {labBiologi.totalRusak}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Ruang (Total): {labBiologi.totalSemua}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== VI. RUANG PIMPINAN & TENDIK ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>VI. Ruang Pimpinan & Tenaga Kependidikan</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Ruang Kepala Sekolah</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {ruangKepsek.baik}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {ruangKepsek.sedang}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {ruangKepsek.berat}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Ruang Rusak: {ruangKepsek.totalRusak}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Ruang (Total): {ruangKepsek.totalSemua}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Ruang Guru</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {ruangGuru.baik}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {ruangGuru.sedang}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {ruangGuru.berat}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Ruang Rusak: {ruangGuru.totalRusak}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Ruang (Total): {ruangGuru.totalSemua}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Ruang Tata Usaha</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {ruangTU.baik}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {ruangTU.sedang}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {ruangTU.berat}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Ruang Rusak: {ruangTU.totalRusak}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Ruang (Total): {ruangTU.totalSemua}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== VII. TOILET GURU & SISWA ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>VII. Toilet Guru</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Laki-laki</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {toiletGuruMale.baik}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {toiletGuruMale.sedang}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {toiletGuruMale.berat}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Rusak: {toiletGuruMale.totalRusak}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Total: {toiletGuruMale.totalSemua}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Perempuan</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {toiletGuruFemale.baik}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {toiletGuruFemale.sedang}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {toiletGuruFemale.berat}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Rusak: {toiletGuruFemale.totalRusak}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Total: {toiletGuruFemale.totalSemua}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>VIII. Toilet Siswa</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Laki-laki</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {toiletSiswaMale.baik}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {toiletSiswaMale.sedang}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {toiletSiswaMale.berat}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Rusak: {toiletSiswaMale.totalRusak}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Total: {toiletSiswaMale.totalSemua}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Perempuan</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {toiletSiswaFemale.baik}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {toiletSiswaFemale.sedang}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {toiletSiswaFemale.berat}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Rusak: {toiletSiswaFemale.totalRusak}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Total: {toiletSiswaFemale.totalSemua}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== IX. FURNITUR & KOMPUTER ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>IX. Furnitur & Komputer</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Jumlah Meja: {meja}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Kursi: {kursi}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Papan Tulis: {papanTulis}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Komputer: {komputer}</span>
          </div>
        </div>
      </div>

      {/* ===================== X. RUMAH DINAS & DATA GURU ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>X. Rumah Dinas</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Jumlah Rumah Dinas: {rumahDinas.total}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kondisi Baik: {rumahDinas.baik}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Rusak Sedang: {rumahDinas.sedang}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Rusak Berat: {rumahDinas.berat}</span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>XI. Data Guru & Tendik</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Jumlah Guru: {jumlahGuru}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kekurangan Guru: {kekuranganGuru}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Tenaga Kependidikan (Tendik): {tendik}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolDetailSmp;
