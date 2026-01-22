// src/components/schools/SchoolDetail/Pkbm/SchoolDetailPkbm.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import styles from "./SchoolDetailPkbm.module.css";
const RPC_NAME = "rpc_school_detail_pkbm"; // pastikan sesuai RPC Anda

/* =========================
   Helpers
   ========================= */
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const safeText = (v, fallback = "-") => {
  if (v === null || v === undefined || v === "") return fallback;
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "Ya" : "Tidak";
  try {
    return String(v);
  } catch {
    return fallback;
  }
};

const getData = (data, path, def = undefined) => {
  const v = (path || []).reduce((o, k) => (o && o[k] != null ? o[k] : undefined), data);
  if (v === 0 || v === 0.0) return 0;
  return v !== undefined && v !== null && v !== "" ? v : def;
};

const mergeDeep = (base, extra) => {
  const b = isObj(base) ? base : {};
  const e = isObj(extra) ? extra : {};
  const out = { ...b };
  for (const [k, v] of Object.entries(e)) {
    if (isObj(v) && isObj(out[k])) out[k] = mergeDeep(out[k], v);
    else out[k] = v;
  }
  return out;
};

const roomSup0 = () => ({
  good: 0,
  total: 0,
  rusakTotal: 0,
  rusakRingan: 0,
  heavy_damage: 0,
  moderate_damage: 0,
});

const normalizeRoomSupabase = (src) => {
  const o = isObj(src) ? src : {};
  return {
    good: num(o.good, 0),
    total: num(o.total, 0),
    rusakTotal: num(o.rusakTotal, 0),
    rusakRingan: num(o.rusakRingan, 0),
    moderate_damage: num(o.moderate_damage, 0),
    heavy_damage: num(o.heavy_damage, 0),
  };
};

// Untuk bagian mebeulair UI (baik vs rusak) yang TIDAK menampilkan breakdown
const baikRusakFromRoom = (room) => {
  const r = normalizeRoomSupabase(room);
  const total = r.total > 0 ? r.total : Math.max(r.good, 0);
  const baik = r.good;
  // prioritas pakai rusakTotal jika ada, jika 0 maka fallback total - baik
  const rusak = r.rusakTotal > 0 ? r.rusakTotal : Math.max(0, total - baik);
  return { total, baik, rusak };
};

const boolOrDash = (v) => {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "boolean") return v ? "Ya" : "Tidak";
  const s = String(v).trim();
  if (!s) return "-";
  const up = s.toUpperCase();

  // Supabase Anda memakai "Ada"
  if (up === "ADA") return "Ada";
  if (["YA", "Y", "YES", "TRUE", "1"].includes(up)) return "Ya";
  if (["TIDAK", "TDK", "NO", "FALSE", "0"].includes(up)) return "Tidak";
  return safeText(v, "-");
};

/* =========================
   Template sesuai Supabase
   ========================= */
const createFacilitiesTemplate = () => ({
  rooms: {
    ape: roomSup0(),
    library: roomSup0(),
    toilets: roomSup0(),
    uks_room: roomSup0(),
    laboratory: roomSup0(),
    teacher_room: roomSup0(),
    headmaster_room: roomSup0(),
    administration_room: roomSup0(),
    official_residences: roomSup0(),
  },
  gedung: { jumlah: 0 },
  ukuran: { tanah: null, halaman: null, bangunan: null },
  mebeulair: {
    chairs: roomSup0(),
    tables: roomSup0(),
    computer: 0,
    whiteboard: roomSup0(),
  },
  chromebook: 0,
  classrooms: {
    lahan: null,
    kelebihan: 0,
    kurangRkb: 0,
    rusakTotal: 0,
    total_room: 0,
    rkbTambahan: 0,
    rusakRingan: 0,
    heavy_damage: 0,
    classrooms_good: 0,
    classrooms_moderate_damage: 0,
  },
  students_toilet: { male: roomSup0(), female: roomSup0() },
  teachers_toilet: { male: roomSup0(), female: roomSup0() },
  peralatanRumahTangga: null,
});

const createMetaTemplate = () => ({
  desa: "",
  kecamatan: "",
  alamat: "",
  guru: {
    pns: 0,
    pppk: 0,
    jumlahGuru: 0,
    nonAsnDapodik: 0,
    kekuranganGuru: 0,
    pppkParuhWaktu: 0,
    nonAsnTidakDapodik: 0,
  },
  siswa: {
    paketA: {
      kelas1: { l: 0, p: 0 },
      kelas2: { l: 0, p: 0 },
      kelas3: { l: 0, p: 0 },
      kelas4: { l: 0, p: 0 },
      kelas5: { l: 0, p: 0 },
      kelas6: { l: 0, p: 0 },
    },
    paketB: {
      kelas7: { l: 0, p: 0 },
      kelas8: { l: 0, p: 0 },
      kelas9: { l: 0, p: 0 },
    },
    paketC: {
      kelas10: { l: 0, p: 0 },
      kelas11: { l: 0, p: 0 },
      kelas12: { l: 0, p: 0 },
    },
  },
  rombel: {
    paket_a_kelas_1: 0,
    paket_a_kelas_2: 0,
    paket_a_kelas_3: 0,
    paket_a_kelas_4: 0,
    paket_a_kelas_5: 0,
    paket_a_kelas_6: 0,
    paket_b_kelas_7: 0,
    paket_b_kelas_8: 0,
    paket_b_kelas_9: 0,
    paket_c_kelas_10: 0,
    paket_c_kelas_11: 0,
    paket_c_kelas_12: 0,
  },
  contact: { operator_name: "", operator_phone: "" },
  is_paud: false,
  is_test: false,
  jenjang: "PKBM",
  siswaAbk: {
    paketA: {
      kelas1: { l: 0, p: 0 },
      kelas2: { l: 0, p: 0 },
      kelas3: { l: 0, p: 0 },
      kelas4: { l: 0, p: 0 },
      kelas5: { l: 0, p: 0 },
      kelas6: { l: 0, p: 0 },
    },
    paketB: {
      kelas7: { l: 0, p: 0 },
      kelas8: { l: 0, p: 0 },
      kelas9: { l: 0, p: 0 },
    },
    paketC: {
      kelas10: { l: 0, p: 0 },
      kelas11: { l: 0, p: 0 },
      kelas12: { l: 0, p: 0 },
    },
  },
  desa_code: "",
  kecamatan_code: "",
  prasarana: null, // sesuai format Supabase (null)
  kelembagaan: {
    bop: { pengelola: "", tenagaPeningkatan: 0 },
    asesmen: "",
    kurikulum: { silabus: "", kompetensiDasar: "" },
    pembinaan: "",
    perizinan: { kelayakan: "", pengendalian: "" },
    siapDievaluasi: "",
    melaksanakanRekomendasi: "",
    menyelenggarakanBelajar: "",
  },
  kegiatanFisik: {
    rehabToilet: 0,
    pembangunanRKB: 0,
    rehabRuangKelas: 0,
    pembangunanToilet: 0,
  },
  lulusanPaketA: { mts: 0, smp: 0, paketB: 0, pontren: 0 },
  lulusanPaketB: { ma: 0, sma: 0, smk: 0, paketC: 0, pontren: 0 },
  lulusanPaketC: { pt: 0, bekerja: 0 },
  bantuan_received: "",
  monthly_report_file: null,
});

const createClassConditionTemplate = () => ({
  lahan: null,
  kelebihan: 0,
  kurangRkb: 0,
  rusakTotal: 0,
  total_room: 0,
  rkbTambahan: 0,
  rusakRingan: 0,
  heavy_damage: 0,
  classrooms_good: 0,
  classrooms_moderate_damage: 0,
});

/* =========================
   Siswa/ABK helpers sesuai Supabase
   ========================= */
const PAKET_ORDER = ["paketA", "paketB", "paketC"];
const PAKET_LABEL = { paketA: "Paket A", paketB: "Paket B", paketC: "Paket C" };
const KELAS_KEYS = {
  paketA: ["kelas1", "kelas2", "kelas3", "kelas4", "kelas5", "kelas6"],
  paketB: ["kelas7", "kelas8", "kelas9"],
  paketC: ["kelas10", "kelas11", "kelas12"],
};

const sumSiswaLP = (siswaObj) => {
  const s = isObj(siswaObj) ? siswaObj : {};
  let L = 0;
  let P = 0;
  for (const paket of PAKET_ORDER) {
    const paketObj = isObj(s[paket]) ? s[paket] : {};
    for (const kelas of KELAS_KEYS[paket]) {
      const kv = isObj(paketObj[kelas]) ? paketObj[kelas] : {};
      L += num(kv.l, 0);
      P += num(kv.p, 0);
    }
  }
  return { l: L, p: P };
};

const buildSiswaRows = (siswaObj, prefix = "") => {
  const s = isObj(siswaObj) ? siswaObj : {};
  const rows = [];
  for (const paket of PAKET_ORDER) {
    const paketObj = isObj(s[paket]) ? s[paket] : {};
    for (const kelas of KELAS_KEYS[paket]) {
      const kv = isObj(paketObj[kelas]) ? paketObj[kelas] : {};
      const kelasNo = kelas.replace("kelas", "");
      rows.push({
        label: `${prefix}${PAKET_LABEL[paket]} Kelas ${kelasNo} Laki-laki`,
        value: num(kv.l, 0),
      });
      rows.push({
        label: `${prefix}${PAKET_LABEL[paket]} Kelas ${kelasNo} Perempuan`,
        value: num(kv.p, 0),
      });
    }
  }
  return rows;
};

/* =========================
   Rombel helpers sesuai Supabase
   meta.rombel: paket_a_kelas_1, dst
   ========================= */
const buildRombelRows = (rombelObj) => {
  const r = isObj(rombelObj) ? rombelObj : {};
  const rows = [];

  const parsed = Object.entries(r)
    .map(([k, v]) => {
      const m = String(k).match(/^paket_([abc])_kelas_([0-9]{1,2})$/i);
      if (!m) return null;
      const letter = String(m[1]).toUpperCase();
      const kelasNo = num(m[2], NaN);
      if (!Number.isFinite(kelasNo)) return null;
      return { paket: letter, kelas: kelasNo, value: num(v, 0) };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const ord = (x) => (x === "A" ? 1 : x === "B" ? 2 : 3);
      if (ord(a.paket) !== ord(b.paket)) return ord(a.paket) - ord(b.paket);
      return a.kelas - b.kelas;
    });

  for (const it of parsed) {
    rows.push({ label: `Paket ${it.paket} Kelas ${it.kelas}`, value: it.value });
  }
  return rows;
};

const sumRombelTotal = (rombelObj) => {
  const r = isObj(rombelObj) ? rombelObj : {};
  let total = 0;
  for (const v of Object.values(r)) total += num(v, 0);
  return total;
};

/* =========================
   Kelembagaan renderer (sesuai Supabase)
   ========================= */
const toTitleCase = (s) =>
  String(s ?? "")
    .trim()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");

const prettyValue = (v) => {
  if (v === null || v === undefined || v === "") return null;
  if (isObj(v) || Array.isArray(v)) return null;

  if (typeof v === "boolean") return v ? "Ya" : "Tidak";
  if (typeof v === "number") return String(v);

  const s = String(v).trim();
  if (!s) return null;

  const upper = s.toUpperCase();
  if (upper === "YA") return "Ya";
  if (upper === "TIDAK") return "Tidak";
  if (upper === "BELUM") return "Belum";
  if (upper === "BAIK") return "Baik";

  return toTitleCase(s);
};

const pvOrDash = (v) => {
  const pv = prettyValue(v);
  return pv == null ? "-" : pv;
};

const renderKelembagaan = (kelembagaan) => {
  const ke = isObj(kelembagaan) ? kelembagaan : {};

  const pembinaan = ke.pembinaan;
  const asesmen = ke.asesmen;

  const menyelenggarakan = ke.menyelenggarakanBelajar;
  const melaksanakan = ke.melaksanakanRekomendasi;
  const siapDievaluasi = ke.siapDievaluasi;

  const bop = isObj(ke.bop) ? ke.bop : {};
  const bopPengelola = bop.pengelola;
  const bopTenaga = bop.tenagaPeningkatan;

  const per = isObj(ke.perizinan) ? ke.perizinan : {};
  const izinPengendalian = per.pengendalian;
  const izinKelayakan = per.kelayakan;

  const kur = isObj(ke.kurikulum) ? ke.kurikulum : {};
  const silabus = kur.silabus;
  const kd = kur.kompetensiDasar;

  return [
    <div className={styles.subsection} key="ke_admin">
      <h3 className={styles.subsectionTitle}>Administrasi dan kelengkapan</h3>
      <div className={styles.dataRow}>
        <span>Pembinaan : {pvOrDash(pembinaan)}</span>
      </div>
      <div className={styles.dataRow}>
        <span>Asesmen : {pvOrDash(asesmen)}</span>
      </div>
    </div>,

    <div className={styles.subsection} key="ke_status">
      <h3 className={styles.subsectionTitle}>Status penyelenggaraan</h3>
      <div className={styles.dataRow}>
        <span>Menyelenggarakan kegiatan belajar : {pvOrDash(menyelenggarakan)}</span>
      </div>
      <div className={styles.dataRow}>
        <span>Melaksanakan rekomendasi : {pvOrDash(melaksanakan)}</span>
      </div>
      <div className={styles.dataRow}>
        <span>Siap dievaluasi : {pvOrDash(siapDievaluasi)}</span>
      </div>
    </div>,

    <div className={styles.subsection} key="ke_bop">
      <h3 className={styles.subsectionTitle}>BOP</h3>
      <div className={styles.dataRow}>
        <span>Pengelola BOP tersedia : {pvOrDash(bopPengelola)}</span>
      </div>
      <div className={styles.dataRow}>
        <span>Jumlah Tenaga Peningkatan : {pvOrDash(bopTenaga)}</span>
      </div>
    </div>,

    <div className={styles.subsection} key="ke_perizinan">
      <h3 className={styles.subsectionTitle}>Perizinan</h3>
      <div className={styles.dataRow}>
        <span>Pengendalian perizinan : {pvOrDash(izinPengendalian)}</span>
      </div>
      <div className={styles.dataRow}>
        <span>Kelayakan perizinan : {pvOrDash(izinKelayakan)}</span>
      </div>
    </div>,

    <div className={styles.subsection} key="ke_kurikulum">
      <h3 className={styles.subsectionTitle}>Kurikulum</h3>
      <div className={styles.dataRow}>
        <span>Silabus tersedia : {pvOrDash(silabus)}</span>
      </div>
      <div className={styles.dataRow}>
        <span>Kompetensi dasar tersedia : {pvOrDash(kd)}</span>
      </div>
    </div>,
  ];
};

/* =========================
   Fetch Supabase (RPC + fallback view)
   ========================= */
async function fetchPkbmDetailFromSupabase(npsn) {
  try {
    const { data, error } = await supabase.rpc(RPC_NAME, { p_npsn: npsn }).single();
    if (error) throw error;
    return data ?? null;
  } catch (e) {
    const { data: rows, error } = await supabase.from("schools_with_details").select("*").eq("npsn", npsn).limit(1);
    if (error) throw error;
    return rows?.[0] ?? null;
  }
}

/* =========================
   Build WADAH (sesuai Supabase)
   ========================= */
const buildWadahPkbm = (schoolData) => {
  const metaRaw = isObj(schoolData?.meta) ? schoolData.meta : {};
  const facilitiesRaw = isObj(schoolData?.facilities) ? schoolData.facilities : {};
  const classCondRaw = isObj(schoolData?.class_condition) ? schoolData.class_condition : {};

  const META = mergeDeep(createMetaTemplate(), metaRaw);
  const FAC = mergeDeep(createFacilitiesTemplate(), facilitiesRaw);
  const CC = mergeDeep(createClassConditionTemplate(), classCondRaw);

  // Identitas dasar (tetap fleksibel, tapi tidak membuat field baru di META/FAC/CC)
  const desa = safeText(META?.desa, "");
  const kecamatan = safeText(META?.kecamatan, "");
  const alamat = safeText(META?.alamat, "");

  return {
    sekolah: {
      id: schoolData?.id ?? null,
      name: safeText(getData(schoolData, ["name"], "Nama PKBM Tidak Tersedia"), "Nama PKBM Tidak Tersedia"),
      npsn: safeText(getData(schoolData, ["npsn"], "-"), "-"),
      address: safeText(getData(schoolData, ["address"], alamat || "-"), "-"),
      status: safeText(schoolData?.status ?? schoolData?.status_sekolah ?? schoolData?.statusSekolah ?? "", ""),
      lat: schoolData?.lat ?? schoolData?.latitude ?? null,
      lng: schoolData?.lng ?? schoolData?.longitude ?? null,
      desa: safeText(desa || schoolData?.desa || schoolData?.village_name || "", "-"),
      kecamatan: safeText(kecamatan || schoolData?.kecamatan || schoolData?.kecamatan_name || "", "-"),
    },
    meta: META,
    facilities: FAC,
    class_condition: CC,
  };
};

/* =========================
   Component
   ========================= */
const SchoolDetailPkbm = ({ schoolData: propSchoolData, npsn: propNpsn }) => {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [fetched, setFetched] = useState(null);

  const npsnForFetch =
    safeText(propNpsn, "") !== ""
      ? propNpsn
      : safeText(getData(propSchoolData, ["npsn"], ""), "") !== ""
      ? getData(propSchoolData, ["npsn"], "")
      : "";

  useEffect(() => {
    let alive = true;

    if (propSchoolData) return;
    if (!npsnForFetch) return;

    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const data = await fetchPkbmDetailFromSupabase(npsnForFetch);
        if (!alive) return;
        setFetched(data);
      } catch (e) {
        if (!alive) return;
        setLoadError(e?.message ? String(e.message) : "Gagal memuat data dari Supabase.");
        setFetched(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [npsnForFetch, propSchoolData]);

  const schoolData = propSchoolData || fetched;

  const WADAH = useMemo(() => {
    if (!schoolData) return null;
    return buildWadahPkbm(schoolData);
  }, [schoolData]);

  const handleLocationClick = useCallback(() => {
    const lat = WADAH?.sekolah?.lat;
    const lng = WADAH?.sekolah?.lng;

    // kalau ada coordinates array, tetap dipakai (prioritas)
    const coords = schoolData?.coordinates ?? null;

    let pair = null;
    if (Array.isArray(coords) && coords.length === 2) {
      const a = Number(coords[0]);
      const b = Number(coords[1]);
      if (Number.isFinite(a) && Number.isFinite(b)) pair = [a, b];
    } else if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
      pair = [Number(lng), Number(lat)]; // [lng, lat] mengikuti kebiasaan geojson
    }

    if (pair) {
      let lng2 = Number(pair[0]);
      let lat2 = Number(pair[1]);

      // swap kalau ketuker
      if (Math.abs(lat2) > 90 && Math.abs(lng2) <= 90) [lat2, lng2] = [lng2, lat2];

      const isZeroZero = lat2 === 0 && lng2 === 0;
      if (!isZeroZero && Math.abs(lat2) <= 90 && Math.abs(lng2) <= 180) {
        const url = `https://www.google.com/maps/search/?api=1&query=${lat2},${lng2}`;
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
    }

    alert("Data koordinat lokasi untuk sekolah ini tidak tersedia atau tidak valid.");
  }, [WADAH, schoolData]);

  if (loading && !schoolData) {
    return (
      <div className={styles.container}>
        <p>Memuat data PKBM dari Supabase...</p>
      </div>
    );
  }

  if (loadError && !schoolData) {
    return (
      <div className={styles.container}>
        <p>Gagal memuat data PKBM.</p>
        <p style={{ whiteSpace: "pre-wrap" }}>{loadError}</p>
      </div>
    );
  }

  if (!schoolData || !WADAH) {
    return (
      <div className={styles.container}>
        <p>Data PKBM tidak ditemukan.</p>
      </div>
    );
  }

  const META = WADAH.meta;
  const FAC = WADAH.facilities;
  const CC = WADAH.class_condition;

  // Identitas
  const jenjang = safeText(META?.jenjang || schoolData?.jenjang || "PKBM", "PKBM");
  const statusSekolah = safeText(WADAH?.sekolah?.status, "");

  const nama = WADAH?.sekolah?.name;
  const npsn = WADAH?.sekolah?.npsn;
  const address = WADAH?.sekolah?.address;

  const desa = safeText(WADAH?.sekolah?.desa, "-");
  const kecamatan = safeText(WADAH?.sekolah?.kecamatan, "-");

  const latVal = WADAH?.sekolah?.lat;
  const lngVal = WADAH?.sekolah?.lng;

  // =====================
  // II. Kondisi Prasarana
  // =====================
  // Ruang Kelas (prioritas class_condition)
  const ccSrc = isObj(CC) ? CC : {};
  const facClass = isObj(FAC?.classrooms) ? FAC.classrooms : createFacilitiesTemplate().classrooms;

  const kelasTotal = num(ccSrc.total_room ?? facClass.total_room, 0);
  const kelasBaik = num(ccSrc.classrooms_good ?? facClass.classrooms_good, 0);
  const kelasRingan = num(ccSrc.rusakRingan ?? facClass.rusakRingan, 0);
  const rusakSedang = num(ccSrc.classrooms_moderate_damage ?? facClass.classrooms_moderate_damage, 0);
  const rusakBerat = num(ccSrc.heavy_damage ?? facClass.heavy_damage, 0);
  const kelasTotalRusak = num(ccSrc.rusakTotal ?? facClass.rusakTotal, 0);

  const kurangRkb = num(ccSrc.kurangRkb ?? facClass.kurangRkb, 0);
  const kelebihanKelas = num(ccSrc.kelebihan ?? facClass.kelebihan, 0);
  const kelasTambahan = num(ccSrc.rkbTambahan ?? facClass.rkbTambahan, 0);
  const lahanTersedia = ccSrc.lahan ?? facClass.lahan ?? null;

  // Intervensi RKB (kegiatanFisik)
  const kf = isObj(META?.kegiatanFisik) ? META.kegiatanFisik : createMetaTemplate().kegiatanFisik;
  const rehabKegiatan = num(kf.rehabRuangKelas, 0);
  const pembangunanKegiatan = num(kf.pembangunanRKB, 0);

  const showRKB = true;
  const maxRoomValue = Math.max(rusakBerat, rusakSedang, kurangRkb, rehabKegiatan, pembangunanKegiatan, 1);
  const calculateHeight = (value) => {
    const v = Number(value) || 0;
    if (v === 0) return "calc(0% + 20px)";
    return `calc(${(v / maxRoomValue) * 100}% + 20px)`;
  };

  // Data fisik bangunan
  const ukuran = isObj(FAC?.ukuran) ? FAC.ukuran : createFacilitiesTemplate().ukuran;
  const luasTanah = ukuran.tanah;
  const luasBangunan = ukuran.bangunan;
  const luasHalaman = ukuran.halaman;

  const jumlahGedung = num(getData(FAC, ["gedung", "jumlah"], 0), 0);

  // Toilet ringkasan
  const rooms = isObj(FAC?.rooms) ? FAC.rooms : createFacilitiesTemplate().rooms;
  const toiletRoom = normalizeRoomSupabase(rooms?.toilets);

  const st = isObj(FAC?.students_toilet) ? FAC.students_toilet : createFacilitiesTemplate().students_toilet;
  const tc = isObj(FAC?.teachers_toilet) ? FAC.teachers_toilet : createFacilitiesTemplate().teachers_toilet;

  const stMale = normalizeRoomSupabase(st?.male);
  const stFemale = normalizeRoomSupabase(st?.female);
  const tcMale = normalizeRoomSupabase(tc?.male);
  const tcFemale = normalizeRoomSupabase(tc?.female);

  const sumToilet = (a, b, c, d) => ({
    total: num(a.total, 0) + num(b.total, 0) + num(c.total, 0) + num(d.total, 0),
    good: num(a.good, 0) + num(b.good, 0) + num(c.good, 0) + num(d.good, 0),
    rusakRingan: num(a.rusakRingan, 0) + num(b.rusakRingan, 0) + num(c.rusakRingan, 0) + num(d.rusakRingan, 0),
    moderate_damage:
      num(a.moderate_damage, 0) + num(b.moderate_damage, 0) + num(c.moderate_damage, 0) + num(d.moderate_damage, 0),
    heavy_damage:
      num(a.heavy_damage, 0) + num(b.heavy_damage, 0) + num(c.heavy_damage, 0) + num(d.heavy_damage, 0),
    rusakTotal: num(a.rusakTotal, 0) + num(b.rusakTotal, 0) + num(c.rusakTotal, 0) + num(d.rusakTotal, 0),
  });

  const toiletFallbackSum = sumToilet(stMale, stFemale, tcMale, tcFemale);

  const toiletTotal = toiletRoom.total > 0 ? toiletRoom.total : toiletFallbackSum.total;
  const toiletGood = toiletRoom.total > 0 ? toiletRoom.good : toiletFallbackSum.good;
  const toiletLight = toiletRoom.total > 0 ? toiletRoom.rusakRingan : toiletFallbackSum.rusakRingan;
  const toiletMod = toiletRoom.total > 0 ? toiletRoom.moderate_damage : toiletFallbackSum.moderate_damage;
  const toiletHeavy = toiletRoom.total > 0 ? toiletRoom.heavy_damage : toiletFallbackSum.heavy_damage;
  const toiletTotalRusak = toiletRoom.total > 0 ? toiletRoom.rusakTotal : toiletFallbackSum.rusakTotal;

  // Ruang penunjang (mapping sesuai Supabase)
  const roomPerpus = normalizeRoomSupabase(rooms?.library);
  const roomLab = normalizeRoomSupabase(rooms?.laboratory);
  const roomGuru = normalizeRoomSupabase(rooms?.teacher_room);
  const roomKS = normalizeRoomSupabase(rooms?.headmaster_room);
  const roomTU = normalizeRoomSupabase(rooms?.administration_room); // Supabase: administration_room
  const roomUKS = normalizeRoomSupabase(rooms?.uks_room);
  const roomToiletUmum = normalizeRoomSupabase(rooms?.toilets);
  const roomRumahDinas = normalizeRoomSupabase(rooms?.official_residences);

  // Mebeulair & teknologi
  const meb = isObj(FAC?.mebeulair) ? FAC.mebeulair : createFacilitiesTemplate().mebeulair;

  const mejaBR = baikRusakFromRoom(meb?.tables);
  const kursiBR = baikRusakFromRoom(meb?.chairs);
  const papanBR = baikRusakFromRoom(meb?.whiteboard);

  const komputerTotal = num(meb?.computer, 0);
  const komputerBaik = komputerTotal;

  const chromebookTotal = num(FAC?.chromebook, 0);
  const chromebookBaik = chromebookTotal;

  const peralatanRumahTangga = FAC?.peralatanRumahTangga ?? null;

  // Rencana kegiatan fisik (sesuai Supabase)
  const rencanaRehabRK = rehabKegiatan;
  const rencanaBangunRKB = pembangunanKegiatan;
  const rencanaRehabToilet = num(kf.rehabToilet, 0);
  const rencanaBangunToilet = num(kf.pembangunanToilet, 0);

  // =====================
  // III. Siswa + ABK
  // =====================
  const siswaObj = isObj(META?.siswa) ? META.siswa : createMetaTemplate().siswa;
  const abkObj = isObj(META?.siswaAbk) ? META.siswaAbk : createMetaTemplate().siswaAbk;

  const sumSiswa = useMemo(() => sumSiswaLP(siswaObj), [siswaObj]);
  const sumAbk = useMemo(() => sumSiswaLP(abkObj), [abkObj]);

  // fallback bila total 0 (kalau Anda punya kolom agregat lain)
  const siswaL_db = num(schoolData?.st_male, 0);
  const siswaP_db = num(schoolData?.st_female, 0);

  const siswaL = sumSiswa.l > 0 ? sumSiswa.l : siswaL_db;
  const siswaP = sumSiswa.p > 0 ? sumSiswa.p : siswaP_db;
  const totalSiswa = siswaL + siswaP > 0 ? siswaL + siswaP : num(schoolData?.student_count, 0);

  const rincianSiswaRows = useMemo(() => buildSiswaRows(siswaObj, ""), [siswaObj]);
  const rincianAbkRows = useMemo(() => buildSiswaRows(abkObj, "ABK "), [abkObj]);

  const abkL = sumAbk.l;
  const abkP = sumAbk.p;

  // =====================
  // IV. Rombel
  // =====================
  const rombelObj = isObj(META?.rombel) ? META.rombel : createMetaTemplate().rombel;
  const rombelRows = useMemo(() => buildRombelRows(rombelObj), [rombelObj]);
  const totalRombel = useMemo(() => sumRombelTotal(rombelObj), [rombelObj]);

  // =====================
  // V. Lulusan / Melanjutkan (sesuai Supabase)
  // =====================
  const lulA = isObj(META?.lulusanPaketA) ? META.lulusanPaketA : createMetaTemplate().lulusanPaketA;
  const lulB = isObj(META?.lulusanPaketB) ? META.lulusanPaketB : createMetaTemplate().lulusanPaketB;
  const lulC = isObj(META?.lulusanPaketC) ? META.lulusanPaketC : createMetaTemplate().lulusanPaketC;

  // =====================
  // VI. Kelembagaan + VII. Guru
  // =====================
  const KELEM = isObj(META?.kelembagaan) ? META.kelembagaan : createMetaTemplate().kelembagaan;
  const kelembagaanBlocks = renderKelembagaan(KELEM);

  const guruMeta = isObj(META?.guru) ? META.guru : createMetaTemplate().guru;
  const gPns = num(guruMeta.pns, 0);
  const gPppk = num(guruMeta.pppk, 0);
  const gPppkPt = num(guruMeta.pppkParuhWaktu, 0);
  const gNonDap = num(guruMeta.nonAsnDapodik, 0);
  const gNonNo = num(guruMeta.nonAsnTidakDapodik, 0);
  const kekuranganGuru = num(guruMeta.kekuranganGuru, 0);

  const totalGuruFromParts = gPns + gPppk + gPppkPt + gNonDap + gNonNo;
  const totalGuru = num(guruMeta.jumlahGuru, 0) > 0 ? num(guruMeta.jumlahGuru, 0) : totalGuruFromParts;

  const showPrasarana = true;

  return (
    <div className={styles.container}>
      {/* ===================== I. IDENTITAS ===================== */}
      <div className={styles.header}>
        <h1 className={styles.schoolName}>{nama}</h1>

        <div className={styles.schoolInfo}>
          <div className={styles.infoRow}>
            <span className={styles.label}>Jenjang</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{jenjang}</span>
          </div>

          {statusSekolah ? (
            <div className={styles.infoRow}>
              <span className={styles.label}>Status</span>
              <span className={styles.colon}>:</span>
              <span className={styles.value}>{statusSekolah}</span>
            </div>
          ) : null}

          <div className={styles.infoRow}>
            <span className={styles.label}>NPSN</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{npsn}</span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.label}>Alamat</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{address}</span>
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
            <span className={styles.label}>Jumlah Peserta Didik (Total)</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{totalSiswa}</span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.label}>Latitude</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{latVal == null ? "-" : latVal}</span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.label}>Longitude</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{lngVal == null ? "-" : lngVal}</span>
          </div>
        </div>

        <button onClick={handleLocationClick} className={styles.locationButton}>
          📍 Lihat Lokasi di Google Maps
        </button>
      </div>

      {/* ===================== II. KONDISI PRASARANA ===================== */}
      {showPrasarana && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>II. Kondisi Prasarana</h2>

          {showRKB && (
            <div className={styles.card}>
              <h3 className={styles.subsectionTitle}>Ruang Kelas & Intervensi (RKB)</h3>

              {/* ======== BAR CHART LAMA (JANGAN DIUBAH) ======== */}
              <div className={styles.chartContainer}>
                <div className={styles.chart}>
                  <div className={styles.barContainer}>
                    <div className={`${styles.bar} ${styles.barRed}`} style={{ height: calculateHeight(rusakBerat) }}>
                      <span className={styles.barLabel}>{rusakBerat}</span>
                    </div>
                    <span className={styles.barText}>Ruang Kelas Rusak Berat</span>
                  </div>

                  <div className={styles.barContainer}>
                    <div className={`${styles.bar} ${styles.barYellow}`} style={{ height: calculateHeight(rusakSedang) }}>
                      <span className={styles.barLabel}>{rusakSedang}</span>
                    </div>
                    <span className={styles.barText}>Ruang Kelas Rusak Sedang</span>
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
              {/* ======== END BAR CHART LAMA ======== */}

              <div className={styles.subsection}>
                <h4 className={styles.subsectionTitle}>Kondisi Ruang Kelas (Lengkap)</h4>
                <div className={styles.dataRow}>
                  <span>Jumlah total ruang kelas: {kelasTotal}</span>
                </div>
                <div className={styles.dataRow}>
                  <span>Kondisi Baik: {kelasBaik}</span>
                </div>
                <div className={styles.dataRow}>
                  <span>Rusak Ringan: {kelasRingan}</span>
                </div>
                <div className={styles.dataRow}>
                  <span>Rusak Sedang: {rusakSedang}</span>
                </div>
                <div className={styles.dataRow}>
                  <span>Rusak Berat: {rusakBerat}</span>
                </div>
                <div className={styles.dataRow}>
                  <span>Rusak Total: {kelasTotalRusak}</span>
                </div>
              </div>

              <div className={styles.subsection}>
                <h4 className={styles.subsectionTitle}>Kebutuhan & Lahan</h4>
                <div className={styles.dataRow}>
                  <span>Kekurangan Ruang Kelas Baru (RKB): {kurangRkb}</span>
                </div>
                <div className={styles.dataRow}>
                  <span>Kelebihan kelas: {kelebihanKelas}</span>
                </div>
                <div className={styles.dataRow}>
                  <span>Ruang Kelas Tambahan: {kelasTambahan}</span>
                </div>
                <div className={styles.dataRow}>
                  <span>Ketersediaan lahan pembangunan: {boolOrDash(lahanTersedia)}</span>
                </div>
              </div>
            </div>
          )}

          <div className={styles.card}>
            <h3 className={styles.subsectionTitle}>Data Fisik Bangunan Sekolah</h3>
            <div className={styles.dataRow}>
              <span>Luas Tanah: {safeText(luasTanah, "0")} m²</span>
            </div>
            <div className={styles.dataRow}>
              <span>Luas Bangunan: {safeText(luasBangunan, "0")} m²</span>
            </div>
            <div className={styles.dataRow}>
              <span>Luas Halaman: {safeText(luasHalaman, "0")} m²</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Gedung: {num(jumlahGedung, 0)}</span>
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.subsectionTitle}>Toilet (Ringkasan)</h3>
            <div className={styles.dataRow}>
              <span>Jumlah Toilet (Total): {toiletTotal}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {toiletGood}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Ringan: {toiletLight}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {toiletMod}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {toiletHeavy}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Total: {toiletTotalRusak}</span>
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.subsectionTitle}>Ruang Penunjang & Laboratorium</h3>

            <div className={styles.subsection}>
              <h4 className={styles.subsectionTitle}>Perpustakaan</h4>
              <div className={styles.dataRow}>
                <span>Jumlah Perpustakaan (Total): {roomPerpus.total}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Kondisi Baik: {roomPerpus.good}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Ringan: {roomPerpus.rusakRingan}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Sedang: {roomPerpus.moderate_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Berat: {roomPerpus.heavy_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Total: {roomPerpus.rusakTotal}</span>
              </div>
            </div>

            <div className={styles.subsection}>
              <h4 className={styles.subsectionTitle}>Laboratorium (Umum)</h4>
              <div className={styles.dataRow}>
                <span>Jumlah Laboratorium (Total): {roomLab.total}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Kondisi Baik: {roomLab.good}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Ringan: {roomLab.rusakRingan}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Sedang: {roomLab.moderate_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Berat: {roomLab.heavy_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Total: {roomLab.rusakTotal}</span>
              </div>
            </div>

            <div className={styles.subsection}>
              <h4 className={styles.subsectionTitle}>Ruang Guru</h4>
              <div className={styles.dataRow}>
                <span>Jumlah Ruang Guru (Total): {roomGuru.total}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Kondisi Baik: {roomGuru.good}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Ringan: {roomGuru.rusakRingan}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Sedang: {roomGuru.moderate_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Berat: {roomGuru.heavy_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Total: {roomGuru.rusakTotal}</span>
              </div>
            </div>

            <div className={styles.subsection}>
              <h4 className={styles.subsectionTitle}>Ruang Kepala Sekolah</h4>
              <div className={styles.dataRow}>
                <span>Jumlah Ruang Kepala Sekolah (Total): {roomKS.total}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Kondisi Baik: {roomKS.good}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Ringan: {roomKS.rusakRingan}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Sedang: {roomKS.moderate_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Berat: {roomKS.heavy_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Total: {roomKS.rusakTotal}</span>
              </div>
            </div>

            <div className={styles.subsection}>
              <h4 className={styles.subsectionTitle}>Ruang TU</h4>
              <div className={styles.dataRow}>
                <span>Jumlah Ruang TU (Total): {roomTU.total}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Kondisi Baik: {roomTU.good}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Ringan: {roomTU.rusakRingan}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Sedang: {roomTU.moderate_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Berat: {roomTU.heavy_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Total: {roomTU.rusakTotal}</span>
              </div>
            </div>

            <div className={styles.subsection}>
              <h4 className={styles.subsectionTitle}>UKS</h4>
              <div className={styles.dataRow}>
                <span>Jumlah Ruang UKS (Total): {roomUKS.total}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Kondisi Baik: {roomUKS.good}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Ringan: {roomUKS.rusakRingan}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Sedang: {roomUKS.moderate_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Berat: {roomUKS.heavy_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Total: {roomUKS.rusakTotal}</span>
              </div>
            </div>

            <div className={styles.subsection}>
              <h4 className={styles.subsectionTitle}>Toilet Umum</h4>
              <div className={styles.dataRow}>
                <span>Jumlah Toilet Umum (Total): {roomToiletUmum.total}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Kondisi Baik: {roomToiletUmum.good}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Ringan: {roomToiletUmum.rusakRingan}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Sedang: {roomToiletUmum.moderate_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Berat: {roomToiletUmum.heavy_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Total: {roomToiletUmum.rusakTotal}</span>
              </div>
            </div>

            <div className={styles.subsection}>
              <h4 className={styles.subsectionTitle}>Rumah Dinas</h4>
              <div className={styles.dataRow}>
                <span>Jumlah Rumah Dinas (Total): {roomRumahDinas.total}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Kondisi Baik: {roomRumahDinas.good}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Ringan: {roomRumahDinas.rusakRingan}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Sedang: {roomRumahDinas.moderate_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Berat: {roomRumahDinas.heavy_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Total: {roomRumahDinas.rusakTotal}</span>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.subsectionTitle}>Mebeulair & Peralatan Teknologi</h3>

            <div className={styles.subsection}>
              <h4 className={styles.subsectionTitle}>Meja</h4>
              <div className={styles.dataRow}>
                <span>Jumlah Meja (Total): {mejaBR.total}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Kondisi Baik: {mejaBR.baik}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Kondisi Rusak: {mejaBR.rusak}</span>
              </div>
            </div>

            <div className={styles.subsection}>
              <h4 className={styles.subsectionTitle}>Kursi</h4>
              <div className={styles.dataRow}>
                <span>Jumlah Kursi (Total): {kursiBR.total}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Kondisi Baik: {kursiBR.baik}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Kondisi Rusak: {kursiBR.rusak}</span>
              </div>
            </div>

            <div className={styles.subsection}>
              <h4 className={styles.subsectionTitle}>Papan Tulis (Whiteboard)</h4>
              <div className={styles.dataRow}>
                <span>Jumlah Papan Tulis (Total): {papanBR.total}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Kondisi Baik: {papanBR.baik}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Kondisi Rusak: {papanBR.rusak}</span>
              </div>
            </div>

            <div className={styles.subsection}>
              <h4 className={styles.subsectionTitle}>Komputer/Laptop</h4>
              <div className={styles.dataRow}>
                <span>Jumlah Komputer/Laptop (Total): {komputerTotal}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Kondisi Baik: {komputerBaik}</span>
              </div>
            </div>

            <div className={styles.subsection}>
              <h4 className={styles.subsectionTitle}>Chromebook</h4>
              <div className={styles.dataRow}>
                <span>Jumlah Chromebook (Total): {chromebookTotal}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Kondisi Baik: {chromebookBaik}</span>
              </div>
            </div>

            <div className={styles.subsection}>
              <h4 className={styles.subsectionTitle}>Kondisi Peralatan Rumah Tangga</h4>
              <div className={styles.dataRow}>
                <span>Kondisi: {pvOrDash(peralatanRumahTangga)}</span>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.subsectionTitle}>Rencana Kegiatan Fisik</h3>
            <div className={styles.dataRow}>
              <span>Rehabilitasi ruang kelas: {rencanaRehabRK}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Pembangunan RKB: {rencanaBangunRKB}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rehabilitasi toilet: {rencanaRehabToilet}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Pembangunan toilet: {rencanaBangunToilet}</span>
            </div>
          </div>
        </div>
      )}

      {/* ===================== III. SISWA ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>III. Data Peserta Didik</h2>
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

            <div className={styles.subsection}>
              <h4 className={styles.subsectionTitle}>Rincian per Paket/Kelas</h4>
              {rincianSiswaRows.map((r) => (
                <div className={styles.dataRow} key={`reg-${r.label}`}>
                  <span>
                    {r.label}: {r.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Peserta Didik Berkebutuhan Khusus (ABK)</h3>
            <div className={styles.dataRow}>
              <span>ABK Laki-Laki (Total): {abkL}</span>
            </div>
            <div className={styles.dataRow}>
              <span>ABK Perempuan (Total): {abkP}</span>
            </div>

            <div className={styles.subsection}>
              <h4 className={styles.subsectionTitle}>Rincian ABK per Paket/Kelas</h4>
              {rincianAbkRows.map((r) => (
                <div className={styles.dataRow} key={`abk-${r.label}`}>
                  <span>
                    {r.label}: {r.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===================== IV. ROMBEL ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>IV. Rombongan Belajar (Rombel)</h2>
        <div className={styles.card}>
          {rombelRows.map((r) => (
            <div className={styles.dataRow} key={r.label}>
              <span>
                {r.label}: {r.value}
              </span>
            </div>
          ))}
          <div className={styles.dataRow}>
            <span>Jumlah Rombel (Total): {totalRombel}</span>
          </div>
        </div>
      </div>

      {/* ===================== V. LULUSAN / MELANJUTKAN (PKBM) ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>V. Data Lulusan / Melanjutkan (PKBM)</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Paket A (Lulusan)</h3>
            <div className={styles.dataRow}>
              <span>Lanjut ke SMP: {num(lulA.smp, 0)}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Lanjut ke MTs: {num(lulA.mts, 0)}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Lanjut ke Pontren: {num(lulA.pontren, 0)}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Lanjut ke Paket B: {num(lulA.paketB, 0)}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Paket B (Lulusan)</h3>
            <div className={styles.dataRow}>
              <span>Lanjut ke SMA: {num(lulB.sma, 0)}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Lanjut ke SMK: {num(lulB.smk, 0)}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Lanjut ke MA: {num(lulB.ma, 0)}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Lanjut ke Pontren: {num(lulB.pontren, 0)}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Lanjut ke Paket C: {num(lulB.paketC, 0)}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Paket C (Lulusan)</h3>
            <div className={styles.dataRow}>
              <span>Lanjut ke Perguruan Tinggi: {num(lulC.pt, 0)}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Bekerja: {num(lulC.bekerja, 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== VI. KELEMBAGAAN ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>VI. Kelembagaan</h2>
        <div className={styles.card}>{kelembagaanBlocks}</div>
      </div>

      {/* ===================== VII. DATA GURU ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>VII. Data Guru</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Guru PNS: {gPns}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Guru PPPK: {gPppk}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Guru PPPK Paruh Waktu: {gPppkPt}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Guru Non-ASN (Dapodik): {gNonDap}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Guru Non-ASN (Tidak Dapodik): {gNonNo}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Guru (Total): {totalGuru}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kekurangan Guru: {kekuranganGuru}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolDetailPkbm;
