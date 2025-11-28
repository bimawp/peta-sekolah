import React from 'react';
import styles from './SchoolDetailSd.module.css';

const getData = (data, path, def = 'N/A') => {
  const v = path.reduce((o, k) => (o && o[k] != null ? o[k] : undefined), data);
  if (v === 0 || v === 0.0) return 0;
  return v !== undefined ? v : def;
};

const num = (v, d = 0) => (v == null || Number.isNaN(Number(v)) ? d : Number(v));

const SchoolDetailSd = ({ schoolData }) => {
  const handleLocationClick = () => {
    const coords = getData(schoolData, ['coordinates'], null);
    if (Array.isArray(coords) && coords.length === 2) {
      let lng = Number(coords[0]);
      let lat = Number(coords[1]);

      if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
        [lat, lng] = [lng, lat];
      }

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank', 'noopener,noreferrer');
        return;
      }
    }
    alert('Data koordinat lokasi untuk sekolah ini tidak tersedia.');
  };

  if (!schoolData) {
    return (
      <div className={styles.container}>
        <p>Memuat data sekolah...</p>
      </div>
    );
  }

  // --- Ambil semua data dari schoolData ---
  
  // Kondisi Kelas
  const classCondition = getData(schoolData, ['class_condition'], {}) || {};
  const kelasBaik = num(classCondition.classrooms_good, 0);
  const rusakSedang = num(classCondition.classrooms_moderate_damage, 0);
  const rusakBerat = num(classCondition.classrooms_heavy_damage, 0);
  const kurangRkb = num(classCondition.lacking_rkb, 0);
  const rehabKegiatan = num(getData(schoolData, ['rehabRKB'], getData(schoolData, ['rehabRuangKelas'], 0)), 0);
  const pembangunanKegiatan = num(getData(schoolData, ['pembangunanRKB'], 0), 0);
  const maxRoomValue = Math.max(kelasBaik, rusakSedang, rusakBerat, kurangRkb, rehabKegiatan, pembangunanKegiatan, 1);
  const h = (val) => {
    if (val <= 0) return 'calc(0% + 20px)';
    return `calc(${(val / maxRoomValue) * 100}% + 20px)`;
  };

  // Fasilitas Fisik
  const facilities = getData(schoolData, ['facilities'], {}) || {};
  const landArea = getData(facilities, ['land_area'], 'N/A');
  const buildingArea = getData(facilities, ['building_area'], 'N/A');
  const yardArea = getData(facilities, ['yard_area'], 'N/A');

  // Data Kelas
  const classes = getData(schoolData, ['classes'], {}) || {};
  const g = (k) => num(classes[k], 0);

  // Rombel
  const rombel = getData(schoolData, ['rombel'], {}) || {};
  const r = (k) => num(rombel[k], 0);

  // Library
  const library = getData(schoolData, ['library'], {}) || {};
  const libTotal = num(library.total_all ?? library.total, (num(library.good, 0) + num(library.moderate_damage, 0) + num(library.heavy_damage, 0)));
  const libGood = num(library.good, 0);
  const libMod = num(library.moderate_damage, 0);
  const libHeavy = num(library.heavy_damage, 0);

  // Ruang Guru
  const teacherRoom = getData(schoolData, ['teacher_room'], {}) || {};
  const trTotal = num(teacherRoom.total_all ?? teacherRoom.total, (num(teacherRoom.good, 0) + num(teacherRoom.moderate_damage, 0) + num(teacherRoom.heavy_damage, 0)));
  const trGood = num(teacherRoom.good, 0);
  const trMod = num(teacherRoom.moderate_damage, 0);
  const trHeavy = num(teacherRoom.heavy_damage, 0);

  // UKS
  const uks = getData(schoolData, ['uks_room'], {}) || {};
  const uksTotal = num(uks.total_all ?? uks.total, (num(uks.good, 0) + num(uks.moderate_damage, 0) + num(uks.heavy_damage, 0)));
  const uksGood = num(uks.good, 0);
  const uksMod = num(uks.moderate_damage, 0);
  const uksHeavy = num(uks.heavy_damage, 0);

  // Toilet
  const tOverall = getData(schoolData, ['toilets_overall'], null);
  let toiletTotal, toiletGood, toiletMod, toiletHeavy;

  if (tOverall && typeof tOverall === 'object') {
    toiletTotal = num(tOverall.total, 0);
    toiletGood = num(tOverall.good, 0);
    toiletMod = num(tOverall.moderate_damage, 0);
    toiletHeavy = num(tOverall.heavy_damage, 0);
  } else {
    const st = getData(schoolData, ['students_toilet', '_overall'], {}) || {};
    const tt = getData(schoolData, ['teachers_toilet', '_overall'], {}) || {};
    const stT = num(st.total, (num(st.good, 0) + num(st.moderate_damage, 0) + num(st.heavy_damage, 0)));
    const ttT = num(tt.total, (num(tt.good, 0) + num(tt.moderate_damage, 0) + num(tt.heavy_damage, 0)));
    toiletTotal = stT + ttT;
    toiletGood = num(st.good, 0) + num(tt.good, 0);
    toiletMod = num(st.moderate_damage, 0) + num(tt.moderate_damage, 0);
    toiletHeavy = num(st.heavy_damage, 0) + num(tt.heavy_damage, 0);
  }

  // Furniture
  const fc = getData(schoolData, ['furniture_computer'], {}) || {};
  const mejaTotal = num(fc.tables, 0);
  const kursiTotal = num(fc.chairs, 0);
  const papanTotal = num(fc.boards, 0);
  const komputerTotal = num(fc.computer, 0);
  const mejaGood = num(fc.tables_good ?? fc.good_tables, mejaTotal);
  const mejaMod = num(fc.tables_moderate ?? fc.moderate_tables, 0);
  const mejaHeavy = num(fc.tables_heavy ?? fc.heavy_tables, 0);
  const kursiGood = num(fc.chairs_good ?? fc.good_chairs, kursiTotal);
  const kursiMod = num(fc.chairs_moderate ?? fc.moderate_chairs, 0);
  const kursiHeavy = num(fc.chairs_heavy ?? fc.heavy_chairs, 0);
  
  // --- TAMBAHAN WADAH BARU ---
  // (Data ini diambil oleh detailApi.js yang sudah Anda setujui)
  const teacher = getData(schoolData, ['teacher'], {}) || {};
  const sanitasi = getData(schoolData, ['sanitasi'], {}) || {};
  const listrik = getData(schoolData, ['listrik'], {}) || {};
  const internet = getData(schoolData, ['internet'], {}) || {};
  const lab = getData(schoolData, ['laboratorium'], {}) || {};
  const rumahDinas = getData(schoolData, ['official_residences'], {}) || {};
  const siswaLanjutan = getData(schoolData, ['siswa_lanjutan'], {}) || {};
  // --- AKHIR TAMBAHAN WADAH BARU ---


  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.schoolName}>{getData(schoolData, ['name'])}</h1>
        <div className={styles.schoolInfo}>
          <div className={styles.infoRow}>
            <span className={styles.label}>NPSN</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{getData(schoolData, ['npsn'])}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Alamat</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{getData(schoolData, ['address'])}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Desa</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{getData(schoolData, ['village'])}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Kecamatan</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{getData(schoolData, ['kecamatan'], '—')}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Jumlah Siswa</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{getData(schoolData, ['student_count'])}</span>
          </div>
        </div>
        <button onClick={handleLocationClick} className={styles.locationButton}>
          📍 Lihat Lokasi di Google Maps
        </button>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Kondisi Kelas (Need & Intervensi)</h2>
        <div className={styles.card}>
          <div className={styles.chartContainer}>
            <div className={styles.chart}>
              <div className={styles.barContainer}>
                <div className={`${styles.bar} ${styles.barGreen}`} style={{ height: h(kelasBaik) }}>
                  <span className={styles.barLabel}>{kelasBaik}</span>
                </div>
                <span className={styles.barText}>Baik</span>
              </div>
              <div className={styles.barContainer}>
                <div className={`${styles.bar} ${styles.barYellow}`} style={{ height: h(rusakSedang) }}>
                  <span className={styles.barLabel}>{rusakSedang}</span>
                </div>
                <span className={styles.barText}>Rusak Sedang</span>
              </div>
              <div className={styles.barContainer}>
                <div className={`${styles.bar} ${styles.barRed}`} style={{ height: h(rusakBerat) }}>
                  <span className={styles.barLabel}>{rusakBerat}</span>
                </div>
                <span className={styles.barText}>Rusak Berat</span>
              </div>
              <div className={styles.barContainer}>
                <div className={`${styles.bar} ${styles.barBlue}`} style={{ height: h(kurangRkb) }}>
                  <span className={styles.barLabel}>{kurangRkb}</span>
                </div>
                <span className={styles.barText}>Kurang RKB</span>
              </div>
              <div className={styles.barContainer}>
                <div className={`${styles.bar} ${styles.barCyan}`} style={{ height: h(rehabKegiatan) }}>
                  <span className={styles.barLabel}>{rehabKegiatan}</span>
                </div>
                <span className={styles.barText}>Rehabilitasi</span>
              </div>
              <div className={styles.barContainer}>
                <div className={`${styles.bar} ${styles.barPurple}`} style={{ height: h(pembangunanKegiatan) }}>
                  <span className={styles.barLabel}>{pembangunanKegiatan}</span>
                </div>
                <span className={styles.barText}>Pembangunan RKB</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Fisik Bangunan Sekolah</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Luas Tanah: {landArea} m²</span></div>
          <div className={styles.dataRow}><span>Luas Bangunan: {buildingArea} m²</span></div>
          <div className={styles.dataRow}><span>Luas Halaman: {yardArea} m²</span></div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Kelas</h2>
        <div className={styles.card}>
          <div className={styles.gradeGrid}>
            <div className={styles.gradeItem}>
              <div className={styles.dataRow}><span>Kelas 1 Laki-laki: {g('1_L')}</span></div>
              <div className={styles.dataRow}><span>Kelas 1 Perempuan: {g('1_P')}</span></div>
              {/* TAMBAHAN WADAH BARU */}
              <div className={styles.dataRow}><span>Kelas 1 Kebutuhan Khusus: {g('khusus_1_L') + g('khusus_1_P')}</span></div>
            </div>
            <div className={styles.gradeItem}>
              <div className={styles.dataRow}><span>Kelas 2 Laki-laki: {g('2_L')}</span></div>
              <div className={styles.dataRow}><span>Kelas 2 Perempuan: {g('2_P')}</span></div>
              {/* TAMBAHAN WADAH BARU */}
              <div className={styles.dataRow}><span>Kelas 2 Kebutuhan Khusus: {g('khusus_2_L') + g('khusus_2_P')}</span></div>
            </div>
            <div className={styles.gradeItem}>
              <div className={styles.dataRow}><span>Kelas 3 Laki-laki: {g('3_L')}</span></div>
              <div className={styles.dataRow}><span>Kelas 3 Perempuan: {g('3_P')}</span></div>
              {/* TAMBAHAN WADAH BARU */}
              <div className={styles.dataRow}><span>Kelas 3 Kebutuhan Khusus: {g('khusus_3_L') + g('khusus_3_P')}</span></div>
            </div>
            <div className={styles.gradeItem}>
              <div className={styles.dataRow}><span>Kelas 4 Laki-laki: {g('4_L')}</span></div>
              <div className={styles.dataRow}><span>Kelas 4 Perempuan: {g('4_P')}</span></div>
              {/* TAMBAHAN WADAH BARU */}
              <div className={styles.dataRow}><span>Kelas 4 Kebutuhan Khusus: {g('khusus_4_L') + g('khusus_4_P')}</span></div>
            </div>
            <div className={styles.gradeItem}>
              <div className={styles.dataRow}><span>Kelas 5 Laki-laki: {g('5_L')}</span></div>
              <div className={styles.dataRow}><span>Kelas 5 Perempuan: {g('5_P')}</span></div>
              {/* TAMBAHAN WADAH BARU */}
              <div className={styles.dataRow}><span>Kelas 5 Kebutuhan Khusus: {g('khusus_5_L') + g('khusus_5_P')}</span></div>
            </div>
            <div className={styles.gradeItem}>
              <div className={styles.dataRow}><span>Kelas 6 Laki-laki: {g('6_L')}</span></div>
              <div className={styles.dataRow}><span>Kelas 6 Perempuan: {g('6_P')}</span></div>
              {/* TAMBAHAN WADAH BARU */}
              <div className={styles.dataRow}><span>Kelas 6 Kebutuhan Khusus: {g('khusus_6_L') + g('khusus_6_P')}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* TAMBAHAN WADAH BARU: Data Siswa Lanjutan */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Lulusan/Siswa Lanjutan</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Melanjutkan ke SMP: {getData(siswaLanjutan, ['lanjut_smp'], 0)}</span></div>
          <div className={styles.dataRow}><span>Melanjutkan ke MTs: {getData(siswaLanjutan, ['lanjut_mts'], 0)}</span></div>
          <div className={styles.dataRow}><span>Melanjutkan ke Pontren: {getData(siswaLanjutan, ['lanjut_pontren'], 0)}</span></div>
          <div className={styles.dataRow}><span>Melanjutkan ke PKBM: {getData(siswaLanjutan, ['lanjut_pkbm'], 0)}</span></div>
          <div className={styles.dataRow}><span>Tidak Melanjutkan: {getData(siswaLanjutan, ['tidak_lanjut'], 0)}</span></div>
        </div>
      </div>

      {/* TAMBAHAN WADAH BARU: Data Guru */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Guru & Tenaga Kerja</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Jumlah Guru: {getData(teacher, ['jumlah_guru'], 0)}</span></div>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Status Kepegawaian</h3>
            <div className={styles.dataRow}><span>PNS: {getData(teacher, ['pns'], 0)}</span></div>
            <div className={styles.dataRow}><span>PPPK: {getData(teacher, ['pppk'], 0)}</span></div>
            <div className={styles.dataRow}><span>Non ASN (Dapodik): {getData(teacher, ['non_asn_dapodik'], 0)}</span></div>
            <div className={styles.dataRow}><span>Non ASN (Non Dapodik): {getData(teacher, ['non_asn_non_dapodik'], 0)}</span></div>
          </div>
          <div className={styles.dataRow}><span>Kekurangan Guru: {getData(teacher, ['kekurangan_guru'], 0)}</span></div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Rombel</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Jumlah Rombel Kelas 1: {r('1')}</span></div>
          <div className={styles.dataRow}><span>Jumlah Rombel Kelas 2: {r('2')}</span></div>
          <div className={styles.dataRow}><span>Jumlah Rombel Kelas 3: {r('3')}</span></div>
          <div className={styles.dataRow}><span>Jumlah Rombel Kelas 4: {r('4')}</span></div>
          <div className={styles.dataRow}><span>Jumlah Rombel Kelas 5: {r('5')}</span></div>
          <div className={styles.dataRow}><span>Jumlah Rombel Kelas 6: {r('6')}</span></div>
          <div className={styles.dataRow}><span>Jumlah Keseluruhan Rombel: {r('total')}</span></div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Perpustakaan</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Jumlah Ruang Perpustakaan: {libTotal}</span></div>
          <div className={styles.dataRow}><span>Kondisi Baik: {libGood}</span></div>
          <div className={styles.dataRow}><span>Rusak Sedang: {libMod}</span></div>
          <div className={styles.dataRow}><span>Rusak Berat: {libHeavy}</span></div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Ruang Guru</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Jumlah Ruang Guru: {trTotal}</span></div>
          <div className={styles.dataRow}><span>Kondisi Baik: {trGood}</span></div>
          <div className={styles.dataRow}><span>Rusak Sedang: {trMod}</span></div>
          <div className={styles.dataRow}><span>Rusak Berat: {trHeavy}</span></div>
        </div>
      </div>
      
      {/* TAMBAHAN WADAH BARU: Ruang Lainnya (Lab & Rumah Dinas) */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Ruang Lainnya</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Laboratorium</h3>
            <div className={styles.dataRow}><span>Jumlah Lab: {getData(lab, ['total'], 0)}</span></div>
            <div className={styles.dataRow}><span>Kondisi Baik: {getData(lab, ['good'], 0)}</span></div>
            <div className={styles.dataRow}><span>Rusak Sedang: {getData(lab, ['moderate_damage'], 0)}</span></div>
            <div className={styles.dataRow}><span>Rusak Berat: {getData(lab, ['heavy_damage'], 0)}</span></div>
          </div>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Rumah Dinas</h3>
            <div className={styles.dataRow}><span>Jumlah Rumah Dinas: {getData(rumahDinas, ['total'], 0)}</span></div>
            <div className={styles.dataRow}><span>Kondisi Baik: {getData(rumahDinas, ['good'], 0)}</span></div>
            <div className={styles.dataRow}><span>Rusak Sedang: {getData(rumahDinas, ['moderate_damage'], 0)}</span></div>
            <div className={styles.dataRow}><span>Rusak Berat: {getData(rumahDinas, ['heavy_damage'], 0)}</span></div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>UKS</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Jumlah Ruang UKS: {uksTotal}</span></div>
          <div className={styles.dataRow}><span>Kondisi Baik: {uksGood}</span></div>
          <div className={styles.dataRow}><span>Rusak Sedang: {uksMod}</span></div>
          <div className={styles.dataRow}><span>Rusak Berat: {uksHeavy}</span></div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Toilet (Ringkasan)</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Jumlah Toilet (Total): {toiletTotal}</span></div>
          <div className={styles.dataRow}><span>Baik: {toiletGood}</span></div>
          <div className={styles.dataRow}><span>Rusak Sedang: {toiletMod}</span></div>
          <div className={styles.dataRow}><span>Rusak Berat: {toiletHeavy}</span></div>
        </div>
      </div>

      {/* TAMBAHAN WADAH BARU: Sanitasi Rinci */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Sanitasi (Rinci)</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Sumber Air: {getData(sanitasi, ['sumber_air'], '-')}</span></div>
          <div className={styles.dataRow}><span>Sumber Air Minum: {getData(sanitasi, ['sumber_air_minum'], '-')}</span></div>
          <div className={styles.dataRow}><span>Kecukupan Air Bersih: {getData(sanitasi, ['kecukupan_air'], '-')}</span></div>
          
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Rincian Jamban/WC</h3>
            <div className={styles.dataRow}><span>Jamban Siswa Laki-laki: {getData(sanitasi, ['jamban_siswa_laki'], 0)}</span></div>
            <div className={styles.dataRow}><span>Jamban Siswa Perempuan: {getData(sanitasi, ['jamban_siswa_perempuan'], 0)}</span></div>
            <div className={styles.dataRow}><span>Jamban Guru Laki-laki: {getData(sanitasi, ['jamban_guru_laki'], 0)}</span></div>
            <div className={styles.dataRow}><span>Jamban Guru Perempuan: {getData(sanitasi, ['jamban_guru_perempuan'], 0)}</span></div>
            <div className={styles.dataRow}><span>Jamban Disabilitas: {getData(sanitasi, ['jamban_disabilitas'], 0)}</span></div>
          </div>
        </div>
      </div>

      {/* TAMBAHAN WADAH BARU: Listrik & Internet */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Listrik & Internet</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Listrik</h3>
            <div className={styles.dataRow}><span>Sumber Listrik: {getData(listrik, ['sumber'], '-')}</span></div>
            <div className={styles.dataRow}><span>Daya Listrik: {getData(listrik, ['daya'], '0 VA')}</span></div>
          </div>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Internet</h3>
            <div className={styles.dataRow}><span>Akses Internet Utama: {getData(internet, ['akses'], '-')}</span></div>
            <div className={styles.dataRow}><span>Akses Internet Alternatif: {getData(internet, ['alternatif'], '-')}</span></div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Furniture dan Komputer</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Meja</h3>
            <div className={styles.dataRow}><span>Jumlah Meja: {mejaTotal}</span></div>
            <div className={styles.dataRow}><span>Meja Kondisi Baik: {mejaGood}</span></div>
            <div className={styles.dataRow}><span>Meja Rusak Sedang: {mejaMod}</span></div>
            <div className={styles.dataRow}><span>Meja Rusak Berat: {mejaHeavy}</span></div>
          </div>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Kursi</h3>
            <div className={styles.dataRow}><span>Jumlah Kursi: {kursiTotal}</span></div>
            <div className={styles.dataRow}><span>Kursi Kondisi Baik: {kursiGood}</span></div>
            <div className={styles.dataRow}><span>Kursi Rusak Sedang: {kursiMod}</span></div>
            <div className={styles.dataRow}><span>Kursi Rusak Berat: {kursiHeavy}</span></div>
          </div>
          <div className={styles.dataRow}><span>Jumlah Papan Tulis: {papanTotal}</span></div>
          <div className={styles.dataRow}><span>Jumlah Komputer: {komputerTotal}</span></div>
        </div>
      </div>
    </div>
  );
};

export default SchoolDetailSd;