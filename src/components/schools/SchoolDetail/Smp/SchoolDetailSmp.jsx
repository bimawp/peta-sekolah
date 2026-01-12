import React from "react";
import styles from "./SchoolDetailSmp.module.css";

const getData = (data, path, defaultValue = 0) => {
  const value = path.reduce(
    (obj, key) => (obj && obj[key] != null ? obj[key] : undefined),
    data
  );
  if (value === 0 || value === 0.0) return 0;
  return value ?? defaultValue;
};

const findOwnershipStatus = (obj, defaultValue = "-") => {
  if (!obj) return defaultValue;
  for (const key in obj) {
    if (obj[key] === "Ya" || obj[key] === "YA") {
      return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
    }
  }
  return defaultValue;
};

// Normalisasi room object dari meta.prasarana.*
// meta biasanya punya: good, moderate_damage, heavy_damage, total (atau total_all)
const normalizeRoom = (src) => {
  const o = src && typeof src === "object" ? src : {};
  const good = Number(o.good ?? 0);
  const moderate = Number(o.moderate_damage ?? 0);
  const heavy = Number(o.heavy_damage ?? 0);
  const totalAll = Number(o.total_all ?? o.total ?? 0);
  const totalMh = Number(o.total_mh ?? (moderate + heavy));
  return {
    good,
    moderate_damage: moderate,
    heavy_damage: heavy,
    total_all: totalAll,
    total_mh: totalMh,
  };
};

const normalizeToiletGender = (src) => {
  const o = src && typeof src === "object" ? src : {};
  const good = Number(o.good ?? 0);
  const moderate = Number(o.moderate_damage ?? 0);
  const heavy = Number(o.heavy_damage ?? 0);
  const totalAll = Number(o.total_all ?? o.total ?? 0);
  const totalMh = Number(o.total_mh ?? (moderate + heavy));
  return {
    good,
    moderate_damage: moderate,
    heavy_damage: heavy,
    total_all: totalAll,
    total_mh: totalMh,
  };
};

const normalizeToilet = (src) => {
  const o = src && typeof src === "object" ? src : {};
  return {
    male: normalizeToiletGender(o.male),
    female: normalizeToiletGender(o.female),
  };
};

const mapYesNo = (v) => {
  if (v === "YA") return "Ya";
  if (v === "TIDAK") return "Tidak";
  return v || "-";
};
const mapSudahBelum = (v) => {
  if (v === "SUDAH") return "Sudah";
  if (v === "BELUM") return "Belum";
  return v || "-";
};
const mapPeralatan = (v) => {
  if (v === "TIDAK_MEMILIKI") return "Tidak Memiliki";
  if (v === "HARUS_DIGANTI") return "Harus Diganti";
  if (v === "BAIK") return "Baik";
  if (v === "PERLU_REHABILITASI") return "Perlu Rehabilitasi";
  return v || "-";
};

const SchoolDetailSmp = ({ schoolData }) => {
  const handleLocationClick = () => {
    const coords =
      schoolData?.coordinates ??
      (() => {
        const lat = Number(
          schoolData?.lat ?? schoolData?._raw?.lat ?? schoolData?.latitude
        );
        const lng = Number(
          schoolData?.lng ?? schoolData?._raw?.lng ?? schoolData?.longitude
        );
        if (Number.isFinite(lat) && Number.isFinite(lng)) return [lng, lat];
        return null;
      })();

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
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
    }
    alert("Koordinat lokasi untuk sekolah ini tidak tersedia atau tidak valid.");
  };

  if (!schoolData) {
    return (
      <div className={styles.container}>
        <p>Data sekolah tidak ditemukan.</p>
      </div>
    );
  }

  // ===================== SOURCE UTAMA: META =====================
  const META = schoolData?.meta || {};
  const PR = META?.prasarana || {};
  const KL = META?.kelembagaan || {};

  /* ===================== I. IDENTITAS ===================== */
  const jenjang = schoolData.jenjang || schoolData.level || META?.jenjang || "SMP";
  const statusSekolah = schoolData.status || schoolData.status_sekolah || "-";

  const desaLabel =
    schoolData?.desa ||
    schoolData?.village ||
    schoolData?._raw?.locations?.village ||
    schoolData?.village_name ||
    META?.desa ||
    "-";

  const kecLabel =
    schoolData?.kecamatan ||
    schoolData?._raw?.locations?.subdistrict ||
    schoolData?._raw?.locations?.district ||
    META?.kecamatan ||
    "-";

  const alamatLabel = getData(schoolData, ["address"], "-");

  /* ===================== II. DATA SISWA ===================== */
  const siswaL = Number(schoolData?.st_male ?? 0);
  const siswaP = Number(schoolData?.st_female ?? 0);
  const totalFromLP = siswaL + siswaP;
  const totalSiswa =
    totalFromLP > 0 ? totalFromLP : Number(getData(schoolData, ["student_count"], 0));

  // ABK (jika ada di meta.siswaAbk atau input Anda, tetap aman default 0)
  const abkL = Number(getData(META, ["siswaAbk", "total", "l"], 0));
  const abkP = Number(getData(META, ["siswaAbk", "total", "p"], 0));

  /* ===================== III. RUANG KELAS & RKB ===================== */
  const classrooms = PR?.classrooms || {};
  const rusakBerat = Number(classrooms?.heavy_damage ?? 0);
  const rusakSedang = Number(classrooms?.moderate_damage ?? 0);
  const kelasBaik = Number(classrooms?.classrooms_good ?? 0);
  const kurangRkb = Number(classrooms?.kurangRkb ?? classrooms?.lacking_rkb ?? 0);

  const rehabKegiatan = Number(getData(META, ["kegiatanFisik", "rehabRuangKelas"], 0));
  const pembangunanKegiatan = Number(getData(META, ["kegiatanFisik", "pembangunanRKB"], 0));

  const allValues = [rusakBerat, rusakSedang, kurangRkb, rehabKegiatan, pembangunanKegiatan];
  const maxRoomValue = Math.max(...allValues, 1);

  const calculateHeight = (value) => {
    const numValue = Number(value) || 0;
    if (numValue === 0) return "calc(0% + 20px)";
    return `calc(${(numValue / maxRoomValue) * 100}% + 20px)`;
  };

  /* ===================== IV. STATUS TANAH & GEDUNG ===================== */
  // meta.prasarana.classrooms.lahan biasanya "TIDAK_ADA" atau sejenis
  const lahanStr = String(classrooms?.lahan ?? "").toUpperCase();
  const landOwnershipObj =
    lahanStr === "TIDAK_ADA"
      ? { tidak_ada: "Ya" }
      : lahanStr
      ? { [lahanStr.toLowerCase()]: "Ya" }
      : null;

  // jika tidak ada data kepemilikan gedung di meta, default "Tidak Diketahui"
  const buildingOwnershipObj = PR?.gedung_kepemilikan
    ? PR.gedung_kepemilikan
    : { tidak_diketahui: "Ya" };

  const landOwnership = findOwnershipStatus(landOwnershipObj, "Tidak Ada");
  const buildingOwnership = findOwnershipStatus(buildingOwnershipObj, "Tidak Diketahui");

  const luasLahan = Number(getData(PR, ["ukuran", "tanah"], 0));

  /* ===================== V. LAB & PERPUSTAKAAN ===================== */
  const perpustakaan = normalizeRoom(PR?.library);
  const labKomputer = normalizeRoom(PR?.laboratory_comp);
  const labBahasa = normalizeRoom(PR?.laboratory_langua);
  const labIpa = normalizeRoom(PR?.laboratory_ipa);
  const labFisika = normalizeRoom(PR?.laboratory_fisika);
  const labBiologi = normalizeRoom(PR?.laboratory_biologi);

  /* ===================== VI. RUANG PIMPINAN & TENDIK ===================== */
  // SESUAI PERMINTAAN: HAPUS WADAH "RUANG KEPALA SEKOLAH"
  const ruangGuru = normalizeRoom(PR?.teacher_room);
  const ruangTU = normalizeRoom(PR?.administration_room); // jika input Anda pakai key lain, tetap 0 default

  /* ===================== VII/VIII. TOILET ===================== */
  const teachersToilet = normalizeToilet(PR?.teachers_toilet);
  const studentsToilet = normalizeToilet(PR?.students_toilet);

  const toiletGuruMale = normalizeRoom(teachersToilet.male);
  const toiletGuruFemale = normalizeRoom(teachersToilet.female);
  const toiletSiswaMale = normalizeRoom(studentsToilet.male);
  const toiletSiswaFemale = normalizeRoom(studentsToilet.female);

  /* ===================== IX. FURNITUR & KOMPUTER ===================== */
  const mebeulair = PR?.mebeulair || {};
  const meja = Number(getData(mebeulair, ["tables", "total"], 0)) || Number(getData(mebeulair, ["tables", "good"], 0));
  const kursi = Number(getData(mebeulair, ["chairs", "total"], 0)) || Number(getData(mebeulair, ["chairs", "good"], 0));
  const papanTulis = Number(getData(PR, ["papan_tulis"], 0)); // jika Anda simpan di meta, isi key ini
  const komputer = Number(getData(mebeulair, ["computer"], 0));

  /* ===================== X. RUMAH DINAS ===================== */
  const official = PR?.official_residences || {};
  const rumahDinas = {
    total: Number(official?.total ?? 0),
    baik: Number(official?.good ?? 0),
    sedang: Number(official?.moderate_damage ?? 0),
    berat: Number(official?.heavy_damage ?? 0),
  };

  /* ===================== XI. DATA GURU & TENDIK ===================== */
  const jumlahGuru = Number(getData(META, ["guru", "jumlahGuru"], 0));
  const kekuranganGuru = Number(getData(META, ["guru", "kekuranganGuru"], 0));
  const tendik = Number(getData(META, ["tendik"], 0));

  /* ===================== XII. KELEMBAGAAN ===================== */
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
      {/* ===================== I. IDENTITAS SEKOLAH ===================== */}
      <div className={styles.header}>
        <h1 className={styles.schoolName}>
          {getData(schoolData, ["name"], "Nama Sekolah Tidak Tersedia")}
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
            <span className={styles.value}>{getData(schoolData, ["npsn"], "-")}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Alamat</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{alamatLabel}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Desa</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{desaLabel}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Kecamatan</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{kecLabel}</span>
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
        <h2 className={styles.sectionTitle}>III. Kondisi & Intervensi Ruang Kelas</h2>
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
        <h2 className={styles.sectionTitle}>V. Perpustakaan & Laboratorium</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Ruang Perpustakaan</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {perpustakaan.good}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {perpustakaan.moderate_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {perpustakaan.heavy_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Ruang Rusak: {perpustakaan.total_mh}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Ruang (Total): {perpustakaan.total_all}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Lab. Komputer</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {labKomputer.good}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {labKomputer.moderate_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {labKomputer.heavy_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Ruang Rusak: {labKomputer.total_mh}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Ruang (Total): {labKomputer.total_all}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Lab. Bahasa</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {labBahasa.good}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {labBahasa.moderate_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {labBahasa.heavy_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Ruang Rusak: {labBahasa.total_mh}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Ruang (Total): {labBahasa.total_all}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Lab. IPA</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {labIpa.good}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {labIpa.moderate_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {labIpa.heavy_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Ruang Rusak: {labIpa.total_mh}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Ruang (Total): {labIpa.total_all}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Lab. Fisika</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {labFisika.good}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {labFisika.moderate_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {labFisika.heavy_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Ruang Rusak: {labFisika.total_mh}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Ruang (Total): {labFisika.total_all}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Lab. Biologi</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {labBiologi.good}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {labBiologi.moderate_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {labBiologi.heavy_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Ruang Rusak: {labBiologi.total_mh}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Ruang (Total): {labBiologi.total_all}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== VI. RUANG PIMPINAN & TENDIK (KEPSEK DIHAPUS) ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          VI. Ruang Pimpinan & Tenaga Kependidikan
        </h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Ruang Guru</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {ruangGuru.good}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {ruangGuru.moderate_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {ruangGuru.heavy_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Ruang Rusak: {ruangGuru.total_mh}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Ruang (Total): {ruangGuru.total_all}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Ruang Tata Usaha</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {ruangTU.good}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {ruangTU.moderate_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {ruangTU.heavy_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Ruang Rusak: {ruangTU.total_mh}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Ruang (Total): {ruangTU.total_all}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== VII. TOILET GURU ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>VII. Toilet Guru</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Laki-laki</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {toiletGuruMale.good}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {toiletGuruMale.moderate_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {toiletGuruMale.heavy_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Rusak: {toiletGuruMale.total_mh}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Total: {toiletGuruMale.total_all}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Perempuan</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {toiletGuruFemale.good}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {toiletGuruFemale.moderate_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {toiletGuruFemale.heavy_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Rusak: {toiletGuruFemale.total_mh}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Total: {toiletGuruFemale.total_all}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== VIII. TOILET SISWA ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>VIII. Toilet Siswa</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Laki-laki</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {toiletSiswaMale.good}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {toiletSiswaMale.moderate_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {toiletSiswaMale.heavy_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Rusak: {toiletSiswaMale.total_mh}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Total: {toiletSiswaMale.total_all}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Perempuan</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {toiletSiswaFemale.good}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {toiletSiswaFemale.moderate_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {toiletSiswaFemale.heavy_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Rusak: {toiletSiswaFemale.total_mh}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Total: {toiletSiswaFemale.total_all}</span>
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

      {/* ===================== X. RUMAH DINAS ===================== */}
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

      {/* ===================== XI. DATA GURU & TENDIK ===================== */}
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

      {/* ===================== XII. KELEMBAGAAN ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>XII. Kelembagaan</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Alat Rumah Tangga: {kelembagaan.peralatanRumahTangga}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Pembinaan: {kelembagaan.pembinaan}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Asesmen: {kelembagaan.asesmen}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Menyelenggarakan Belajar: {kelembagaan.menyelenggarakanBelajar}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Melaksanakan Rekomendasi: {kelembagaan.melaksanakanRekomendasi}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Siap Dievaluasi: {kelembagaan.siapDievaluasi}</span>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>BOP</h3>
            <div className={styles.dataRow}>
              <span>Pengelola: {kelembagaan.bopPengelola}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Tenaga Peningkatan: {kelembagaan.bopTenagaPeningkatan}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Perizinan & Kurikulum</h3>
            <div className={styles.dataRow}>
              <span>Izin Pengendalian: {kelembagaan.izinPengendalian}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Izin Kelayakan: {kelembagaan.izinKelayakan}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Silabus: {kelembagaan.silabus}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Kompetensi Dasar: {kelembagaan.kompetensiDasar}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolDetailSmp;
