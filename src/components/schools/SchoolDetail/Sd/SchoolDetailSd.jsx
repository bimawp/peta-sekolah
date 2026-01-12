import React from "react";
import styles from "./SchoolDetailSd.module.css";

const getData = (data, path, def = "N/A") => {
  const v = path.reduce((o, k) => (o && o[k] != null ? o[k] : undefined), data);
  if (v === 0 || v === 0.0) return 0;
  return v !== undefined ? v : def;
};

const num = (v, d = 0) => (v == null || Number.isNaN(Number(v)) ? d : Number(v));

const SchoolDetailSd = ({ schoolData }) => {
  const handleLocationClick = () => {
    const coords = getData(schoolData, ["coordinates"], null);
    if (Array.isArray(coords) && coords.length === 2) {
      let lng = Number(coords[0]);
      let lat = Number(coords[1]);

      if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
        [lat, lng] = [lng, lat];
      }

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        window.open(
          `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
          "_blank",
          "noopener,noreferrer"
        );
        return;
      }
    }
    alert("Data koordinat lokasi untuk sekolah ini tidak tersedia.");
  };

  if (!schoolData) {
    return (
      <div className={styles.container}>
        <p>Memuat data sekolah...</p>
      </div>
    );
  }

  // ===================== SOURCE UTAMA: META =====================
  const META = schoolData?.meta || {};
  const PR = META?.prasarana || {};
  const KL = META?.kelembagaan || {};

  // ===================== IDENTITAS =====================
  const nama = getData(schoolData, ["name"], "Nama Sekolah Tidak Tersedia");
  const npsn = getData(schoolData, ["npsn"], "-");
  const alamat = getData(schoolData, ["address"], "-");
  const desa = schoolData?.desa || schoolData?.village || META?.desa || "-";
  const kecamatan = schoolData?.kecamatan || META?.kecamatan || "—";

  const totalSiswa = num(getData(schoolData, ["student_count"], 0), 0);

  // ===================== KONDISI KELAS =====================
  const classrooms = PR?.classrooms || {};
  const kelasBaik = num(classrooms?.good ?? classrooms?.classrooms_good, 0);
  const rusakSedang = num(classrooms?.moderate_damage ?? classrooms?.classrooms_moderate_damage, 0);
  const rusakBerat = num(classrooms?.heavy_damage ?? classrooms?.classrooms_heavy_damage, 0);
  const kurangRkb = num(classrooms?.lacking_rkb ?? classrooms?.kurangRkb, 0);

  const rehabKegiatan = num(getData(META, ["kegiatanFisik", "rehabRuangKelas"], 0), 0);
  const pembangunanKegiatan = num(getData(META, ["kegiatanFisik", "pembangunanRKB"], 0), 0);

  const maxRoomValue = Math.max(
    kelasBaik,
    rusakSedang,
    rusakBerat,
    kurangRkb,
    rehabKegiatan,
    pembangunanKegiatan,
    1
  );

  const h = (val) => {
    if (val <= 0) return "calc(0% + 20px)";
    return `calc(${(val / maxRoomValue) * 100}% + 20px)`;
  };

  // ===================== UKURAN (sudah masuk di meta.prasarana.ukuran) =====================
  const ukuran = PR?.ukuran || {};
  const landArea = num(ukuran?.tanah, 0);
  const buildingArea = num(ukuran?.bangunan, 0);
  const yardArea = num(ukuran?.halaman, 0);

  // ===================== DATA KELAS (dari schoolData.classes hasil query school_classes) =====================
  const classes = schoolData?.classes || {};
  const g = (k) => num(classes?.[k], 0);

  // ===================== GURU (meta.guru) =====================
  const guru = META?.guru || {};
  const jumlahGuru = num(guru?.jumlahGuru ?? guru?.jumlah_guru, 0);
  const pns = num(guru?.pns, 0);
  const pppk = num(guru?.pppk, 0);
  const nonAsnDapodik = num(guru?.non_asn_dapodik, 0);
  const nonAsnNonDapodik = num(guru?.non_asn_non_dapodik, 0);
  const kekuranganGuru = num(guru?.kekuranganGuru ?? guru?.kekurangan_guru, 0);

  // ===================== ROMBEL (opsional: kalau Anda isi di table school_classes dengan grade rombel1/rombel2/...) =====================
  const rombel = schoolData?.rombel || {};
  const r = (k) => num(rombel?.[k], 0);

  // ===================== PERPUS / RUANG GURU / UKS =====================
  const room = (x) => {
    const o = x && typeof x === "object" ? x : {};
    const good = num(o.good, 0);
    const mod = num(o.moderate_damage, 0);
    const heavy = num(o.heavy_damage, 0);
    const total = num(o.total_all ?? o.total, good + mod + heavy);
    return { total, good, mod, heavy };
  };

  const library = room(PR?.library);
  const teacherRoom = room(PR?.teacher_room);
  const uks = room(PR?.uks_room);

  // ===================== TOILET OVERALL (kalau Anda punya) =====================
  const toiletOverall = PR?.toilets_overall || {};
  const toiletTotal = num(toiletOverall?.total, 0);
  const toiletGood = num(toiletOverall?.good, 0);
  const toiletMod = num(toiletOverall?.moderate_damage, 0);
  const toiletHeavy = num(toiletOverall?.heavy_damage, 0);

  // ===================== FURNITURE (mebeulair) =====================
  const meb = PR?.mebeulair || {};
  const mejaTotal = num(getData(meb, ["tables", "total"], 0), 0);
  const mejaGood = num(getData(meb, ["tables", "good"], 0), 0);
  const mejaMod = num(getData(meb, ["tables", "moderate_damage"], 0), 0);
  const mejaHeavy = num(getData(meb, ["tables", "heavy_damage"], 0), 0);

  const kursiTotal = num(getData(meb, ["chairs", "total"], 0), 0);
  const kursiGood = num(getData(meb, ["chairs", "good"], 0), 0);
  const kursiMod = num(getData(meb, ["chairs", "moderate_damage"], 0), 0);
  const kursiHeavy = num(getData(meb, ["chairs", "heavy_damage"], 0), 0);

  const papanTotal = num(getData(PR, ["papan_tulis"], 0), 0);
  const komputerTotal = num(getData(meb, ["computer"], 0), 0);

  // ===================== KELEMBAGAAN (sama kaya SMP) =====================
  const mapYesNo = (v) => (v === "YA" ? "Ya" : v === "TIDAK" ? "Tidak" : v || "-");
  const mapSudahBelum = (v) => (v === "SUDAH" ? "Sudah" : v === "BELUM" ? "Belum" : v || "-");
  const mapPeralatan = (v) => {
    if (v === "TIDAK_MEMILIKI") return "Tidak Memiliki";
    if (v === "HARUS_DIGANTI") return "Harus Diganti";
    if (v === "BAIK") return "Baik";
    if (v === "PERLU_REHABILITASI") return "Perlu Rehabilitasi";
    return v || "-";
  };

  const kelembagaan = {
    peralatanRumahTangga: mapPeralatan(getData(KL, ["peralatanRumahTangga"], "-")),
    pembinaan: mapSudahBelum(getData(KL, ["pembinaan"], "-")),
    asesmen: mapSudahBelum(getData(KL, ["asesmen"], "-")),
    menyelenggarakanBelajar: mapYesNo(getData(KL, ["menyelenggarakanBelajar"], "-")),
    melaksanakanRekomendasi: mapYesNo(getData(KL, ["melaksanakanRekomendasi"], "-")),
    siapDievaluasi: mapYesNo(getData(KL, ["siapDievaluasi"], "-")),
    bopPengelola: mapYesNo(getData(KL, ["bop", "pengelola"], "-")),
    bopTenagaPeningkatan: mapYesNo(getData(KL, ["bop", "tenagaPeningkatan"], "-")),
    izinPengendalian: mapYesNo(getData(KL, ["perizinan", "pengendalian"], "-")),
    izinKelayakan: mapYesNo(getData(KL, ["perizinan", "kelayakan"], "-")),
    silabus: mapYesNo(getData(KL, ["kurikulum", "silabus"], "-")),
    kompetensiDasar: mapYesNo(getData(KL, ["kurikulum", "kompetensiDasar"], "-")),
  };

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <div className={styles.header}>
        <h1 className={styles.schoolName}>{nama}</h1>

        <div className={styles.schoolInfo}>
          <div className={styles.infoRow}>
            <span className={styles.label}>NPSN</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{npsn}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Alamat</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{alamat}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Desa</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{desa}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Kecamatan</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{kecamatan}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Jumlah Siswa</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{totalSiswa}</span>
          </div>
        </div>

        <button onClick={handleLocationClick} className={styles.locationButton}>
          📍 Lihat Lokasi di Google Maps
        </button>
      </div>

      {/* KONDISI KELAS */}
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

      {/* DATA FISIK */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Fisik Bangunan Sekolah</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Luas Tanah: {landArea} m²</span></div>
          <div className={styles.dataRow}><span>Luas Bangunan: {buildingArea} m²</span></div>
          <div className={styles.dataRow}><span>Luas Halaman: {yardArea} m²</span></div>
        </div>
      </div>

      {/* DATA KELAS */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Kelas</h2>
        <div className={styles.card}>
          <div className={styles.gradeGrid}>
            {[1, 2, 3, 4, 5, 6].map((k) => (
              <div key={k} className={styles.gradeItem}>
                <div className={styles.dataRow}><span>Kelas {k} Laki-laki: {g(`${k}_L`)}</span></div>
                <div className={styles.dataRow}><span>Kelas {k} Perempuan: {g(`${k}_P`)}</span></div>
                <div className={styles.dataRow}><span>Kelas {k} Kebutuhan Khusus: {g(`khusus_${k}_L`) + g(`khusus_${k}_P`)}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* GURU */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Guru & Tenaga Kerja</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Jumlah Guru: {jumlahGuru}</span></div>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Status Kepegawaian</h3>
            <div className={styles.dataRow}><span>PNS: {pns}</span></div>
            <div className={styles.dataRow}><span>PPPK: {pppk}</span></div>
            <div className={styles.dataRow}><span>Non ASN (Dapodik): {nonAsnDapodik}</span></div>
            <div className={styles.dataRow}><span>Non ASN (Non Dapodik): {nonAsnNonDapodik}</span></div>
          </div>
          <div className={styles.dataRow}><span>Kekurangan Guru: {kekuranganGuru}</span></div>
        </div>
      </div>

      {/* ROMBEL */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Rombel</h2>
        <div className={styles.card}>
          {[1, 2, 3, 4, 5, 6].map((k) => (
            <div key={k} className={styles.dataRow}>
              <span>Jumlah Rombel Kelas {k}: {r(String(k))}</span>
            </div>
          ))}
          <div className={styles.dataRow}><span>Jumlah Keseluruhan Rombel: {r("total")}</span></div>
        </div>
      </div>

      {/* PERPUS */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Perpustakaan</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Jumlah Ruang Perpustakaan: {library.total}</span></div>
          <div className={styles.dataRow}><span>Kondisi Baik: {library.good}</span></div>
          <div className={styles.dataRow}><span>Rusak Sedang: {library.mod}</span></div>
          <div className={styles.dataRow}><span>Rusak Berat: {library.heavy}</span></div>
        </div>
      </div>

      {/* RUANG GURU */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Ruang Guru</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Jumlah Ruang Guru: {teacherRoom.total}</span></div>
          <div className={styles.dataRow}><span>Kondisi Baik: {teacherRoom.good}</span></div>
          <div className={styles.dataRow}><span>Rusak Sedang: {teacherRoom.mod}</span></div>
          <div className={styles.dataRow}><span>Rusak Berat: {teacherRoom.heavy}</span></div>
        </div>
      </div>

      {/* UKS */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>UKS</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Jumlah Ruang UKS: {uks.total}</span></div>
          <div className={styles.dataRow}><span>Kondisi Baik: {uks.good}</span></div>
          <div className={styles.dataRow}><span>Rusak Sedang: {uks.mod}</span></div>
          <div className={styles.dataRow}><span>Rusak Berat: {uks.heavy}</span></div>
        </div>
      </div>

      {/* TOILET */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Toilet (Ringkasan)</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Jumlah Toilet (Total): {toiletTotal}</span></div>
          <div className={styles.dataRow}><span>Baik: {toiletGood}</span></div>
          <div className={styles.dataRow}><span>Rusak Sedang: {toiletMod}</span></div>
          <div className={styles.dataRow}><span>Rusak Berat: {toiletHeavy}</span></div>
        </div>
      </div>

      {/* FURNITURE */}
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

      {/* XII KELEMBAGAAN */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>XII. Kelembagaan</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Alat Rumah Tangga: {kelembagaan.peralatanRumahTangga}</span></div>
          <div className={styles.dataRow}><span>Pembinaan: {kelembagaan.pembinaan}</span></div>
          <div className={styles.dataRow}><span>Asesmen: {kelembagaan.asesmen}</span></div>
          <div className={styles.dataRow}><span>Menyelenggarakan Belajar: {kelembagaan.menyelenggarakanBelajar}</span></div>
          <div className={styles.dataRow}><span>Melaksanakan Rekomendasi: {kelembagaan.melaksanakanRekomendasi}</span></div>
          <div className={styles.dataRow}><span>Siap Dievaluasi: {kelembagaan.siapDievaluasi}</span></div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>BOP</h3>
            <div className={styles.dataRow}><span>Pengelola: {kelembagaan.bopPengelola}</span></div>
            <div className={styles.dataRow}><span>Tenaga Peningkatan: {kelembagaan.bopTenagaPeningkatan}</span></div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Perizinan & Kurikulum</h3>
            <div className={styles.dataRow}><span>Izin Pengendalian: {kelembagaan.izinPengendalian}</span></div>
            <div className={styles.dataRow}><span>Izin Kelayakan: {kelembagaan.izinKelayakan}</span></div>
            <div className={styles.dataRow}><span>Silabus: {kelembagaan.silabus}</span></div>
            <div className={styles.dataRow}><span>Kompetensi Dasar: {kelembagaan.kompetensiDasar}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolDetailSd;
