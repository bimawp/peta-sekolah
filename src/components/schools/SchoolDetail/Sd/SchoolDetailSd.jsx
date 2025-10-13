// src/components/schools/SchoolDetail/Sd/SchoolDetailSd.jsx
import React from 'react';
import styles from './SchoolDetailSd.module.css';
import Button from '../../../ui/Button/Button';

// getter aman
const getData = (data, path, def = 'N/A') => {
  const v = path.reduce((o, k) => (o && o[k] != null ? o[k] : undefined), data);
  if (v === 0 || v === 0.0) return 0;
  return v !== undefined ? v : def;
};
const num = (v, d = 0) => (v == null || Number.isNaN(Number(v)) ? d : Number(v));

const SchoolDetailSd = ({ schoolData, onBack }) => {
  const handleLocationClick = () => {
    const coords = getData(schoolData, ['coordinates'], null);
    if (Array.isArray(coords) && coords.length === 2) {
      const [lat, lng] = coords;
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank', 'noopener,noreferrer');
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

  // ----- Kondisi kelas -----
  const classCondition = getData(schoolData, ['class_condition'], {}) || {};
  const kelasBaik    = num(classCondition.classrooms_good, 0);
  const rusakSedang  = num(classCondition.classrooms_moderate_damage, 0);
  const rusakBerat   = num(classCondition.classrooms_heavy_damage, 0);
  const kurangRkb    = num(classCondition.lacking_rkb, 0);
  const rehabKegiatan       = num(getData(schoolData, ['rehabRKB'], 0), 0);
  const pembangunanKegiatan = num(getData(schoolData, ['pembangunanRKB'], 0), 0);
  const maxRoomValue = Math.max(kelasBaik, rusakSedang, rusakBerat, kurangRkb, rehabKegiatan, pembangunanKegiatan, 1);
  const h = (val) => (val <= 0 ? '0%' : `${(val / maxRoomValue) * 100}%`);

  // ----- Fasilitas fisik -----
  const facilities = getData(schoolData, ['facilities'], {}) || {};
  const landArea      = getData(facilities, ['land_area'],   'N/A');
  const buildingArea  = getData(facilities, ['building_area'],'N/A');
  const yardArea      = getData(facilities, ['yard_area'],   'N/A');

  // ----- Kelas per grade -----
  const classes = getData(schoolData, ['classes'], {}) || {};
  const g = (k) => num(classes[k], 0);

  // ----- Rombel -----
  const rombel = getData(schoolData, ['rombel'], {}) || {};
  const r = (k) => num(rombel[k], 0);

  // ----- Library -----
  const library = getData(schoolData, ['library'], {}) || {};
  const libTotal = num(library.total_all ?? library.total, (num(library.good,0)+num(library.moderate_damage,0)+num(library.heavy_damage,0)));
  const libGood  = num(library.good, 0);
  const libMod   = num(library.moderate_damage, 0);
  const libHeavy = num(library.heavy_damage, 0);

  // ----- Ruang guru -----
  const teacherRoom = getData(schoolData, ['teacher_room'], {}) || {};
  const trTotal = num(teacherRoom.total_all ?? teacherRoom.total, (num(teacherRoom.good,0)+num(teacherRoom.moderate_damage,0)+num(teacherRoom.heavy_damage,0)));
  const trGood  = num(teacherRoom.good, 0);
  const trMod   = num(teacherRoom.moderate_damage, 0);
  const trHeavy = num(teacherRoom.heavy_damage, 0);

  // ----- UKS -----
  const uks = getData(schoolData, ['uks_room'], {}) || {};
  const uksTotal = num(uks.total_all ?? uks.total, (num(uks.good,0)+num(uks.moderate_damage,0)+num(uks.heavy_damage,0)));
  const uksGood  = num(uks.good, 0);
  const uksMod   = num(uks.moderate_damage, 0);
  const uksHeavy = num(uks.heavy_damage, 0);

  // ----- TOILETS -----
  // 1) pakai agregat overall jika ada
  const tOverall = getData(schoolData, ['toilets_overall'], null);
  let toiletTotal, toiletGood, toiletMod, toiletHeavy;

  if (tOverall && typeof tOverall === 'object') {
    toiletTotal = num(tOverall.total, 0);
    toiletGood  = num(tOverall.good, 0);
    toiletMod   = num(tOverall.moderate_damage, 0);
    toiletHeavy = num(tOverall.heavy_damage, 0);
  } else {
    // 2) fallback: jumlahkan siswa + guru
    const st = getData(schoolData, ['students_toilet','_overall'], {}) || {};
    const tt = getData(schoolData, ['teachers_toilet','_overall'], {}) || {};
    const stT = num(st.total, (num(st.good,0)+num(st.moderate_damage,0)+num(st.heavy_damage,0)));
    const ttT = num(tt.total, (num(tt.good,0)+num(tt.moderate_damage,0)+num(tt.heavy_damage,0)));
    toiletTotal = stT + ttT;
    toiletGood  = num(st.good,0) + num(tt.good,0);
    toiletMod   = num(st.moderate_damage,0) + num(tt.moderate_damage,0);
    toiletHeavy = num(st.heavy_damage,0) + num(tt.heavy_damage,0);
  }

  // ----- Furniture & komputer -----
  const fc = getData(schoolData, ['furniture_computer'], {}) || {};
  const mejaTotal     = num(fc.tables, 0);
  const kursiTotal    = num(fc.chairs, 0);
  const papanTotal    = num(fc.boards, 0);
  const komputerTotal = num(fc.computer, 0);

  // fallback breakdown (kalau DB belum ada kolom spesifik)
  const mejaGood   = num(fc.tables_good ?? fc.good_tables, mejaTotal);
  const mejaMod    = num(fc.tables_moderate ?? fc.moderate_tables, 0);
  const mejaHeavy  = num(fc.tables_heavy ?? fc.heavy_tables, 0);
  const kursiGood  = num(fc.chairs_good ?? fc.good_chairs, kursiTotal);
  const kursiMod   = num(fc.chairs_moderate ?? fc.moderate_chairs, 0);
  const kursiHeavy = num(fc.chairs_heavy ?? fc.heavy_chairs, 0);

  return (
    <div className={styles.container}>
      <div style={{ marginBottom: 20 }}>
        <Button onClick={onBack}>Kembali</Button>
      </div>

      <div className={styles.header}>
        <h1>{getData(schoolData, ['name'])}</h1>
        <div className={styles.basicInfo}>
          <p><strong>NPSN:</strong> {getData(schoolData, ['npsn'])}</p>
          <p><strong>Alamat:</strong> {getData(schoolData, ['address'])}</p>
          <p><strong>Desa:</strong> {getData(schoolData, ['village'])}</p>
          <p><strong>Kecamatan:</strong> {getData(schoolData, ['kecamatan'], '—')}</p>
          <p><strong>Jumlah Siswa:</strong> {getData(schoolData, ['student_count'])}</p>
          <button onClick={handleLocationClick} className={styles.mapButton}>
            Lihat Lokasi {getData(schoolData, ['name'])} di Google Maps ({getData(schoolData, ['kecamatan'], '—')})
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <h2>Kondisi Kelas (Need & Intervensi)</h2>
        <div className={styles.chartContainer}>
          <div className={styles.chart}>
            <div className={styles.chartBar}>
              <div className={styles.bar} style={{ height: h(kelasBaik), backgroundColor: '#10b981' }}>{kelasBaik}</div>
              <span>Baik</span>
            </div>
            <div className={styles.chartBar}>
              <div className={styles.bar} style={{ height: h(rusakSedang), backgroundColor: '#F59E0B' }}>{rusakSedang}</div>
              <span>Rusak Sedang</span>
            </div>
            <div className={styles.chartBar}>
              <div className={styles.bar} style={{ height: h(rusakBerat), backgroundColor: '#EF4444' }}>{rusakBerat}</div>
              <span>Rusak Berat</span>
            </div>
            <div className={styles.chartBar}>
              <div className={styles.bar} style={{ height: h(kurangRkb), backgroundColor: '#3B82F6' }}>{kurangRkb}</div>
              <span>Kurang RKB</span>
            </div>
            <div className={styles.chartBar}>
              <div className={styles.bar} style={{ height: h(rehabKegiatan), backgroundColor: '#06B6D4' }}>{rehabKegiatan}</div>
              <span>Rehabilitasi</span>
            </div>
            <div className={styles.chartBar}>
              <div className={styles.bar} style={{ height: h(pembangunanKegiatan), backgroundColor: '#8B5CF6' }}>{pembangunanKegiatan}</div>
              <span>Pembangunan RKB</span>
            </div>
          </div>
          <p className={styles.chartNote}>* Bar diskalakan terhadap nilai maksimum dari keenam kategori di atas.</p>
        </div>
      </div>

      <div className={styles.section}>
        <h2>Data Fisik Bangunan Sekolah</h2>
        <p><strong>Luas Tanah:</strong> {landArea} m²</p>
        <p><strong>Luas Bangunan:</strong> {buildingArea} m²</p>
        <p><strong>Luas Halaman:</strong> {yardArea} m²</p>
      </div>

      <div className={styles.section}>
        <h2>Data Kelas</h2>
        <div className={styles.gradeGrid}>
          <div className={styles.gradeItem}><p><strong>Kelas 1 Laki-laki:</strong> {g('1_L')}</p><p><strong>Kelas 1 Perempuan:</strong> {g('1_P')}</p></div>
          <div className={styles.gradeItem}><p><strong>Kelas 2 Laki-laki:</strong> {g('2_L')}</p><p><strong>Kelas 2 Perempuan:</strong> {g('2_P')}</p></div>
          <div className={styles.gradeItem}><p><strong>Kelas 3 Laki-laki:</strong> {g('3_L')}</p><p><strong>Kelas 3 Perempuan:</strong> {g('3_P')}</p></div>
          <div className={styles.gradeItem}><p><strong>Kelas 4 Laki-laki:</strong> {g('4_L')}</p><p><strong>Kelas 4 Perempuan:</strong> {g('4_P')}</p></div>
          <div className={styles.gradeItem}><p><strong>Kelas 5 Laki-laki:</strong> {g('5_L')}</p><p><strong>Kelas 5 Perempuan:</strong> {g('5_P')}</p></div>
          <div className={styles.gradeItem}><p><strong>Kelas 6 Laki-laki:</strong> {g('6_L')}</p><p><strong>Kelas 6 Perempuan:</strong> {g('6_P')}</p></div>
        </div>
      </div>

      <div className={styles.section}>
        <h2>Rombel</h2>
        <p><strong>Jumlah Rombel Kelas 1:</strong> {r('1')}</p>
        <p><strong>Jumlah Rombel Kelas 2:</strong> {r('2')}</p>
        <p><strong>Jumlah Rombel Kelas 3:</strong> {r('3')}</p>
        <p><strong>Jumlah Rombel Kelas 4:</strong> {r('4')}</p>
        <p><strong>Jumlah Rombel Kelas 5:</strong> {r('5')}</p>
        <p><strong>Jumlah Rombel Kelas 6:</strong> {r('6')}</p>
        <p><strong>Jumlah Keseluruhan Rombel:</strong> {r('total')}</p>
      </div>

      <div className={styles.section}>
        <h2>Data Perpustakaan</h2>
        <p><strong>Jumlah Ruang Perpustakaan:</strong> {libTotal}</p>
        <p><strong>Kondisi Baik:</strong> {libGood}</p>
        <p><strong>Rusak Sedang:</strong> {libMod}</p>
        <p><strong>Rusak Berat:</strong> {libHeavy}</p>
      </div>

      <div className={styles.section}>
        <h2>Data Ruang Guru</h2>
        <p><strong>Jumlah Ruang Guru:</strong> {trTotal}</p>
        <p><strong>Kondisi Baik:</strong> {trGood}</p>
        <p><strong>Rusak Sedang:</strong> {trMod}</p>
        <p><strong>Rusak Berat:</strong> {trHeavy}</p>
      </div>

      <div className={styles.section}>
        <h2>UKS</h2>
        <p><strong>Jumlah Ruang UKS:</strong> {uksTotal}</p>
        <p><strong>Kondisi Baik:</strong> {uksGood}</p>
        <p><strong>Rusak Sedang:</strong> {uksMod}</p>
        <p><strong>Rusak Berat:</strong> {uksHeavy}</p>
      </div>

      <div className={styles.section}>
        <h2>Toilet</h2>
        <p><strong>Jumlah Toilet (Total):</strong> {toiletTotal}</p>
        <p><strong>Baik:</strong> {toiletGood}</p>
        <p><strong>Rusak Sedang:</strong> {toiletMod}</p>
        <p><strong>Rusak Berat:</strong> {toiletHeavy}</p>
      </div>

      <div className={styles.section}>
        <h2>Data Furniture dan Komputer</h2>
        <div className={styles.subSection}>
          <h3>Meja</h3>
          <p><strong>Jumlah Meja:</strong> {mejaTotal}</p>
          <p><strong>Meja Kondisi Baik:</strong> {mejaGood}</p>
          <p><strong>Meja Rusak Sedang:</strong> {mejaMod}</p>
          <p><strong>Meja Rusak Berat:</strong> {mejaHeavy}</p>
        </div>
        <div className={styles.subSection}>
          <h3>Kursi</h3>
          <p><strong>Jumlah Kursi:</strong> {kursiTotal}</p>
          <p><strong>Kursi Kondisi Baik:</strong> {kursiGood}</p>
          <p><strong>Kursi Rusak Sedang:</strong> {kursiMod}</p>
          <p><strong>Kursi Rusak Berat:</strong> {kursiHeavy}</p>
        </div>
        <p><strong>Jumlah Papan Tulis:</strong> {papanTotal}</p>
        <p><strong>Jumlah Komputer:</strong> {komputerTotal}</p>
      </div>
    </div>
  );
};

export default SchoolDetailSd;
