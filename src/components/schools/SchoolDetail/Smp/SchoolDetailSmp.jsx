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

  const rusakBerat = Number(getData(schoolData, ['class_condition', 'classrooms_heavy_damage'], 0));
  const rusakSedang = Number(getData(schoolData, ['class_condition', 'classrooms_moderate_damage'], 0));
  const kurangRkb = Number(getData(schoolData, ['class_condition', 'lacking_rkb'], 0));
  const rehabKegiatan = Number(getData(schoolData, ['rehabRKB'], 0));
  const pembangunanKegiatan = Number(getData(schoolData, ['pembangunanRKB'], 0));

  const allValues = [rusakBerat, rusakSedang, kurangRkb, rehabKegiatan, pembangunanKegiatan];
  const maxRoomValue = Math.max(...allValues, 1);

  const calculateHeight = (value) => {
    const numValue = Number(value) || 0;
    if (numValue === 0) return 'calc(0% + 20px)';
    return `calc(${(numValue / maxRoomValue) * 100}% + 20px)`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.schoolName}>
          {getData(schoolData, ['name'], 'Nama Sekolah Tidak Tersedia')}
        </h1>
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
            <span className={styles.value}>{schoolData.kecamatan || '-'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Jumlah Siswa</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{getData(schoolData, ['student_count'], '0')}</span>
          </div>
        </div>
        <button onClick={handleLocationClick} className={styles.locationButton}>
          📍 Lihat Lokasi di Google Maps
        </button>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Kondisi & Intervensi Ruang Kelas</h2>
        <div className={styles.card}>
          <div className={styles.chartContainer}>
            <div className={styles.chart}>
              <div className={styles.barContainer}>
                <div className={`${styles.bar} ${styles.barRed}`} style={{ height: calculateHeight(rusakBerat) }}>
                  <span className={styles.barLabel}>{rusakBerat}</span>
                </div>
                <span className={styles.barText}>Rusak Berat</span>
              </div>
              <div className={styles.barContainer}>
                <div className={`${styles.bar} ${styles.barYellow}`} style={{ height: calculateHeight(rusakSedang) }}>
                  <span className={styles.barLabel}>{rusakSedang}</span>
                </div>
                <span className={styles.barText}>Rusak Sedang</span>
              </div>
              <div className={styles.barContainer}>
                <div className={`${styles.bar} ${styles.barBlue}`} style={{ height: calculateHeight(kurangRkb) }}>
                  <span className={styles.barLabel}>{kurangRkb}</span>
                </div>
                <span className={styles.barText}>Kurang RKB</span>
              </div>
              <div className={styles.barContainer}>
                <div className={`${styles.bar} ${styles.barPurple}`} style={{ height: calculateHeight(rehabKegiatan) }}>
                  <span className={styles.barLabel}>{rehabKegiatan}</span>
                </div>
                <span className={styles.barText}>Rehabilitasi</span>
              </div>
              <div className={styles.barContainer}>
                <div className={`${styles.bar} ${styles.barOrange}`} style={{ height: calculateHeight(pembangunanKegiatan) }}>
                  <span className={styles.barLabel}>{pembangunanKegiatan}</span>
                </div>
                <span className={styles.barText}>Pembangunan RKB</span>
              </div>
            </div>
          </div>

          <div className={styles.dataRow}>
            <span>Kondisi Kelas Baik (Total Ruangan Bersih): {getData(schoolData, ['class_condition', 'classrooms_good'], 0)}</span>
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

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Perpustakaan</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Ruang Perpustakaan Kondisi Baik: {getData(schoolData, ['library', 'good'], 0)}</span></div>
          <div className={styles.dataRow}><span>Ruang Perpustakaan Rusak Sedang: {getData(schoolData, ['library', 'moderate_damage'], 0)}</span></div>
          <div className={styles.dataRow}><span>Ruang Perpustakaan Rusak Berat: {getData(schoolData, ['library', 'heavy_damage'], 0)}</span></div>
          <div className={styles.dataRow}><span>Total Ruang Perpustakaan Rusak: {getData(schoolData, ['library', 'total_mh'], 0)}</span></div>
          <div className={styles.dataRow}><span>Jumlah Keseluruhan Ruang Perpustakaan: {getData(schoolData, ['library', 'total_all'], 0)}</span></div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Lab. Komputer</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Ruang Lab. Komputer Kondisi Baik: {getData(schoolData, ['laboratory_comp', 'good'], 0)}</span></div>
          <div className={styles.dataRow}><span>Ruang Lab. Komputer Rusak Sedang: {getData(schoolData, ['laboratory_comp', 'moderate_damage'], 0)}</span></div>
          <div className={styles.dataRow}><span>Ruang Lab. Komputer Rusak Berat: {getData(schoolData, ['laboratory_comp', 'heavy_damage'], 0)}</span></div>
          <div className={styles.dataRow}><span>Total Ruang Lab. Komputer Rusak: {getData(schoolData, ['laboratory_comp', 'total_mh'], 0)}</span></div>
          <div className={styles.dataRow}><span>Jumlah Keseluruhan Ruang Lab. Komputer: {getData(schoolData, ['laboratory_comp', 'total_all'], 0)}</span></div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Lab. Bahasa</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Ruang Lab. Bahasa Kondisi Baik: {getData(schoolData, ['laboratory_langua', 'good'], 0)}</span></div>
          <div className={styles.dataRow}><span>Ruang Lab. Bahasa Rusak Sedang: {getData(schoolData, ['laboratory_langua', 'moderate_damage'], 0)}</span></div>
          <div className={styles.dataRow}><span>Ruang Lab. Bahasa Rusak Berat: {getData(schoolData, ['laboratory_langua', 'heavy_damage'], 0)}</span></div>
          <div className={styles.dataRow}><span>Total Ruang Lab. Bahasa Rusak: {getData(schoolData, ['laboratory_langua', 'total_mh'], 0)}</span></div>
          <div className={styles.dataRow}><span>Jumlah Keseluruhan Ruang Lab. Bahasa: {getData(schoolData, ['laboratory_langua', 'total_all'], 0)}</span></div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Lab. IPA</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Ruang Lab. IPA Kondisi Baik: {getData(schoolData, ['laboratory_ipa', 'good'], 0)}</span></div>
          <div className={styles.dataRow}><span>Ruang Lab. IPA Rusak Sedang: {getData(schoolData, ['laboratory_ipa', 'moderate_damage'], 0)}</span></div>
          <div className={styles.dataRow}><span>Ruang Lab. IPA Rusak Berat: {getData(schoolData, ['laboratory_ipa', 'heavy_damage'], 0)}</span></div>
          <div className={styles.dataRow}><span>Total Ruang Lab. IPA Rusak: {getData(schoolData, ['laboratory_ipa', 'total_mh'], 0)}</span></div>
          <div className={styles.dataRow}><span>Jumlah Keseluruhan Ruang Lab. IPA: {getData(schoolData, ['laboratory_ipa', 'total_all'], 0)}</span></div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Lab. Fisika</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Ruang Lab. Fisika Kondisi Baik: {getData(schoolData, ['laboratory_fisika', 'good'], 0)}</span></div>
          <div className={styles.dataRow}><span>Ruang Lab. Fisika Rusak Sedang: {getData(schoolData, ['laboratory_fisika', 'moderate_damage'], 0)}</span></div>
          <div className={styles.dataRow}><span>Ruang Lab. Fisika Rusak Berat: {getData(schoolData, ['laboratory_fisika', 'heavy_damage'], 0)}</span></div>
          <div className={styles.dataRow}><span>Total Ruang Lab. Fisika Rusak: {getData(schoolData, ['laboratory_fisika', 'total_mh'], 0)}</span></div>
          <div className={styles.dataRow}><span>Jumlah Keseluruhan Ruang Lab. Fisika: {getData(schoolData, ['laboratory_fisika', 'total_all'], 0)}</span></div>
        </div>
      </div>

      <div className={styles.section}><h2 className={styles.sectionTitle}>Lab. Biologi</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Ruang Lab. Biologi Kondisi Baik: {getData(schoolData, ['laboratory_biologi', 'good'], 0)}</span></div>
          <div className={styles.dataRow}><span>Ruang Lab. Biologi Rusak Sedang: {getData(schoolData, ['laboratory_biologi', 'moderate_damage'], 0)}</span></div>
          <div className={styles.dataRow}><span>Ruang Lab. Biologi Rusak Berat: {getData(schoolData, ['laboratory_biologi', 'heavy_damage'], 0)}</span></div>
          <div className={styles.dataRow}><span>Total Ruang Lab. Biologi Rusak: {getData(schoolData, ['laboratory_biologi', 'total_mh'], 0)}</span></div>
          <div className={styles.dataRow}><span>Jumlah Keseluruhan Ruang Lab. Biologi: {getData(schoolData, ['laboratory_biologi', 'total_all'], 0)}</span></div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Ruang Kepala Sekolah</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Ruang Kepala Sekolah Kondisi Baik: {getData(schoolData, ['kepsek_room', 'good'], 0)}</span></div>
          <div className={styles.dataRow}><span>Ruang Kepala Sekolah Rusak Sedang: {getData(schoolData, ['kepsek_room', 'moderate_damage'], 0)}</span></div>
          <div className={styles.dataRow}><span>Ruang Kepala Sekolah Rusak Berat: {getData(schoolData, ['kepsek_room', 'heavy_damage'], 0)}</span></div>
          <div className={styles.dataRow}><span>Total Ruang Kepala Sekolah Rusak: {getData(schoolData, ['kepsek_room', 'total_mh'], 0)}</span></div>
          <div className={styles.dataRow}><span>Jumlah Keseluruhan Ruang Kepala Sekolah: {getData(schoolData, ['kepsek_room', 'total_all'], 0)}</span></div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Ruang Guru</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Ruang Guru Kondisi Baik: {getData(schoolData, ['teacher_room', 'good'], 0)}</span></div>
          <div className={styles.dataRow}><span>Ruang Guru Rusak Sedang: {getData(schoolData, ['teacher_room', 'moderate_damage'], 0)}</span></div>
          <div className={styles.dataRow}><span>Ruang Guru Rusak Berat: {getData(schoolData, ['teacher_room', 'heavy_damage'], 0)}</span></div>
          <div className={styles.dataRow}><span>Total Ruang Guru Rusak: {getData(schoolData, ['teacher_room', 'total_mh'], 0)}</span></div>
          <div className={styles.dataRow}><span>Jumlah Keseluruhan Ruang Guru: {getData(schoolData, ['teacher_room', 'total_all'], 0)}</span></div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Ruang Tata Usaha</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Ruang Tata Usaha Kondisi Baik: {getData(schoolData, ['administration_room', 'good'], 0)}</span></div>
          <div className={styles.dataRow}><span>Ruang Tata Usaha Rusak Sedang: {getData(schoolData, ['administration_room', 'moderate_damage'], 0)}</span></div>
          <div className={styles.dataRow}><span>Ruang Tata Usaha Rusak Berat: {getData(schoolData, ['administration_room', 'heavy_damage'], 0)}</span></div>
          <div className={styles.dataRow}><span>Total Ruang Tata Usaha Rusak: {getData(schoolData, ['administration_room', 'total_mh'], 0)}</span></div>
          <div className={styles.dataRow}><span>Jumlah Keseluruhan Ruang Tata Usaha: {getData(schoolData, ['administration_room', 'total_all'], 0)}</span></div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Toilet Guru</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Laki-laki</h3>
            <div className={styles.dataRow}><span>Kondisi Baik: {getData(schoolData, ['teachers_toilet', 'male', 'good'], 0)}</span></div>
            <div className={styles.dataRow}><span>Rusak Sedang: {getData(schoolData, ['teachers_toilet', 'male', 'moderate_damage'], 0)}</span></div>
            <div className={styles.dataRow}><span>Rusak Berat: {getData(schoolData, ['teachers_toilet', 'male', 'heavy_damage'], 0)}</span></div>
            <div className={styles.dataRow}><span>Total Rusak: {getData(schoolData, ['teachers_toilet', 'male', 'total_mh'], 0)}</span></div>
            <div className={styles.dataRow}><span>Jumlah Total: {getData(schoolData, ['teachers_toilet', 'male', 'total_all'], 0)}</span></div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Perempuan</h3>
            <div className={styles.dataRow}><span>Kondisi Baik: {getData(schoolData, ['teachers_toilet', 'female', 'good'], 0)}</span></div>
            <div className={styles.dataRow}><span>Rusak Sedang: {getData(schoolData, ['teachers_toilet', 'female', 'moderate_damage'], 0)}</span></div>
            <div className={styles.dataRow}><span>Rusak Berat: {getData(schoolData, ['teachers_toilet', 'female', 'heavy_damage'], 0)}</span></div>
            <div className={styles.dataRow}><span>Total Rusak: {getData(schoolData, ['teachers_toilet', 'female', 'total_mh'], 0)}</span></div>
            <div className={styles.dataRow}><span>Jumlah Total: {getData(schoolData, ['teachers_toilet', 'female', 'total_all'], 0)}</span></div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Toilet Siswa</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Laki-laki</h3>
            <div className={styles.dataRow}><span>Kondisi Baik: {getData(schoolData, ['students_toilet', 'male', 'good'], 0)}</span></div>
            <div className={styles.dataRow}><span>Rusak Sedang: {getData(schoolData, ['students_toilet', 'male', 'moderate_damage'], 0)}</span></div>
            <div className={styles.dataRow}><span>Rusak Berat: {getData(schoolData, ['students_toilet', 'male', 'heavy_damage'], 0)}</span></div>
            <div className={styles.dataRow}><span>Total Rusak: {getData(schoolData, ['students_toilet', 'male', 'total_mh'], 0)}</span></div>
            <div className={styles.dataRow}><span>Jumlah Total: {getData(schoolData, ['students_toilet', 'male', 'total_all'], 0)}</span></div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Perempuan</h3>
            <div className={styles.dataRow}><span>Kondisi Baik: {getData(schoolData, ['students_toilet', 'female', 'good'], 0)}</span></div>
            <div className={styles.dataRow}><span>Rusak Sedang: {getData(schoolData, ['students_toilet', 'female', 'moderate_damage'], 0)}</span></div>
            <div className={styles.dataRow}><span>Rusak Berat: {getData(schoolData, ['students_toilet', 'female', 'heavy_damage'], 0)}</span></div>
            <div className={styles.dataRow}><span>Total Rusak: {getData(schoolData, ['students_toilet', 'female', 'total_mh'], 0)}</span></div>
            <div className={styles.dataRow}><span>Jumlah Total: {getData(schoolData, ['students_toilet', 'female', 'total_all'], 0)}</span></div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Furnitur dan Komputer</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Jumlah Meja: {getData(schoolData, ['furniture_computer', 'tables'], 0)}</span></div>
          <div className={styles.dataRow}><span>Jumlah Kursi: {getData(schoolData, ['furniture_computer', 'chairs'], 0)}</span></div>
          <div className={styles.dataRow}><span>Jumlah Papan Tulis: {getData(schoolData, ['furniture_computer', 'boards'], 0)}</span></div>
          <div className={styles.dataRow}><span>Jumlah Komputer: {getData(schoolData, ['furniture_computer', 'computer'], 0)}</span></div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Rumah Dinas</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Jumlah Rumah Dinas: {getData(schoolData, ['official_residences', 'total'], 0)}</span></div>
          <div className={styles.dataRow}><span>Kondisi Baik: {getData(schoolData, ['official_residences', 'good'], 0)}</span></div>
          <div className={styles.dataRow}><span>Rusak Sedang: {getData(schoolData, ['official_residences', 'moderate_damage'], 0)}</span></div>
          <div className={styles.dataRow}><span>Rusak Berat: {getData(schoolData, ['official_residences', 'heavy_damage'], 0)}</span></div>
        </div>
      </div>
    </div>
  );
};

export default SchoolDetailSmp;