// src/components/schools/SchoolDetail/Paud/SchoolDetailPaud.jsx
import React, { useEffect, useMemo, useState } from "react";
import styles from "./SchoolDetailPaud.module.css";
/* =========================================================
   UTIL DASAR
========================================================= */
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

const getData = (data, path, def = undefined) => {
  const v = path.reduce((o, k) => (o && o[k] != null ? o[k] : undefined), data);
  if (v === 0 || v === 0.0) return 0;
  return v !== undefined && v !== null && v !== "" ? v : def;
};

const num = (v, d = 0) => {
  if (v === true) return 1;
  if (v === false) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const safeText = (v, fallback = "-") => {
  if (v === null || v === undefined || v === "") return fallback;
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "Ya" : "Tidak";
  if (Array.isArray(v)) {
    const parts = v.map((x) => safeText(x, "")).filter(Boolean);
    return parts.length ? parts.join(", ") : fallback;
  }
  if (isObj(v)) {
    // object khusus area bermain / tersedia-tidak tersedia
    if ("available" in v || "n_available" in v) {
      const a = num(v.available, NaN);
      const na = num(v.n_available, NaN);
      const parts = [];
      if (Number.isFinite(a)) parts.push(`Tersedia ${a}`);
      if (Number.isFinite(na)) parts.push(`Tidak tersedia ${na}`);
      return parts.length ? parts.join(", ") : fallback;
    }
    try {
      const s = JSON.stringify(v);
      return s && s !== "{}" ? s : fallback;
    } catch {
      return fallback;
    }
  }
  try {
    return String(v);
  } catch {
    return fallback;
  }
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

const pickFirst = (root, paths = [], def = undefined) => {
  for (const p of paths) {
    const v = getData(root, p, undefined);
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return def;
};

// ===================== NORMALIZER KEY (Regex fleksibel) =====================
const _normKey = (k) =>
  String(k ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "");

const _inferGenderLP = (rawKey) => {
  const s = String(rawKey ?? "").toLowerCase();
  // prioritas: token terpisah / suffix umum
  if (/(^|[_\-\s])(l|lk)([_\-\s]|$)/.test(s)) return "l";
  if (/(^|[_\-\s])(p|pr)([_\-\s]|$)/.test(s)) return "p";
  if (/lakilaki|laki/.test(s)) return "l";
  if (/perempuan/.test(s)) return "p";

  const ns = _normKey(rawKey);
  // suffix digit + l/p (mis: tka1l, tkbl, kbp)
  if (/(?:\d+)?l$/.test(ns)) return "l";
  if (/(?:\d+)?p$/.test(ns)) return "p";
  return null;
};

const _inferLayananPaud = (rawKey) => {
  const nk0 = _normKey(rawKey);
  // buang suffix gender umum supaya "tkal" tidak dianggap bagian layanan
  const nk = nk0.replace(/(lakilaki|laki|perempuan|pr|lk|l|p)$/, "");

  // urutan penting agar "tkb" tidak ketangkap "kb"
  if (nk.includes("tka") || nk.includes("tka")) return "tk_a";
  if (nk.includes("tkb") || nk.includes("tkb")) return "tk_b";
  if (nk.includes("spstpa") || nk.includes("sps") || nk.includes("tpa")) return "sps_tpa";
  // kb harus terakhir (karena tkb mengandung "kb")
  if (nk === "kb" || nk.includes("kelompokbermain") || nk.includes("kelompok") || nk.includes("kb")) return "kb";

  return null;
};

const _scanFlatLP = (obj, out) => {
  if (!isObj(obj)) return out;
  for (const [k, v] of Object.entries(obj)) {
    const layanan = _inferLayananPaud(k);
    if (!layanan) continue;

    // hanya untuk yang benar-benar LP (ada gender)
    const g = _inferGenderLP(k);
    if (!g) continue;

    out[layanan][g] = (out[layanan][g] ?? 0) + num(v, 0);
  }
  return out;
};

const _scanFlatABK = (obj, out) => {
  if (!isObj(obj)) return out;
  for (const [k, v] of Object.entries(obj)) {
    const nk = _normKey(k);
    if (!nk.includes("abk")) continue;

    const layanan = _inferLayananPaud(k);
    if (!layanan) continue;

    // ABK bisa angka atau {l,p,total}
    if (isObj(v)) {
      const total = num(v.total ?? (num(v.l, 0) + num(v.p, 0)), 0);
      out[layanan] = out[layanan] + total;
    } else {
      out[layanan] = out[layanan] + num(v, 0);
    }
  }
  return out;
};

const _scanFlatRombel = (obj, out) => {
  if (!isObj(obj)) return out;
  for (const [k, v] of Object.entries(obj)) {
    const nk = _normKey(k);
    if (!nk.includes("rombel") && !nk.includes("rombonganbelajar")) continue;

    const layanan = _inferLayananPaud(k);
    if (!layanan) continue;

    out[layanan] = out[layanan] + num(v, 0);
  }
  return out;
};

/* =========================================================
   ✅ TEMPLATE OUTPUT PAUD/TK (SESUAI INPUT ANDA)
========================================================= */
const lp0 = () => ({ l: 0, p: 0 });

const kondisi5_0 = () => ({
  baik: 0,
  rusak_ringan: 0,
  rusak_sedang: 0,
  rusak_berat: 0,
  rusak_total: 0,
  total: 0,
});

const baikRusak0 = () => ({
  baik: 0,
  rusak: 0,
  total: 0,
});

const ruangItem0 = () => ({
  jumlah: 0,
  kondisi: kondisi5_0(),
});

const createPaudOutputTemplate = () => ({
  identitasLokasi: {
    namaSekolah: "",
    npsn: "",
    statusSekolah: "",
    kecamatan: "",
    desa: "",
    alamat: "",
    lat: null,
    lng: null,
  },

  siswaRombel: {
    siswa: {
      tk_a: lp0(),
      tk_b: lp0(),
      kb: lp0(),
      sps_tpa: lp0(),
    },
    abk_per_layanan: {
      tk_a: 0,
      tk_b: 0,
      kb: 0,
      sps_tpa: 0,
    },
    rombel: {
      tk_a: 0,
      tk_b: 0,
      kb: 0,
      sps_tpa: 0,
      total: 0,
    },
  },

  ptk: {
    guru_pns: 0,
    guru_pppk: 0,
    guru_pppk_paruh_waktu: 0,
    guru_non_asn_dapodik: 0,
    guru_non_asn_tidak_dapodik: 0,
    kekurangan_guru: 0,
  },

  sarpras: {
    ukuranBangunan: {
      luas_tanah_m2: null,
      luas_bangunan_m2: null,
      luas_halaman_m2: null,
      jumlah_gedung: 0,
    },

    ruangKelas: {
      jumlah_total: 0,
      kondisi: kondisi5_0(),
      kebutuhan: {
        kekurangan_rkb: 0,
        kelebihan_kelas: 0,
        ruang_kelas_tambahan: 0,
      },
      lahan_tersedia: null, // boolean/Ya-Tidak
    },

    ruangPenunjang: {
      perpustakaan: ruangItem0(),
      lab_umum: ruangItem0(),
      ruang_guru: ruangItem0(),
      ruang_kepala_sekolah: ruangItem0(),
      ruang_tu: ruangItem0(),
      ruang_uks: ruangItem0(),
      toilet_umum: ruangItem0(),
      rumah_dinas: ruangItem0(),
      ape: ruangItem0(), // APE khusus PAUD/TK
    },

    perabotDanAlat: {
      meja: baikRusak0(),
      kursi: baikRusak0(),
      papan_tulis: baikRusak0(),
      komputer: 0,
      chromebook: 0,
      kondisi_peralatan_rumah_tangga: null, // Tidak memiliki/baik/harus diganti/perlu rehabilitasi
    },

    rencanaKegiatanFisik: {
      rehab_ruang_kelas: 0,
      pembangunan_rkb: 0,
      rehab_toilet: 0,
      pembangunan_toilet: 0,
    },
  },

  kelembagaan: {
    administrasi: {
      pembinaan: null,
      asesmen: null,
    },
    status_penyelenggaraan: {
      menyelenggarakan_belajar: null,
      melaksanakan_rekomendasi: null,
      siap_dievaluasi: null,
    },
    bop: {
      pengelola_ada: null,
      jumlah_tenaga_peningkatan: null,
    },
    perizinan: {
      pengendalian: null,
      kelayakan: null,
    },
    kurikulum: {
      silabus: null,
      kompetensi_dasar: null,
    },
  },

  lulusanMelanjutkan: {
    lanjut_ke_sd: { dalam_kab: 0, luar_kab: 0 },
    lanjut_ke_mi: { dalam_kab: 0, luar_kab: 0 },
  },
});

/* =========================================================
   NORMALIZER: KONVERSI BERBAGAI SUMBER DATA KE OUTPUT TEMPLATE
========================================================= */
const normalizeKondisi5 = (src) => {
  const o = isObj(src) ? src : {};
  const baik = num(o.baik ?? o.good, 0);
  const rusak_ringan = num(o.rusak_ringan ?? o.light_damage ?? o.minor_damage ?? o.rusakRingan, 0);
  const rusak_sedang = num(o.rusak_sedang ?? o.moderate_damage ?? o.rusakSedang, 0);
  const rusak_berat = num(o.rusak_berat ?? o.heavy_damage ?? o.rusakBerat, 0);
  const rusak_total = num(o.rusak_total ?? o.total_damage ?? o.rusakTotal, 0);
  const total =
    num(o.total ?? o.total_all, NaN) ||
    (baik + rusak_ringan + rusak_sedang + rusak_berat + rusak_total);

  return { baik, rusak_ringan, rusak_sedang, rusak_berat, rusak_total, total };
};

const normalizeBaikRusak = (src) => {
  const o = isObj(src) ? src : {};
  const baik = num(o.baik ?? o.good, 0);
  const rusak = num(o.rusak ?? o.broken, 0);
  const total = num(o.total ?? o.total_all, baik + rusak);
  return { baik, rusak, total };
};

const normalizeRuangItem = (src) => {
  const o = isObj(src) ? src : {};
  const kondisi = normalizeKondisi5(o.kondisi ?? o.condition ?? o);
  const jumlah = num(o.jumlah ?? o.count ?? o.total ?? o.total_all, kondisi.total);
  return { jumlah, kondisi };
};

const readPaudServicesLP = (meta) => {
  // sumber yang mungkin:
  // - meta.siswa (kunci: tk_a, tk_b, kb, sps_tpa) => {l,p}
  // - meta.students.services (kunci serupa) => {male/female}
  // - fallback "label datar" (regex fleksibel) di root meta / folder lain
  const out = {
    tk_a: lp0(),
    tk_b: lp0(),
    kb: lp0(),
    sps_tpa: lp0(),
  };

  const siswa1 = isObj(meta?.siswa) ? meta.siswa : null;
  const siswa2 = isObj(meta?.students?.services) ? meta.students.services : null;

  const pullLP = (obj, key) => {
    const row = isObj(obj?.[key]) ? obj[key] : {};
    const l = num(row.l ?? row.male ?? row.lk ?? row.laki ?? row.laki_laki, 0);
    const p = num(row.p ?? row.female ?? row.pr ?? row.perempuan, 0);
    return { l, p };
  };

  if (siswa1) {
    out.tk_a = pullLP(siswa1, "tk_a");
    out.tk_b = pullLP(siswa1, "tk_b");
    out.kb = pullLP(siswa1, "kb");
    out.sps_tpa = pullLP(siswa1, "sps_tpa");
  } else if (siswa2) {
    out.tk_a = pullLP(siswa2, "tk_a");
    out.tk_b = pullLP(siswa2, "tk_b");
    out.kb = pullLP(siswa2, "kb");
    out.sps_tpa = pullLP(siswa2, "sps_tpa");
  } else {
    // fallback: label datar (mis: tka_L / tk_a_p / kb_l / sps_tpa_p / dll)
    _scanFlatLP(meta, out);
    _scanFlatLP(meta?.students, out);
    _scanFlatLP(meta?.students?.services, out);
  }

  return out;
};

const readPaudAbkPerLayanan = (meta) => {
  // ABK per layanan (sesuai spek: tidak wajib dipisah L/P)
  // sumber yang mungkin:
  // - meta.siswaAbk.{tk_a/tk_b/kb/sps_tpa} => angka atau {l,p}
  // - meta.students.abk.services => angka
  // - fallback "label datar" yang memuat token "abk" (mis: abk_tka, abk_tk_a, dll)
  const out = { tk_a: 0, tk_b: 0, kb: 0, sps_tpa: 0 };

  const abk1 = isObj(meta?.siswaAbk) ? meta.siswaAbk : null;
  const abk2 = isObj(meta?.students?.abk?.services) ? meta.students.abk.services : null;

  const pullABK = (obj, key) => {
    const v = obj?.[key];
    if (isObj(v)) return num(v.total ?? (num(v.l, 0) + num(v.p, 0)), 0);
    return num(v, 0);
  };

  if (abk1) {
    out.tk_a = pullABK(abk1, "tk_a");
    out.tk_b = pullABK(abk1, "tk_b");
    out.kb = pullABK(abk1, "kb");
    out.sps_tpa = pullABK(abk1, "sps_tpa");
  } else if (abk2) {
    out.tk_a = pullABK(abk2, "tk_a");
    out.tk_b = pullABK(abk2, "tk_b");
    out.kb = pullABK(abk2, "kb");
    out.sps_tpa = pullABK(abk2, "sps_tpa");
  } else {
    _scanFlatABK(meta, out);
    _scanFlatABK(meta?.students, out);
  }

  return out;
};

const readPaudRombel = (meta) => {
  // sumber yang mungkin:
  // - meta.rombel.{tk_a,tk_b,kb,sps_tpa,total}
  // - meta.rombels atau meta.students.rombels (variasi)
  // - fallback "label datar" (mis: rombel_tka, rombel_tk_a, dll)
  const out = { tk_a: 0, tk_b: 0, kb: 0, sps_tpa: 0, total: 0 };

  const r1 = isObj(meta?.rombel) ? meta.rombel : null;
  const r2 = isObj(meta?.rombels) ? meta.rombels : null;

  const pull = (obj, key) => num(obj?.[key], 0);

  const src = r1 || r2;
  if (src) {
    out.tk_a = pull(src, "tk_a");
    out.tk_b = pull(src, "tk_b");
    out.kb = pull(src, "kb");
    out.sps_tpa = pull(src, "sps_tpa");
    out.total = pull(src, "total") || (out.tk_a + out.tk_b + out.kb + out.sps_tpa);
  } else {
    // fallback: label datar
    _scanFlatRombel(meta, out);
    _scanFlatRombel(meta?.students, out);

    out.total = out.tk_a + out.tk_b + out.kb + out.sps_tpa;
  }

  return out;
};

const readPTK = (meta, schoolData) => {
  // sumber utama: meta.guru (yang Anda pakai di sistem)
  // fallback: meta.teachers
  const g1 = isObj(meta?.guru) ? meta.guru : null;
  const g2 = isObj(meta?.teachers) ? meta.teachers : null;
  const g = g1 || g2 || {};

  return {
    guru_pns: num(g.pns ?? g.guru_pns ?? g.pns_guru, 0),
    guru_pppk: num(g.pppk ?? g.guru_pppk, 0),
    guru_pppk_paruh_waktu: num(g.pppkParuhWaktu ?? g.pppk_paruh_waktu ?? g.guru_pppk_paruh_waktu, 0),
    guru_non_asn_dapodik: num(g.nonAsnDapodik ?? g.non_asn_dapodik ?? g.guru_non_asn_dapodik, 0),
    guru_non_asn_tidak_dapodik: num(g.nonAsnTidakDapodik ?? g.non_asn_tidak_dapodik ?? g.guru_non_asn_tidak_dapodik, 0),
    kekurangan_guru: num(g.kekuranganGuru ?? g.kekurangan_guru, 0),
  };
};

const readSarpras = (meta, schoolData) => {
  // sumber yang mungkin:
  // - meta.prasarana (punya Anda)
  // - schoolData.facilities (punya Anda)
  // ✅ FIX KATEGORI IV: luas_tanah & luas_bangunan ada di root meta
  // ✅ FIX KATEGORI XV: kegiatanFisik.rehab_unit & kegiatanFisik.pembangunan_unit
  const pr1 = isObj(meta?.prasarana) ? meta.prasarana : {};
  const fac = isObj(schoolData?.facilities) ? schoolData.facilities : {};

  const ukuran = isObj(pr1?.ukuran) ? pr1.ukuran : isObj(fac?.ukuran) ? fac.ukuran : {};
  const gedungJumlah = num(
    pickFirst(pr1, [["gedung", "jumlah"]], undefined),
    num(pickFirst(fac, [["building_count"]], 0), 0)
  );

  // ruang kelas (total, kondisi, kebutuhan, lahan)
  const rk = isObj(pr1?.ruangKelas) ? pr1.ruangKelas : isObj(pr1?.classrooms) ? pr1.classrooms : {};
  const rk2 = isObj(fac?.classrooms) ? fac.classrooms : {};

  const ruangKelasJumlahTotal = num(
    rk.jumlah_total ?? rk.total ?? rk.total_room ?? rk.totalRoom,
    num(rk2.total ?? rk2.total_room ?? 0, 0)
  );

  const ruangKelasKondisi = normalizeKondisi5(rk.kondisi ?? rk.condition ?? rk);
  const ruangKelasKondisi2 = normalizeKondisi5(rk2.kondisi ?? rk2.condition ?? rk2);

  // gabungkan kondisi yang paling besar per field
  const mergeMaxKondisi = (a, b) => ({
    baik: Math.max(num(a.baik, 0), num(b.baik, 0)),
    rusak_ringan: Math.max(num(a.rusak_ringan, 0), num(b.rusak_ringan, 0)),
    rusak_sedang: Math.max(num(a.rusak_sedang, 0), num(b.rusak_sedang, 0)),
    rusak_berat: Math.max(num(a.rusak_berat, 0), num(b.rusak_berat, 0)),
    rusak_total: Math.max(num(a.rusak_total, 0), num(b.rusak_total, 0)),
    total: Math.max(num(a.total, 0), num(b.total, 0)),
  });

  const ruangKelasKondisiMerged = mergeMaxKondisi(ruangKelasKondisi, ruangKelasKondisi2);

  const kebutuhan = isObj(rk.kebutuhan) ? rk.kebutuhan : {};
  const kebutuhan2 = isObj(rk2.kebutuhan) ? rk2.kebutuhan : {};

  const lahan = rk.lahan_tersedia ?? rk.lahan ?? rk.land_available ?? rk2.land_available ?? rk2.lahan ?? null;

  // ruang penunjang
  const rooms = isObj(pr1?.rooms) ? pr1.rooms : {};
  const rooms2 = isObj(fac?.rooms) ? fac.rooms : {};

  // APE khusus PAUD/TK
  const ape = rooms.ape ?? rooms2.ape ?? pr1.ape ?? fac.ape ?? null;

  const ruangPenunjang = {
    perpustakaan: normalizeRuangItem(rooms.library ?? rooms.perpustakaan ?? rooms2.library ?? rooms2.perpustakaan),
    lab_umum: normalizeRuangItem(rooms.lab_umum ?? rooms.lab ?? rooms2.lab_umum ?? rooms2.lab),
    ruang_guru: normalizeRuangItem(rooms.teacher_room ?? rooms.ruang_guru ?? rooms2.teacher_room ?? rooms2.ruang_guru),
    ruang_kepala_sekolah: normalizeRuangItem(
      rooms.headmaster_room ??
        rooms.principal_room ??
        rooms.ruang_kepala ??
        rooms2.headmaster_room ??
        rooms2.ruang_kepala
    ),
    ruang_tu: normalizeRuangItem(rooms.tu_room ?? rooms.ruang_tu ?? rooms2.tu_room ?? rooms2.ruang_tu),
    ruang_uks: normalizeRuangItem(rooms.uks_room ?? rooms.ukS ?? rooms.ruang_uks ?? rooms2.uks_room ?? rooms2.ruang_uks),
    toilet_umum: normalizeRuangItem(rooms.toilets ?? rooms.toilet_umum ?? rooms2.toilets ?? rooms2.toilet_umum),
    rumah_dinas: normalizeRuangItem(
      rooms.official_residences ?? rooms.rumah_dinas ?? rooms2.official_residences ?? rooms2.rumah_dinas
    ),
    ape: normalizeRuangItem(ape),
  };

  // perabot & alat
  const furniture = isObj(pr1?.furniture) ? pr1.furniture : {};
  const furniture2 = isObj(fac?.furniture) ? fac.furniture : {};
  const mebeulair = isObj(pr1?.mebeulair) ? pr1.mebeulair : {};

  const meja = normalizeBaikRusak(
    furniture.tables ??
      furniture.meja ??
      furniture2.tables ??
      furniture2.meja ??
      mebeulair.tables ??
      mebeulair.meja
  );
  const kursi = normalizeBaikRusak(
    furniture.chairs ??
      furniture.kursi ??
      furniture2.chairs ??
      furniture2.kursi ??
      mebeulair.chairs ??
      mebeulair.kursi
  );
  const papan = normalizeBaikRusak(
    furniture.whiteboard ??
      furniture.board ??
      furniture.papan_tulis ??
      furniture2.whiteboard ??
      furniture2.board ??
      furniture2.papan_tulis ??
      mebeulair.whiteboard ??
      mebeulair.papan_tulis
  );

  const komputer =
    num(
      furniture.computer?.total ??
        furniture.computer ??
        furniture2.computer?.total ??
        furniture2.computer ??
        mebeulair.computer,
      0
    ) || 0;

  const chromebook = num(pr1?.chromebook?.total ?? pr1?.chromebook ?? fac?.chromebook?.total ?? fac?.chromebook, 0);

  const peralatanRumahTangga =
    pr1?.peralatanRumahTangga ??
    pr1?.peralatan_rumah_tangga ??
    fac?.peralatanRumahTangga ??
    fac?.peralatan_rumah_tangga ??
    meta?.kelembagaan?.alatRumahTangga ??
    meta?.kelembagaan?.alat_rumah_tangga ??
    null;

  // ✅ rencana kegiatan fisik (fix rehab_unit & pembangunan_unit)
  const keg = isObj(meta?.kegiatanFisik)
    ? meta.kegiatanFisik
    : isObj(meta?.kegiatan_fisik)
    ? meta.kegiatan_fisik
    : {};

  const rencana = {
    rehab_ruang_kelas: num(
      keg.rehab_unit ??
        keg.rehabUnit ??
        keg.rehabRuangKelas ??
        keg.rehab_ruang_kelas ??
        keg.rehabRuang ??
        0,
      0
    ),
    pembangunan_rkb: num(
      keg.pembangunan_unit ??
        keg.pembangunanUnit ??
        keg.pembangunanRKB ??
        keg.pembangunan_rkb ??
        keg.build_rkb ??
        0,
      0
    ),
    rehab_toilet: num(keg.rehabToilet ?? keg.rehab_toilet ?? 0, 0),
    pembangunan_toilet: num(keg.pembangunanToilet ?? keg.pembangunan_toilet ?? keg.build_toilet ?? 0, 0),
  };

  // ✅ FIX luas_tanah & luas_bangunan: prioritas root meta
  const luasTanah = pickFirst(
    meta,
    [["luas_tanah"], ["luasTanah"], ["luas_tanah_m2"], ["luasTanahM2"]],
    undefined
  );
  const luasBangunan = pickFirst(
    meta,
    [["luas_bangunan"], ["luasBangunan"], ["luas_bangunan_m2"], ["luasBangunanM2"]],
    undefined
  );

  const finalLuasTanah =
    luasTanah !== undefined ? (Number.isFinite(Number(luasTanah)) ? Number(luasTanah) : luasTanah) : undefined;
  const finalLuasBangunan =
    luasBangunan !== undefined
      ? (Number.isFinite(Number(luasBangunan)) ? Number(luasBangunan) : luasBangunan)
      : undefined;

  return {
    ukuranBangunan: {
      luas_tanah_m2: finalLuasTanah ?? ukuran.tanah ?? ukuran.luas_tanah ?? null,
      luas_bangunan_m2: finalLuasBangunan ?? ukuran.bangunan ?? ukuran.luas_bangunan ?? null,
      luas_halaman_m2: ukuran.halaman ?? null,
      jumlah_gedung: gedungJumlah,
    },
    ruangKelas: {
      jumlah_total: ruangKelasJumlahTotal,
      kondisi: ruangKelasKondisiMerged,
      kebutuhan: {
        kekurangan_rkb: num(
          kebutuhan.kekurangan_rkb ?? kebutuhan.kurang_rkb ?? kebutuhan.lacking_rkb,
          num(kebutuhan2.kekurangan_rkb ?? kebutuhan2.lacking_rkb ?? 0, 0)
        ),
        kelebihan_kelas: num(kebutuhan.kelebihan_kelas ?? kebutuhan.extra_classroom ?? 0, num(kebutuhan2.kelebihan_kelas ?? 0, 0)),
        ruang_kelas_tambahan: num(
          kebutuhan.kelas_tambahan ?? kebutuhan.ruang_kelas_tambahan ?? kebutuhan.additional_classroom ?? 0,
          num(kebutuhan2.kelas_tambahan ?? 0, 0)
        ),
      },
      lahan_tersedia: lahan,
    },
    ruangPenunjang,
    perabotDanAlat: {
      meja,
      kursi,
      papan_tulis: papan,
      komputer,
      chromebook,
      kondisi_peralatan_rumah_tangga: peralatanRumahTangga,
    },
    rencanaKegiatanFisik: rencana,
  };
};

const readKelembagaan = (meta) => {
  const ke1 = isObj(meta?.kelembagaan) ? meta.kelembagaan : {};
  const ke2 = isObj(meta?.institutional) ? meta.institutional : {};

  const pembinaan = pickFirst(ke1, [["pembinaan"]], pickFirst(ke2, [["administration", "pembinaan"]], null));
  const asesmen = pickFirst(ke1, [["asesmen"]], pickFirst(ke2, [["administration", "asesmen"]], null));

  const menyelenggarakan = pickFirst(
    ke1,
    [["menyelenggarakanBelajar"]],
    pickFirst(ke2, [["delivery_status", "menyelenggarakan_belajar"]], null)
  );
  const melaksanakan = pickFirst(
    ke1,
    [["melaksanakanRekomendasi"]],
    pickFirst(ke2, [["delivery_status", "melaksanakan_rekomendasi"]], null)
  );
  const siap = pickFirst(ke1, [["siapDievaluasi"]], pickFirst(ke2, [["delivery_status", "siap_dievaluasi"]], null));

  const bop1 = isObj(ke1?.bop) ? ke1.bop : {};
  const bop2 = isObj(ke2?.bop) ? ke2.bop : {};

  const pengelola = pickFirst(bop1, [["pengelola"]], pickFirst(bop2, [["pengelola_ada"]], null));
  const tenaga = pickFirst(bop1, [["tenagaPeningkatan"]], pickFirst(bop2, [["jumlah_tenaga_peningkatan"]], null));

  const per1 = isObj(ke1?.perizinan) ? ke1.perizinan : {};
  const per2 = isObj(ke2?.perizinan) ? ke2.perizinan : {};
  const pengendalian = pickFirst(per1, [["pengendalian"]], pickFirst(per2, [["pengendalian"]], null));
  const kelayakan = pickFirst(per1, [["kelayakan"]], pickFirst(per2, [["kelayakan"]], null));

  const kur1 = isObj(ke1?.kurikulum) ? ke1.kurikulum : {};
  const kur2 = isObj(ke2?.kurikulum) ? ke2.kurikulum : {};
  const silabus = pickFirst(kur1, [["silabus"]], pickFirst(kur2, [["silabus"]], null));
  const kd = pickFirst(kur1, [["kompetensiDasar"]], pickFirst(kur2, [["kompetensi_dasar"]], null));

  return {
    administrasi: { pembinaan, asesmen },
    status_penyelenggaraan: {
      menyelenggarakan_belajar: menyelenggarakan,
      melaksanakan_rekomendasi: melaksanakan,
      siap_dievaluasi: siap,
    },
    bop: { pengelola_ada: pengelola, jumlah_tenaga_peningkatan: tenaga },
    perizinan: { pengendalian, kelayakan },
    kurikulum: { silabus, kompetensi_dasar: kd },
  };
};

const readLulusanPaud = (meta) => {
  // sumber yang mungkin:
  // - meta.lanjut.dalamKab / meta.lanjut.luarKab (dengan kunci tujuan)
  // - meta.graduates.paud (opsional)
  // ✅ FIX KATEGORI XIV: gunakan root meta: siswaLanjutDalamKab & siswaLanjutLuarKab (prioritas)
  const lanjut = isObj(meta?.lanjut) ? meta.lanjut : {};
  const grad = isObj(meta?.graduates) ? meta.graduates : {};

  const dalamKab = isObj(lanjut?.dalamKab) ? lanjut.dalamKab : {};
  const luarKab = isObj(lanjut?.luarKab) ? lanjut.luarKab : {};

  const paudGrad = isObj(grad?.paud) ? grad.paud : {};

  // SD: prioritas root meta (jika ada)
  const sdDalam = num(
    meta?.siswaLanjutDalamKab ??
      meta?.siswa_lanjut_dalam_kab ??
      meta?.siswaLanjutDalamKabupaten ??
      dalamKab.sd ??
      dalamKab.ke_sd ??
      paudGrad?.to_sd?.in ??
      paudGrad?.to_sd?.dalam ??
      0,
    0
  );

  const sdLuar = num(
    meta?.siswaLanjutLuarKab ??
      meta?.siswa_lanjut_luar_kab ??
      meta?.siswaLanjutLuarKabupaten ??
      luarKab.sd ??
      luarKab.ke_sd ??
      paudGrad?.to_sd?.out ??
      paudGrad?.to_sd?.luar ??
      0,
    0
  );

  // MI: tetap gunakan jalur lama (karena root meta yang Anda sebut tidak memisahkan MI)
  const miDalam = num(dalamKab.mi ?? dalamKab.ke_mi ?? paudGrad?.to_mi?.in ?? paudGrad?.to_mi?.dalam ?? 0, 0);
  const miLuar = num(luarKab.mi ?? luarKab.ke_mi ?? paudGrad?.to_mi?.out ?? paudGrad?.to_mi?.luar ?? 0, 0);

  return {
    lanjut_ke_sd: { dalam_kab: sdDalam, luar_kab: sdLuar },
    lanjut_ke_mi: { dalam_kab: miDalam, luar_kab: miLuar },
  };
};

/* =========================================================
   BUILD WADAH OUTPUT PAUD (final)
========================================================= */
const buildWadahPaud = (schoolData) => {
  const rawMeta = isObj(schoolData?.meta) ? schoolData.meta : {};
  const detailsMeta = isObj(schoolData?.details?.meta) ? schoolData.details.meta : {};
  const detailsAsMeta = isObj(schoolData?.details) && !isObj(schoolData?.details?.meta) ? schoolData.details : {};

  const mergedMeta = mergeDeep(rawMeta, mergeDeep(detailsAsMeta, detailsMeta));

  const base = createPaudOutputTemplate();

  // ✅ FIX KATEGORI I: koordinat prioritas dari META.location_detail.extra.latitude/longitude
  const lat = (() => {
    const vMeta = pickFirst(
      mergedMeta,
      [
        ["location_detail", "extra", "latitude"],
        ["location_detail", "extra", "lat"],
        ["location_detail", "latitude"],
        ["location_detail", "lat"],
        ["location", "latitude"],
        ["location", "lat"],
        ["latitude"],
        ["lat"],
      ],
      undefined
    );

    const v = vMeta ?? schoolData?.lat ?? schoolData?.latitude;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  })();

  const lng = (() => {
    const vMeta = pickFirst(
      mergedMeta,
      [
        ["location_detail", "extra", "longitude"],
        ["location_detail", "extra", "lng"],
        ["location_detail", "longitude"],
        ["location_detail", "lng"],
        ["location", "longitude"],
        ["location", "lng"],
        ["longitude"],
        ["lng"],
      ],
      undefined
    );

    const v = vMeta ?? schoolData?.lng ?? schoolData?.longitude;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  })();

  const identitasLokasi = {
    namaSekolah: safeText(getData(schoolData, ["name"], ""), ""),
    npsn: safeText(getData(schoolData, ["npsn"], ""), ""),
    statusSekolah: safeText(schoolData?.status ?? schoolData?.status_sekolah ?? "", ""),
    kecamatan: safeText(schoolData?.kecamatan ?? schoolData?.kecamatan_name ?? mergedMeta?.kecamatan ?? "", ""),
    desa: safeText(schoolData?.desa ?? schoolData?.village_name ?? mergedMeta?.desa ?? "", ""),
    alamat: safeText(getData(schoolData, ["address"], ""), ""),
    lat,
    lng,
  };

  // siswa & rombel
  const siswa = readPaudServicesLP(mergedMeta);
  const abk = readPaudAbkPerLayanan(mergedMeta);
  const rombel = readPaudRombel(mergedMeta);

  // PTK
  const ptk = readPTK(mergedMeta, schoolData);

  // Sarpras
  const sarpras = readSarpras(mergedMeta, schoolData);

  // Kelembagaan
  const kelembagaan = readKelembagaan(mergedMeta);

  // Lulusan
  const lulusanMelanjutkan = readLulusanPaud(mergedMeta);

  return {
    output: {
      ...base,
      identitasLokasi,
      siswaRombel: { siswa, abk_per_layanan: abk, rombel },
      ptk,
      sarpras,
      kelembagaan,
      lulusanMelanjutkan,
    },
  };
};

/* =========================================================
   RENDER HELPERS (agar output sesuai format input Anda)
========================================================= */
const labelLayananPaud = (k) => {
  const key = String(k || "").toLowerCase();
  if (key === "tk_a") return "TK A";
  if (key === "tk_b") return "TK B";
  if (key === "kb") return "Kelompok Bermain (KB)";
  if (key === "sps_tpa") return "SPS/TPA";
  return String(k || "-");
};

const renderKondisi5Block = (title, kondisi) => {
  const k = normalizeKondisi5(kondisi);
  return (
    <div className={styles.subsection}>
      <h4 className={styles.subsectionTitle}>{title}</h4>
      <div className={styles.dataRow}>
        <span>Baik: {k.baik}</span>
      </div>
      <div className={styles.dataRow}>
        <span>Rusak Ringan: {k.rusak_ringan}</span>
      </div>
      <div className={styles.dataRow}>
        <span>Rusak Sedang: {k.rusak_sedang}</span>
      </div>
      <div className={styles.dataRow}>
        <span>Rusak Berat: {k.rusak_berat}</span>
      </div>
      <div className={styles.dataRow}>
        <span>Rusak Total: {k.rusak_total}</span>
      </div>
      <div className={styles.dataRow}>
        <span>Jumlah Total: {k.total}</span>
      </div>
    </div>
  );
};

const renderBaikRusakBlock = (title, br) => {
  const x = normalizeBaikRusak(br);
  return (
    <div className={styles.subsection}>
      <h4 className={styles.subsectionTitle}>{title}</h4>
      <div className={styles.dataRow}>
        <span>Baik: {x.baik}</span>
      </div>
      <div className={styles.dataRow}>
        <span>Rusak: {x.rusak}</span>
      </div>
      <div className={styles.dataRow}>
        <span>Jumlah Total: {x.total}</span>
      </div>
    </div>
  );
};

/* =========================================================
   ✅ VIEW: OUTPUT WADAH PAUD (sesuai modul input)
========================================================= */
const SchoolDetailPaudView = ({ schoolData }) => {
  const W = buildWadahPaud(schoolData);
  const O = isObj(W?.output) ? W.output : createPaudOutputTemplate();

  const handleLocationClick = () => {
    const lat = O?.identitasLokasi?.lat;
    const lng = O?.identitasLokasi?.lng;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    alert("Koordinat lokasi untuk sekolah ini tidak tersedia atau tidak valid.");
  };

  const layananKeys = ["tk_a", "tk_b", "kb", "sps_tpa"];

  const totalLP = layananKeys.reduce(
    (acc, k) => {
      const row = O?.siswaRombel?.siswa?.[k] || lp0();
      acc.l += num(row.l, 0);
      acc.p += num(row.p, 0);
      return acc;
    },
    { l: 0, p: 0 }
  );

  const totalAbk = layananKeys.reduce((a, k) => a + num(O?.siswaRombel?.abk_per_layanan?.[k], 0), 0);

  const totalGuru =
    num(O?.ptk?.guru_pns, 0) +
    num(O?.ptk?.guru_pppk, 0) +
    num(O?.ptk?.guru_pppk_paruh_waktu, 0) +
    num(O?.ptk?.guru_non_asn_dapodik, 0) +
    num(O?.ptk?.guru_non_asn_tidak_dapodik, 0);

  return (
    <div className={styles.container}>
      {/* ===================== 1) IDENTITAS & LOKASI ===================== */}
      <div className={styles.header}>
        <h1 className={styles.schoolName}>
          {safeText(O?.identitasLokasi?.namaSekolah || getData(schoolData, ["name"], "Nama Sekolah Tidak Tersedia"))}
        </h1>

        <div className={styles.schoolInfo}>
          <div className={styles.infoRow}>
            <span className={styles.label}>NPSN</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{safeText(O?.identitasLokasi?.npsn)}</span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.label}>Status Sekolah</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{safeText(O?.identitasLokasi?.statusSekolah)}</span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.label}>Alamat</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{safeText(O?.identitasLokasi?.alamat)}</span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.label}>Desa/Kelurahan</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{safeText(O?.identitasLokasi?.desa)}</span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.label}>Kecamatan</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{safeText(O?.identitasLokasi?.kecamatan)}</span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.label}>Koordinat</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>
              {Number.isFinite(O?.identitasLokasi?.lat) && Number.isFinite(O?.identitasLokasi?.lng)
                ? `${O.identitasLokasi.lat}, ${O.identitasLokasi.lng}`
                : "-"}
            </span>
          </div>
        </div>

        <button onClick={handleLocationClick} className={styles.locationButton}>
          Lihat Lokasi di Google Maps
        </button>
      </div>

      {/* ===================== 2) DATA SISWA & ROMBEL ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>II. Data Siswa & Rombel (PAUD/TK)</h2>

        {/* Siswa */}
        <div className={styles.card}>
          <h3 className={styles.subsectionTitle}>A. Siswa Reguler per Layanan (L/P)</h3>

          <div className={styles.dataRow}>
            <span>Total Siswa Laki-laki: {totalLP.l}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Total Siswa Perempuan: {totalLP.p}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Total Siswa (L+P): {totalLP.l + totalLP.p}</span>
          </div>

          <div className={styles.subsection}>
            <h4 className={styles.subsectionTitle}>Rincian per Layanan</h4>
            {layananKeys.map((k) => {
              const row = O?.siswaRombel?.siswa?.[k] || lp0();
              const abk = num(O?.siswaRombel?.abk_per_layanan?.[k], 0);
              const rombel = num(O?.siswaRombel?.rombel?.[k], 0);

              return (
                <div className={styles.subsection} key={k}>
                  <h4 className={styles.subsectionTitle}>{labelLayananPaud(k)}</h4>
                  <div className={styles.dataRow}>
                    <span>Laki-laki: {num(row.l, 0)}</span>
                  </div>
                  <div className={styles.dataRow}>
                    <span>Perempuan: {num(row.p, 0)}</span>
                  </div>
                  <div className={styles.dataRow}>
                    <span>Total: {num(row.l, 0) + num(row.p, 0)}</span>
                  </div>
                  <div className={styles.dataRow}>
                    <span>ABK (per layanan): {abk}</span>
                  </div>
                  <div className={styles.dataRow}>
                    <span>Rombel (layanan): {rombel}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.dataRow}>
            <span>Total ABK (semua layanan): {totalAbk}</span>
          </div>
          <div className={styles.dataRow}>
            <span>
              Total Rombel (semua layanan):{" "}
              {num(
                O?.siswaRombel?.rombel?.total,
                layananKeys.reduce((a, k) => a + num(O?.siswaRombel?.rombel?.[k], 0), 0)
              )}
            </span>
          </div>
        </div>
      </div>

      {/* ===================== 3) PTK ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>III. Data Pendidik & Tenaga Kependidikan (PTK)</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Guru PNS: {num(O?.ptk?.guru_pns, 0)}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Guru PPPK: {num(O?.ptk?.guru_pppk, 0)}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Guru PPPK (Paruh Waktu): {num(O?.ptk?.guru_pppk_paruh_waktu, 0)}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Guru Non-ASN (Terdata Dapodik): {num(O?.ptk?.guru_non_asn_dapodik, 0)}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Guru Non-ASN (Tidak Terdata Dapodik): {num(O?.ptk?.guru_non_asn_tidak_dapodik, 0)}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Guru (Total): {totalGuru}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kekurangan Guru (Kebutuhan): {num(O?.ptk?.kekurangan_guru, 0)}</span>
          </div>
        </div>
      </div>

      {/* ===================== 4) SARANA & PRASARANA ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>IV. Data Sarana & Prasarana</h2>

        {/* a) Ukuran & Bangunan */}
        <div className={styles.card}>
          <h3 className={styles.subsectionTitle}>A. Ukuran & Bangunan</h3>
          <div className={styles.dataRow}>
            <span>Luas Tanah: {safeText(O?.sarpras?.ukuranBangunan?.luas_tanah_m2)} m²</span>
          </div>
          <div className={styles.dataRow}>
            <span>Luas Bangunan: {safeText(O?.sarpras?.ukuranBangunan?.luas_bangunan_m2)} m²</span>
          </div>
          <div className={styles.dataRow}>
            <span>Luas Halaman: {safeText(O?.sarpras?.ukuranBangunan?.luas_halaman_m2)} m²</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Gedung: {num(O?.sarpras?.ukuranBangunan?.jumlah_gedung, 0)}</span>
          </div>
        </div>

        {/* b) Ruang Kelas */}
        <div className={styles.card}>
          <h3 className={styles.subsectionTitle}>B. Ruang Kelas</h3>
          <div className={styles.dataRow}>
            <span>Jumlah Total Ruang Kelas: {num(O?.sarpras?.ruangKelas?.jumlah_total, 0)}</span>
          </div>
          {renderKondisi5Block("Kondisi Ruang Kelas", O?.sarpras?.ruangKelas?.kondisi)}
          <div className={styles.subsection}>
            <h4 className={styles.subsectionTitle}>Kebutuhan Ruang Kelas</h4>
            <div className={styles.dataRow}>
              <span>Kekurangan RKB: {num(O?.sarpras?.ruangKelas?.kebutuhan?.kekurangan_rkb, 0)}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Kelebihan Kelas: {num(O?.sarpras?.ruangKelas?.kebutuhan?.kelebihan_kelas, 0)}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Ruang Kelas Tambahan: {num(O?.sarpras?.ruangKelas?.kebutuhan?.ruang_kelas_tambahan, 0)}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Ketersediaan Lahan Pembangunan: {safeText(O?.sarpras?.ruangKelas?.lahan_tersedia)}</span>
            </div>
          </div>
        </div>

        {/* c) Ruang Penunjang & (PAUD) APE */}
        <div className={styles.card}>
          <h3 className={styles.subsectionTitle}>C. Ruang Penunjang & APE (PAUD/TK)</h3>

          {renderKondisi5Block("Perpustakaan", O?.sarpras?.ruangPenunjang?.perpustakaan?.kondisi)}
          {renderKondisi5Block("Laboratorium (Umum)", O?.sarpras?.ruangPenunjang?.lab_umum?.kondisi)}
          {renderKondisi5Block("Ruang Guru", O?.sarpras?.ruangPenunjang?.ruang_guru?.kondisi)}
          {renderKondisi5Block("Ruang Kepala Sekolah", O?.sarpras?.ruangPenunjang?.ruang_kepala_sekolah?.kondisi)}
          {renderKondisi5Block("Ruang TU", O?.sarpras?.ruangPenunjang?.ruang_tu?.kondisi)}
          {renderKondisi5Block("Ruang UKS", O?.sarpras?.ruangPenunjang?.ruang_uks?.kondisi)}
          {renderKondisi5Block("Toilet Umum", O?.sarpras?.ruangPenunjang?.toilet_umum?.kondisi)}
          {renderKondisi5Block("Rumah Dinas", O?.sarpras?.ruangPenunjang?.rumah_dinas?.kondisi)}
          {renderKondisi5Block("APE (Alat Permainan Edukasi)", O?.sarpras?.ruangPenunjang?.ape?.kondisi)}
        </div>

        {/* d) Perabot & Alat */}
        <div className={styles.card}>
          <h3 className={styles.subsectionTitle}>D. Perabot & Alat</h3>
          {renderBaikRusakBlock("Meja", O?.sarpras?.perabotDanAlat?.meja)}
          {renderBaikRusakBlock("Kursi", O?.sarpras?.perabotDanAlat?.kursi)}
          {renderBaikRusakBlock("Papan Tulis (Whiteboard)", O?.sarpras?.perabotDanAlat?.papan_tulis)}

          <div className={styles.subsection}>
            <h4 className={styles.subsectionTitle}>Perangkat TIK</h4>
            <div className={styles.dataRow}>
              <span>Jumlah Unit Komputer: {num(O?.sarpras?.perabotDanAlat?.komputer, 0)}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Unit Chromebook: {num(O?.sarpras?.perabotDanAlat?.chromebook, 0)}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h4 className={styles.subsectionTitle}>Peralatan Rumah Tangga</h4>
            <div className={styles.dataRow}>
              <span>Kondisi: {safeText(O?.sarpras?.perabotDanAlat?.kondisi_peralatan_rumah_tangga)}</span>
            </div>
          </div>
        </div>

        {/* e) Rencana Kegiatan Fisik */}
        <div className={styles.card}>
          <h3 className={styles.subsectionTitle}>E. Rencana Kegiatan Fisik</h3>
          <div className={styles.dataRow}>
            <span>Rencana Rehabilitasi Ruang Kelas: {num(O?.sarpras?.rencanaKegiatanFisik?.rehab_ruang_kelas, 0)}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Rencana Pembangunan RKB: {num(O?.sarpras?.rencanaKegiatanFisik?.pembangunan_rkb, 0)}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Rencana Rehabilitasi Toilet: {num(O?.sarpras?.rencanaKegiatanFisik?.rehab_toilet, 0)}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Rencana Pembangunan Toilet: {num(O?.sarpras?.rencanaKegiatanFisik?.pembangunan_toilet, 0)}</span>
          </div>
        </div>
      </div>

      {/* ===================== 5) KELEMBAGAAN ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>V. Data Kelembagaan</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Administrasi</h3>
            <div className={styles.dataRow}>
              <span>Status Pembinaan: {safeText(O?.kelembagaan?.administrasi?.pembinaan)}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Status Asesmen: {safeText(O?.kelembagaan?.administrasi?.asesmen)}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Status Penyelenggaraan</h3>
            <div className={styles.dataRow}>
              <span>Menyelenggarakan belajar: {safeText(O?.kelembagaan?.status_penyelenggaraan?.menyelenggarakan_belajar)}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Melaksanakan rekomendasi: {safeText(O?.kelembagaan?.status_penyelenggaraan?.melaksanakan_rekomendasi)}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Siap dievaluasi: {safeText(O?.kelembagaan?.status_penyelenggaraan?.siap_dievaluasi)}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>BOP</h3>
            <div className={styles.dataRow}>
              <span>Pengelola tersedia: {safeText(O?.kelembagaan?.bop?.pengelola_ada)}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Tenaga Peningkatan: {safeText(O?.kelembagaan?.bop?.jumlah_tenaga_peningkatan)}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Perizinan</h3>
            <div className={styles.dataRow}>
              <span>Pengendalian: {safeText(O?.kelembagaan?.perizinan?.pengendalian)}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Kelayakan: {safeText(O?.kelembagaan?.perizinan?.kelayakan)}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Kurikulum</h3>
            <div className={styles.dataRow}>
              <span>Silabus tersedia: {safeText(O?.kelembagaan?.kurikulum?.silabus)}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Kompetensi Dasar tersedia: {safeText(O?.kelembagaan?.kurikulum?.kompetensi_dasar)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== 6) LULUSAN / MELANJUTKAN ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>VI. Lulusan / Melanjutkan (PAUD/TK)</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Lanjut ke SD</h3>
            <div className={styles.dataRow}>
              <span>Dalam Kabupaten: {num(O?.lulusanMelanjutkan?.lanjut_ke_sd?.dalam_kab, 0)}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Luar Kabupaten: {num(O?.lulusanMelanjutkan?.lanjut_ke_sd?.luar_kab, 0)}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Lanjut ke MI</h3>
            <div className={styles.dataRow}>
              <span>Dalam Kabupaten: {num(O?.lulusanMelanjutkan?.lanjut_ke_mi?.dalam_kab, 0)}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Luar Kabupaten: {num(O?.lulusanMelanjutkan?.lanjut_ke_mi?.luar_kab, 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   ✅ CONTAINER — bisa terima schoolData langsung atau fetch by npsn
========================================================= */
const SchoolDetailPaud = ({ schoolData: schoolDataProp, npsn }) => {
  const [data, setData] = useState(schoolDataProp ?? null);
  const [loading, setLoading] = useState(!schoolDataProp && !!npsn);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (schoolDataProp) {
      setData(schoolDataProp);
      setLoading(false);
      setErrorMsg("");
    }
  }, [schoolDataProp]);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      if (schoolDataProp) return;
      if (!npsn) return;

      try {
        setLoading(true);
        setErrorMsg("");

        const { data: rpcData, error } = await supabase
          .rpc("rpc_school_detail_paud_contract", { p_npsn: npsn })
          .single();

        if (error) throw error;
        if (!alive) return;

        setData(rpcData ?? null);
      } catch (e) {
        if (!alive) return;
        setData(null);
        setErrorMsg(e?.message || "Gagal mengambil data sekolah (PAUD) dari RPC.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [npsn, schoolDataProp]);

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className={styles.container}>
          <p>Memuat detail sekolah PAUD/TK...</p>
        </div>
      );
    }

    if (errorMsg) {
      return (
        <div className={styles.container}>
          <p style={{ color: "crimson" }}>{errorMsg}</p>
        </div>
      );
    }

    if (!data) {
      return (
        <div className={styles.container}>
          <p>Data sekolah tidak ditemukan.</p>
        </div>
      );
    }

    return <SchoolDetailPaudView schoolData={data} />;
  }, [loading, errorMsg, data]);

  return content;
};

export default SchoolDetailPaud;
