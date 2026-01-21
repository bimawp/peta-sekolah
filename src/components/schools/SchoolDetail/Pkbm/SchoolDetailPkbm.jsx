// src/components/schools/SchoolDetail/Pkbm/SchoolDetailPkbm.jsx
import React, { useEffect, useMemo, useState } from "react";
import styles from "./SchoolDetailPkbm.module.css";

const getData = (data, path, def = undefined) => {
  const v = path.reduce((o, k) => (o && o[k] != null ? o[k] : undefined), data);
  if (v === 0 || v === 0.0) return 0;
  return v !== undefined && v !== null && v !== "" ? v : def;
};

const num = (v, d = 0) => (v == null || Number.isNaN(Number(v)) ? d : Number(v));
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const hasKeys = (o) => isObj(o) && Object.keys(o).length > 0;
const hasAnyNumber = (...vals) => vals.some((v) => Number(v) > 0);

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

const firstFiniteNumber = (...cands) => {
  for (const c of cands) {
    if (c === null || c === undefined || c === "") continue;
    const n = Number(c);
    if (Number.isFinite(n)) return n;
  }
  return null;
};

const firstNumber = (...cands) => {
  const n = firstFiniteNumber(...cands);
  return n == null ? 0 : n;
};

/* =========================================================
   ✅ WADAH (TEMPLATE) PKBM (LENGKAP sesuai input UI)
   - siswa: meta.siswa.paketA.kelas1.{l,p}
   - siswaAbk: meta.siswaAbk.paketA.kelas1.{l,p}
   - rombel: meta.rombel.paketA.kelas1 = n
   - prasarana ruang penunjang: perpus/lab/ruang guru/ruang ks/tu/uks/toilet umum/rumah dinas
   - kondisi lengkap 5 level: baik, rusak ringan, rusak sedang, rusak berat, rusak total
   - rencana fisik: rehab ruang kelas, pembangunan RKB, rehab toilet, pembangunan toilet
   - lanjut PKBM: Paket A/B/C sesuai input
   ========================================================= */
const room0 = () => ({
  total: 0,
  total_all: 0,

  // kondisi 5 level (wadah)
  good: 0,
  light_damage: 0,
  moderate_damage: 0,
  heavy_damage: 0,
  total_damage: 0,

  // legacy agregat (jika ada)
  total_mh: 0,
});

const lp0 = () => ({ l: 0, p: 0 });

const createPkbmMetaTemplate = () => {
  const kelasLp = () => ({
    kelas1: lp0(),
    kelas2: lp0(),
    kelas3: lp0(),
    kelas4: lp0(),
    kelas5: lp0(),
    kelas6: lp0(),
  });
  const kelasNum = () => ({
    kelas1: 0,
    kelas2: 0,
    kelas3: 0,
    kelas4: 0,
    kelas5: 0,
    kelas6: 0,
  });

  return {
    jenjang: "PKBM",
    desa: "",
    kecamatan: "",
    alamat: "",

    // ✅ (FIX) Luas sering disimpan di root META (bukan prasarana.ukuran)
    luas_tanah: null,
    luas_bangunan: null,
    luas_halaman: null,

    // ✅ (FIX) Koordinat sering disimpan di META.location_detail.extra.{latitude,longitude}
    location_detail: { extra: { latitude: null, longitude: null } },

    // ✅ (FIX) Lanjut sering disimpan di root META
    siswaLanjutDalamKab: null,
    siswaLanjutLuarKab: null,
    siswaBekerja: null,
    siswaTidakLanjut: null,

    // siswa reguler
    siswa: {
      paketA: kelasLp(),
      paketB: kelasLp(),
      paketC: kelasLp(),
    },

    // ABK per paket (wadah)
    siswaAbk: {
      paketA: kelasLp(),
      paketB: kelasLp(),
      paketC: kelasLp(),
    },

    // rombel
    rombel: {
      paketA: kelasNum(),
      paketB: kelasNum(),
      paketC: kelasNum(),
      total: 0,
    },

    // guru (seragam)
    guru: {
      pns: 0,
      pppk: 0,
      pppkParuhWaktu: 0,
      nonAsnDapodik: 0,
      nonAsnTidakDapodik: 0,
      kekuranganGuru: 0,
    },

    prasarana: {
      ukuran: {
        tanah: null,
        halaman: null,
        bangunan: null,
      },
      gedung: {
        jumlah: 0,
      },

      // Ruang kelas (wadah lengkap)
      classrooms: {
        total_room: 0,
        good: 0,
        light_damage: 0,
        moderate_damage: 0,
        heavy_damage: 0,
        total_damage: 0,

        // kebutuhan
        lacking_rkb: 0,
        excess_classrooms: 0, // kelebihan kelas
        extra_classrooms: 0, // ruang kelas tambahan

        // lahan pembangunan
        lahan: null, // boolean / Ya-Tidak
      },

      // Ruang penunjang & lab (umum SD/PKBM)
      rooms: {
        library: room0(), // Perpustakaan
        laboratory: room0(), // Lab Umum
        teacher_room: room0(), // Ruang Guru
        headmaster_room: room0(), // Ruang Kepala Sekolah
        tu_room: room0(), // Ruang TU
        uks_room: room0(), // UKS
        toilets: room0(), // Toilet Umum (ringkas / kondisi)
        official_residences: room0(), // Rumah Dinas

        // legacy agregat UI lama
        rgks: room0(),
      },

      // perabot & alat
      furniture: {
        tables: room0(), // kondisi baik/rusak (pakai good vs damage)
        chairs: room0(),
        whiteboard: room0(),
        computer: { total: 0, good: 0 },
      },
      chromebook: { total: 0, good: 0 },

      // kondisi peralatan rumah tangga (wadah)
      peralatanRumahTangga: null,

      // legacy/opsional
      students_toilet: null,
      teachers_toilet: null,
      mebeulair: null,
      papan_tulis: null,
    },

    // ✅ (FIX) kegiatan fisik key sering beda-beda (rehab_unit dll)
    kegiatanFisik: {
      rehabRuangKelas: 0,
      rehab_unit: 0,
      pembangunanRKB: 0,
      pembangunan_unit: 0,
      rehabToilet: 0,
      pembangunanToilet: 0,
    },

    kelembagaan: {
      pembinaan: null,
      asesmen: null,
      menyelenggarakanBelajar: null,
      melaksanakanRekomendasi: null,
      siapDievaluasi: null,
      bop: {
        pengelola: null,
        tenagaPeningkatan: null,
      },
      perizinan: {
        pengendalian: null,
        kelayakan: null,
      },
      kurikulum: {
        silabus: null,
        kompetensiDasar: null,
      },
      alatRumahTangga: null,
    },

    // Lulusan / melanjutkan (wadah lengkap PKBM) - legacy UI
    lanjut: {
      paketA: {
        smp: 0,
        mts: 0,
        pontren: 0,
        paketB: 0,
      },
      paketB: {
        sma: 0,
        smk: 0,
        ma: 0,
        pontren: 0,
        paketC: 0,
      },
      paketC: {
        perguruanTinggi: 0,
        bekerja: 0,
      },
    },
  };
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

// “isi angka 0” dari fallback bila fallback punya angka > 0, dan isi string kosong
const mergeFill = (base, fill) => {
  if (fill == null) return base;
  if (base == null) return fill;

  if (isObj(base) && isObj(fill)) {
    const out = { ...base };
    for (const key of Object.keys(fill)) {
      out[key] = mergeFill(base[key], fill[key]);
    }
    return out;
  }

  if (typeof base === "number" && base === 0 && typeof fill === "number" && fill !== 0) return fill;
  if (typeof base === "string" && base.trim() === "" && typeof fill === "string" && fill.trim() !== "") return fill;

  return base;
};

/* =========================================================
   NORMALISASI RELASI & FALLBACK DARI KOLOM ROOT (PKBM)
   Tujuan: kalau meta kosong, tetap keisi dari data Supabase
   ========================================================= */
const normKeyLoose = (k) => String(k ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

const roomFromTotals = (src) => {
  const o = isObj(src) ? src : {};
  const good = num(o.good ?? o.baik, 0);
  const light_damage = num(o.light_damage ?? o.light ?? o.rusak_ringan ?? o.ringandamage, 0);
  const moderate_damage = num(o.moderate_damage ?? o.moderate ?? o.sedang ?? o.rusak_sedang, 0);
  const heavy_damage = num(o.heavy_damage ?? o.heavy ?? o.berat ?? o.rusak_berat, 0);

  const total_all = num(
    o.total_all ?? o.total ?? o.jumlah ?? o.total_room,
    good + light_damage + moderate_damage + heavy_damage
  );

  let total_damage = num(o.total_damage ?? o.rusak_total, NaN);
  if (!Number.isFinite(total_damage)) {
    total_damage = Math.max(0, total_all - (good + light_damage + moderate_damage + heavy_damage));
    if (total_damage === 0) total_damage = light_damage + moderate_damage + heavy_damage;
  }

  return {
    total_all,
    total: num(o.total ?? o.total_all ?? total_all, total_all),
    good,
    light_damage,
    moderate_damage,
    heavy_damage,
    total_damage,
    total_mh: num(o.total_mh ?? (moderate_damage + heavy_damage), moderate_damage + heavy_damage),
  };
};

const mergeRoomMax = (a, b) => {
  const A = isObj(a) ? a : {};
  const B = isObj(b) ? b : {};
  return {
    total_all: Math.max(num(A.total_all, 0), num(B.total_all, 0)),
    total: Math.max(num(A.total, 0), num(B.total, 0)),
    good: Math.max(num(A.good, 0), num(B.good, 0)),
    light_damage: Math.max(num(A.light_damage, 0), num(B.light_damage, 0)),
    moderate_damage: Math.max(num(A.moderate_damage, 0), num(B.moderate_damage, 0)),
    heavy_damage: Math.max(num(A.heavy_damage, 0), num(B.heavy_damage, 0)),
    total_damage: Math.max(num(A.total_damage, 0), num(B.total_damage, 0)),
    total_mh: Math.max(num(A.total_mh, 0), num(B.total_mh, 0)),
  };
};

const guruFromStaffSummary = (rows) => {
  const out = {
    pns: 0,
    pppk: 0,
    pppkParuhWaktu: 0,
    nonAsnDapodik: 0,
    nonAsnTidakDapodik: 0,
    kekuranganGuru: 0,
    jumlahGuru: 0,
  };
  if (!Array.isArray(rows)) return out;

  for (const r of rows) {
    const role = normKeyLoose(r?.role);
    const count = num(r?.count, 0);
    if (!role) continue;

    if (role.includes("jumlahguru") || role === "totalguru") out.jumlahGuru += count;
    else if (role.includes("kekuranganguru")) out.kekuranganGuru += count;
    else if (role.includes("pppkparuhwaktu") || role.includes("pppkpt")) out.pppkParuhWaktu += count;
    else if (role.includes("pppk")) out.pppk += count;
    else if (role.includes("pns")) out.pns += count;
    else if (role.includes("nonasndapodik") || role.includes("nonasndpd")) out.nonAsnDapodik += count;
    else if (role.includes("nonasn") || role.includes("nondas")) out.nonAsnTidakDapodik += count;
  }

  if (!out.jumlahGuru) {
    out.jumlahGuru = out.pns + out.pppk + out.pppkParuhWaktu + out.nonAsnDapodik + out.nonAsnTidakDapodik;
  }
  return out;
};

const buildPrasaranaFromAny = (sd) => {
  const out = {};
  const facilities = isObj(sd?.facilities) ? sd.facilities : {};
  const raw = isObj(facilities?.raw_facilities) ? facilities.raw_facilities : {};

  // UKURAN (fallback dari kolom root / view)
  const ukuran = isObj(facilities?.ukuran) ? facilities.ukuran : {};
  const tanah = ukuran?.tanah ?? ukuran?.luas_tanah ?? sd?.luas_tanah ?? sd?.luasTanah ?? null;
  const bangunan = ukuran?.bangunan ?? ukuran?.luas_bangunan ?? sd?.luas_bangunan ?? sd?.luasBangunan ?? null;
  const halaman = ukuran?.halaman ?? ukuran?.luas_halaman ?? sd?.luas_halaman ?? sd?.luasHalaman ?? null;
  if (tanah != null || bangunan != null || halaman != null) {
    out.ukuran = { tanah, bangunan, halaman };
  }

  // GEDUNG
  const gedungJumlah =
    num(getData(facilities, ["gedung", "jumlah"], undefined), num(getData(sd, ["jumlah_gedung"], undefined), NaN));
  if (Number.isFinite(gedungJumlah)) {
    out.gedung = { ...(isObj(facilities?.gedung) ? facilities.gedung : {}), jumlah: gedungJumlah };
  }

  // CLASSROOMS (kondisi lengkap + kebutuhan + lahan)
  const cc = isObj(sd?.class_condition)
    ? sd.class_condition
    : isObj(facilities?.classrooms)
    ? facilities.classrooms
    : {};

  const classrooms = {
    total_room: num(cc?.total_room ?? cc?.total ?? sd?.total_room ?? sd?.classrooms_total ?? 0, 0),

    good: num(cc?.good ?? cc?.classrooms_good ?? sd?.classrooms_good ?? 0, 0),
    light_damage: num(cc?.light_damage ?? cc?.rusak_ringan ?? cc?.classrooms_light_damage ?? 0, 0),
    moderate_damage: num(cc?.moderate_damage ?? cc?.classrooms_moderate_damage ?? cc?.classrooms_moderate ?? 0, 0),
    heavy_damage: num(cc?.heavy_damage ?? cc?.classrooms_heavy_damage ?? cc?.classrooms_heavy ?? 0, 0),
    total_damage: num(cc?.total_damage ?? cc?.rusak_total ?? cc?.classrooms_total_damage ?? 0, 0),

    lacking_rkb: num(cc?.lacking_rkb ?? cc?.kurang_rkb ?? cc?.kurangRkb ?? sd?.lacking_rkb ?? 0, 0),
    excess_classrooms: num(cc?.excess_classrooms ?? cc?.kelebihan_kelas ?? cc?.kelebihanKelas ?? 0, 0),
    extra_classrooms: num(cc?.extra_classrooms ?? cc?.ruang_kelas_tambahan ?? cc?.ruangKelasTambahan ?? 0, 0),

    lahan: cc?.lahan ?? cc?.ketersediaan_lahan ?? cc?.ketersediaanLahan ?? facilities?.lahan ?? null,
  };

  if (!classrooms.total_damage) {
    const sumD = classrooms.light_damage + classrooms.moderate_damage + classrooms.heavy_damage;
    if (sumD > 0) classrooms.total_damage = sumD;
  }

  out.classrooms = classrooms;

  // ROOMS & FURNITURE dari raw_facilities
  const rooms = {};
  const furniture = {};

  for (const [k, v] of Object.entries(raw || {})) {
    const nk = normKeyLoose(k);

    if (nk === "furniture" && isObj(v)) {
      furniture.tables = roomFromTotals(v.tables);
      furniture.chairs = roomFromTotals(v.chairs);
      furniture.whiteboard = roomFromTotals(v.whiteboard ?? v.board ?? v.papan_tulis);
      const comp = isObj(v.computer) ? v.computer : {};
      furniture.computer = { total: num(comp.total ?? comp.good ?? 0, 0), good: num(comp.good ?? 0, 0) };
      continue;
    }

    if (nk === "chromebook") {
      const cb = isObj(v) ? v : {};
      out.chromebook = { total: num(cb.total ?? cb.good ?? 0, 0), good: num(cb.good ?? 0, 0) };
      continue;
    }

    if (nk === "peralatanrumahtangga" || nk === "alatrumah" || nk === "alatrumah tangga") {
      out.peralatanRumahTangga = v;
      continue;
    }

    rooms[k] = roomFromTotals(v);
    if (nk.includes("toilet")) out.toilets_overall = roomFromTotals(v);
  }

  // FALLBACK FURNITURE dari KOLOM ROOT (format pkbm.json)
  const rootTables = num(sd?.tables, 0);
  const rootChairs = num(sd?.chairs, 0);
  const rootBoards = num(sd?.boards ?? sd?.papan_tulis ?? sd?.whiteboard, 0);
  const rootComputer = num(sd?.computer, 0);

  if (hasAnyNumber(rootTables, rootChairs, rootBoards, rootComputer)) {
    furniture.tables = mergeRoomMax(furniture.tables, {
      total_all: rootTables,
      total: rootTables,
      good: rootTables,
      light_damage: 0,
      moderate_damage: 0,
      heavy_damage: 0,
      total_damage: 0,
    });
    furniture.chairs = mergeRoomMax(furniture.chairs, {
      total_all: rootChairs,
      total: rootChairs,
      good: rootChairs,
      light_damage: 0,
      moderate_damage: 0,
      heavy_damage: 0,
      total_damage: 0,
    });
    furniture.whiteboard = mergeRoomMax(furniture.whiteboard, {
      total_all: rootBoards,
      total: rootBoards,
      good: rootBoards,
      light_damage: 0,
      moderate_damage: 0,
      heavy_damage: 0,
      total_damage: 0,
    });
    furniture.computer = {
      total: Math.max(num(furniture?.computer?.total, 0), rootComputer),
      good: Math.max(num(furniture?.computer?.good, 0), rootComputer),
    };
  }

  // assets table: override/fill dengan MAX (menghindari duplikasi antar tahun)
  if (Array.isArray(sd?.assets)) {
    for (const a of sd.assets) {
      const cat = normKeyLoose(a?.category);
      if (!cat) continue;

      const r = roomFromTotals({
        total: a?.total,
        total_all: a?.total_all,
        good: a?.good,
        light_damage: a?.light_damage,
        moderate_damage: a?.moderate,
        heavy_damage: a?.heavy,
        total_damage: a?.total_damage,
      });

      const putRoom = (key) => {
        rooms[key] = rooms[key] ? mergeRoomMax(rooms[key], r) : r;
      };

      if (cat.includes("toilet")) {
        putRoom("toilets");
        out.toilets_overall = out.toilets_overall ? mergeRoomMax(out.toilets_overall, r) : r;
      } else if (cat.includes("perpust") || cat.includes("library")) putRoom("library");
      else if (cat.includes("labor") || cat.includes("lab")) putRoom("laboratory");
      else if (cat.includes("uks")) putRoom("uks_room");
      else if (cat.includes("tatausaha") || cat === "tu" || cat.includes("ruangtu")) putRoom("tu_room");
      else if (cat.includes("teacher") || cat.includes("ruangguru")) putRoom("teacher_room");
      else if (cat.includes("headmaster") || cat.includes("kepalasekolah") || cat.includes("principal"))
        putRoom("headmaster_room");
      else if (cat.includes("rumahdinas") || cat.includes("officialresidence")) putRoom("official_residences");
      else if (cat.includes("rgks")) putRoom("rgks");
      else if (cat.includes("meja") || cat.includes("tables"))
        furniture.tables = furniture.tables ? mergeRoomMax(furniture.tables, r) : r;
      else if (cat.includes("kursi") || cat.includes("chairs"))
        furniture.chairs = furniture.chairs ? mergeRoomMax(furniture.chairs, r) : r;
      else if (cat.includes("papan") || cat.includes("whiteboard"))
        furniture.whiteboard = furniture.whiteboard ? mergeRoomMax(furniture.whiteboard, r) : r;
      else if (cat.includes("computer") || cat.includes("komputer"))
        furniture.computer = {
          total: Math.max(num(furniture?.computer?.total, 0), num(a?.total ?? 0, 0)),
          good: Math.max(num(furniture?.computer?.good, 0), num(a?.good ?? a?.total ?? 0, 0)),
        };
      else if (cat.includes("chromebook"))
        out.chromebook = {
          total: Math.max(num(out?.chromebook?.total, 0), num(a?.total ?? 0, 0)),
          good: Math.max(num(out?.chromebook?.good, 0), num(a?.good ?? a?.total ?? 0, 0)),
        };
    }
  }

  if (hasKeys(rooms)) out.rooms = rooms;
  if (hasKeys(furniture)) out.furniture = furniture;

  return out;
};

const buildWadahPkbm = (schoolData) => {
  const rawMeta = isObj(schoolData?.meta) ? schoolData.meta : {};

  // meta juga kadang disimpan di details.meta atau details langsung
  const detailsMeta = isObj(schoolData?.details?.meta) ? schoolData.details.meta : {};
  const detailsAsMeta = isObj(schoolData?.details) && !isObj(schoolData?.details?.meta) ? schoolData.details : {};

  const mergedRawMeta = mergeDeep(rawMeta, mergeDeep(detailsAsMeta, detailsMeta));
  const meta = mergeDeep(createPkbmMetaTemplate(), mergedRawMeta);

  // Fill dari relasi/facilities/kolom root
  const prDerived = buildPrasaranaFromAny(schoolData);
  const guruDerived = guruFromStaffSummary(schoolData?.staff_summary);

  meta.prasarana = mergeFill(meta.prasarana, prDerived);
  meta.guru = mergeFill(meta.guru, guruDerived);

  // alias alat rumah tangga
  const pr = isObj(meta?.prasarana) ? meta.prasarana : {};
  const ke = isObj(meta?.kelembagaan) ? meta.kelembagaan : {};
  const alat =
    ke?.alatRumahTangga ??
    ke?.alat_rumah_tangga ??
    pr?.peralatanRumahTangga ??
    pr?.peralatan_rumah_tangga ??
    null;

  const kelembagaan = alat != null && ke?.alatRumahTangga == null ? { ...ke, alatRumahTangga: alat } : ke;

  // ✅ (FIX) Koordinat fallback ke META.location_detail.extra.* + root meta lat/lng
  const latMeta = firstFiniteNumber(
    getData(meta, ["location_detail", "extra", "latitude"], undefined),
    getData(meta, ["location_detail", "extra", "lat"], undefined),
    getData(meta, ["location_detail", "latitude"], undefined),
    getData(meta, ["latitude"], undefined),
    getData(meta, ["lat"], undefined)
  );

  const lngMeta = firstFiniteNumber(
    getData(meta, ["location_detail", "extra", "longitude"], undefined),
    getData(meta, ["location_detail", "extra", "lng"], undefined),
    getData(meta, ["location_detail", "longitude"], undefined),
    getData(meta, ["longitude"], undefined),
    getData(meta, ["lng"], undefined)
  );

  const latFinal = firstFiniteNumber(schoolData?.lat, schoolData?._raw?.lat, schoolData?.latitude, latMeta);
  const lngFinal = firstFiniteNumber(schoolData?.lng, schoolData?._raw?.lng, schoolData?.longitude, lngMeta);

  return {
    jenjang: "PKBM",
    sekolah: {
      id: schoolData?.id ?? null,
      name: getData(schoolData, ["name"], ""),
      npsn: getData(schoolData, ["npsn"], ""),
      address: getData(schoolData, ["address"], ""),
      status: schoolData?.status ?? schoolData?.status_sekolah ?? "",
      lat: latFinal,
      lng: lngFinal,
      desa:
        schoolData?.desa ??
        schoolData?.village_name ??
        getData(schoolData, ["village"], undefined) ??
        meta?.desa ??
        "",
      kecamatan: schoolData?.kecamatan ?? schoolData?.kecamatan_name ?? meta?.kecamatan ?? "",
    },
    meta: { ...meta, kelembagaan },
  };
};

/* =========================================================
   ✅ KELEMBAGAAN: WADAH OUTPUT (selalu tampil)
   ========================================================= */
const normKey = (k) => String(k ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

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

  const bad = new Set(["kelembagaansection", "kelembagaan section", "[object object]", "undefined", "null"]);
  if (bad.has(s.toLowerCase())) return null;

  const upper = s.toUpperCase();
  const YES = new Set(["YA", "Y", "YES", "TRUE", "1"]);
  const NO = new Set(["TIDAK", "TDK", "NO", "FALSE", "0"]);
  const NOTYET = new Set(["BELUM", "BLM"]);

  if (YES.has(upper)) return "Ya";
  if (NO.has(upper)) return "Tidak";
  if (NOTYET.has(upper)) return "Belum";

  if (upper === "BAIK") return "Baik";
  if (upper === "RUSAK") return "Rusak";
  if (upper === "RUSAK RINGAN" || upper === "RUSAK_RINGAN") return "Rusak Ringan";
  if (upper === "RUSAK SEDANG" || upper === "RUSAK_SEDANG") return "Rusak Sedang";
  if (upper === "RUSAK BERAT" || upper === "RUSAK_BERAT") return "Rusak Berat";
  if (upper === "RUSAK TOTAL" || upper === "RUSAK_TOTAL") return "Rusak Total";

  return toTitleCase(s);
};

const findKeyByNorm = (obj, targetNorm) => {
  if (!isObj(obj)) return null;
  const t = normKey(targetNorm);
  for (const k of Object.keys(obj)) {
    if (normKey(k) === t) return k;
  }
  return null;
};

const pickByNorm = (obj, targetNorms = []) => {
  if (!isObj(obj)) return undefined;
  for (const t of targetNorms) {
    const k = findKeyByNorm(obj, t);
    if (k) return obj[k];
  }
  return undefined;
};

const pvOrDash = (v) => {
  const pv = prettyValue(v);
  return pv == null ? "-" : pv;
};

const renderKelembagaanWadah = (kelembagaan) => {
  const ke = isObj(kelembagaan) ? kelembagaan : {};

  const pembinaan = pickByNorm(ke, ["pembinaan"]);
  const asesmen = pickByNorm(ke, ["asesmen"]);

  const menyelenggarakan = pickByNorm(ke, ["menyelenggarakanbelajar", "menyelenggarakankegiatanbelajar"]);
  const melaksanakan = pickByNorm(ke, ["melaksanakanrekomendasi"]);
  const siapDievaluasi = pickByNorm(ke, ["siapdievaluasi"]);

  const bopObj = pickByNorm(ke, ["bop"]);
  const bop = isObj(bopObj) ? bopObj : {};
  const bopPengelola = pickByNorm(bop, ["pengelola", "pengelolabop", "pengelolaboptersedia"]);
  const bopTenaga = pickByNorm(bop, ["tenagapeningkatan", "jumlahtenagapeningkatan"]);

  const perObj = pickByNorm(ke, ["perizinan"]);
  const per = isObj(perObj) ? perObj : {};
  const izinPengendalian = pickByNorm(per, ["pengendalian", "izinpengendalian", "pengendalianperizinan"]);
  const izinKelayakan = pickByNorm(per, ["kelayakan", "izinkelayakan", "kelayakanperizinan"]);

  const kurObj = pickByNorm(ke, ["kurikulum"]);
  const kur = isObj(kurObj) ? kurObj : {};
  const silabus = pickByNorm(kur, ["silabus", "silabustersedia"]);
  const kd = pickByNorm(kur, ["kompetensidasar", "kompetensidasartersedia"]);

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

const normalizeRoom = (src) => {
  const o = isObj(src) ? src : {};
  const good = num(o.good ?? o.baik, 0);
  const light = num(o.light_damage ?? o.light ?? o.rusak_ringan, 0);
  const moderate = num(o.moderate_damage ?? o.sedang ?? o.rusak_sedang, 0);
  const heavy = num(o.heavy_damage ?? o.berat ?? o.rusak_berat, 0);

  const totalAll = num(o.total_all ?? o.total ?? o.jumlah, good + light + moderate + heavy);

  let totalDamage = num(o.total_damage ?? o.rusak_total, NaN);
  if (!Number.isFinite(totalDamage)) {
    totalDamage = Math.max(0, totalAll - (good + light + moderate + heavy));
    if (totalDamage === 0) totalDamage = light + moderate + heavy;
  }

  const totalMh = num(o.total_mh, moderate + heavy);

  return {
    good,
    light_damage: light,
    moderate_damage: moderate,
    heavy_damage: heavy,
    total_damage: totalDamage,
    total_all: totalAll,
    total_mh: totalMh,
  };
};

const normalizeToilet = (src) => {
  const o = isObj(src) ? src : {};
  const male = normalizeRoom(o.male);
  const female = normalizeRoom(o.female);
  const overall = isObj(o._overall) ? normalizeRoom(o._overall) : null;
  return { male, female, overall };
};

const sumOverall = (t) => {
  if (t?.overall) return t.overall;

  const total_all = num(t?.male?.total_all, 0) + num(t?.female?.total_all, 0);
  const good = num(t?.male?.good, 0) + num(t?.female?.good, 0);
  const light_damage = num(t?.male?.light_damage, 0) + num(t?.female?.light_damage, 0);
  const moderate_damage = num(t?.male?.moderate_damage, 0) + num(t?.female?.moderate_damage, 0);
  const heavy_damage = num(t?.male?.heavy_damage, 0) + num(t?.female?.heavy_damage, 0);

  let total_damage = num(t?.male?.total_damage, 0) + num(t?.female?.total_damage, 0);
  if (!total_damage) {
    total_damage = light_damage + moderate_damage + heavy_damage;
  }

  return { total_all, good, light_damage, moderate_damage, heavy_damage, total_damage };
};

/* =========================================================
   ✅ (FIX) FLATTEN + PARSER LONG-LABEL (untuk siswa/ABK/rombel/lanjut)
   - Menangkap input datar: rombel_paketA_kelas1, siswa_paketA_kelas1_L, dll
   ========================================================= */
const flattenNumericLeaves = (obj) => {
  const out = [];
  const walk = (o, path) => {
    if (Array.isArray(o)) {
      o.forEach((v, i) => walk(v, path.concat(String(i))));
      return;
    }
    if (!isObj(o)) {
      if (o === "" || o === null || o === undefined) return;
      const n = Number(o);
      if (Number.isFinite(n)) {
        const keyRaw = path.join("_");
        const key = String(keyRaw)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "");
        out.push({ key, value: n });
      }
      return;
    }
    for (const [k, v] of Object.entries(o)) {
      walk(v, path.concat(k));
    }
  };
  walk(obj, []);
  return out;
};

const detectPaket = (s) => {
  const m1 = s.match(/paket\s*([abc])/i);
  const m2 = s.match(/paket_?([abc])\b/i);
  const m = m1 || m2;
  if (!m) return null;
  const letter = String(m[1] || "").toUpperCase();
  if (!["A", "B", "C"].includes(letter)) return null;
  return `paket${letter}`;
};

const detectKelas = (s) => {
  const m1 = s.match(/kelas\s*([1-6])/i);
  const m2 = s.match(/kelas_?([1-6])\b/i);
  const m3 = s.match(/\bkls_?([1-6])\b/i);
  const m = m1 || m2 || m3;
  if (!m) return null;
  const no = String(m[1] || "");
  if (!["1", "2", "3", "4", "5", "6"].includes(no)) return null;
  return `kelas${no}`;
};

const detectGender = (s) => {
  const ss = String(s || "").toLowerCase();

  if (/(^|_)(l|lk|laki|male)(_|$)/i.test(ss) || ss.includes("lakilaki")) return "l";
  if (/(^|_)(p|pr|perempuan|female)(_|$)/i.test(ss) || ss.includes("perempuan")) return "p";
  return null;
};

const makeKelasLp = () => ({
  kelas1: { l: 0, p: 0 },
  kelas2: { l: 0, p: 0 },
  kelas3: { l: 0, p: 0 },
  kelas4: { l: 0, p: 0 },
  kelas5: { l: 0, p: 0 },
  kelas6: { l: 0, p: 0 },
});

const makeKelasNum = () => ({
  kelas1: 0,
  kelas2: 0,
  kelas3: 0,
  kelas4: 0,
  kelas5: 0,
  kelas6: 0,
});

const deriveSiswaStructFromFlat = (flat, kind = "siswa") => {
  const out = { paketA: makeKelasLp(), paketB: makeKelasLp(), paketC: makeKelasLp() };
  const wantAbk = kind === "abk";

  for (const it of flat || []) {
    const k = it?.key || "";
    const v = num(it?.value, NaN);
    if (!Number.isFinite(v)) continue;

    // filter prefix (lebih aman agar tidak nyangkut field lain)
    const hasSiswa = k.includes("siswa") || k.includes("pesertadidik") || k.includes("pd");
    const hasAbk = k.includes("abk") || k.includes("kebutuhankhusus");

    if (wantAbk) {
      if (!hasAbk) continue;
    } else {
      if (!hasSiswa) continue;
      if (hasAbk) continue;
    }
    if (k.includes("rombel") || k.includes("rombongan")) continue;

    const paket = detectPaket(k);
    const kelas = detectKelas(k);
    const gender = detectGender(k);
    if (!paket || !kelas || !gender) continue;

    out[paket][kelas][gender] = Math.max(num(out[paket][kelas][gender], 0), v);
  }
  return out;
};

const deriveRombelStructFromFlat = (flat) => {
  const out = { paketA: makeKelasNum(), paketB: makeKelasNum(), paketC: makeKelasNum() };

  for (const it of flat || []) {
    const k = it?.key || "";
    const v = num(it?.value, NaN);
    if (!Number.isFinite(v)) continue;

    const isRombel = k.includes("rombel") || k.includes("rombongan") || k.includes("rombonganbelajar");
    if (!isRombel) continue;

    const paket = detectPaket(k);
    const kelas = detectKelas(k);
    if (!paket || !kelas) continue;

    out[paket][kelas] = Math.max(num(out[paket][kelas], 0), v);
  }
  return out;
};

const pickFlatByTokenSets = (flat, tokenSets, def = 0) => {
  const f = Array.isArray(flat) ? flat : [];
  let best = def;

  const normTokens = (tokens) => tokens.map((t) => normKeyLoose(t));

  for (const tokens of tokenSets || []) {
    const ts = normTokens(tokens);
    for (const it of f) {
      const k = normKeyLoose(it?.key);
      if (!k) continue;
      const ok = ts.every((t) => k.includes(t));
      if (!ok) continue;
      const v = num(it?.value, NaN);
      if (!Number.isFinite(v)) continue;
      if (v > best) best = v;
    }
  }
  return best;
};

const sumFlatByTokens = (flat, tokens) => {
  const f = Array.isArray(flat) ? flat : [];
  const ts = (tokens || []).map((t) => normKeyLoose(t));
  let sum = 0;
  for (const it of f) {
    const k = normKeyLoose(it?.key);
    if (!k) continue;
    if (!ts.every((t) => k.includes(t))) continue;
    const v = num(it?.value, NaN);
    if (!Number.isFinite(v)) continue;
    sum += v;
  }
  return sum;
};

/* ============================
   PKBM: siswa dari meta input
   ============================ */
function sumLpDeep(obj) {
  if (!isObj(obj)) return { l: 0, p: 0 };
  let L = 0;
  let P = 0;

  for (const [, v] of Object.entries(obj)) {
    if (!isObj(v)) continue;

    const l = v?.l;
    const p = v?.p;
    const hasLeaf = (l != null || p != null) && typeof l !== "object" && typeof p !== "object";

    if (hasLeaf) {
      L += num(l, 0);
      P += num(p, 0);
      continue;
    }

    const sub = sumLpDeep(v);
    L += sub.l;
    P += sub.p;
  }

  return { l: L, p: P };
}

function buildPkbmRincianRows(metaSiswa, labelPrefix = "") {
  const rows = [];
  if (!isObj(metaSiswa)) return rows;

  for (const [paketKey, paketVal] of Object.entries(metaSiswa)) {
    if (!isObj(paketVal)) continue;

    const paketLabelFixed = String(paketKey)
      .replace(/_/g, " ")
      .replace(/(paket)\s*([a-z0-9]+)/i, (_, a, b) => `${a.toUpperCase()} ${String(b).toUpperCase()}`)
      .replace(/\s+/g, " ")
      .trim();

    for (const [kelasKey, kelasVal] of Object.entries(paketVal)) {
      if (!isObj(kelasVal)) continue;

      const l = num(kelasVal?.l, 0);
      const p = num(kelasVal?.p, 0);

      const kelasLabel = String(kelasKey)
        .replace(/_/g, " ")
        .replace(/kelas\s*([0-9]+)/i, (_, g) => `Kelas ${g}`)
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (m) => m.toUpperCase());

      rows.push({ label: `${labelPrefix}${paketLabelFixed} ${kelasLabel} Laki-laki`, value: l });
      rows.push({ label: `${labelPrefix}${paketLabelFixed} ${kelasLabel} Perempuan`, value: p });
    }
  }

  return rows;
}

/* ============================
   PKBM: rombel dari meta input
   ============================ */
function sumRombelPkbm(rombelObj) {
  if (!isObj(rombelObj)) return 0;
  let total = 0;
  for (const [, paketVal] of Object.entries(rombelObj)) {
    if (!isObj(paketVal)) continue;
    for (const [, v] of Object.entries(paketVal)) total += num(v, 0);
  }
  return total;
}

function buildRombelPkbmRows(rombelObj) {
  const rows = [];
  if (!isObj(rombelObj)) return rows;

  for (const [paketKey, paketVal] of Object.entries(rombelObj)) {
    if (!isObj(paketVal)) continue;
    if (paketKey === "total") continue;

    const paketLabelFixed = String(paketKey)
      .replace(/_/g, " ")
      .replace(/(paket)\s*([a-z0-9]+)/i, (_, a, b) => `${a.toUpperCase()} ${String(b).toUpperCase()}`)
      .replace(/\s+/g, " ")
      .trim();

    for (const [kelasKey, v] of Object.entries(paketVal)) {
      const kelasLabel = String(kelasKey)
        .replace(/_/g, " ")
        .replace(/kelas\s*([0-9]+)/i, (_, g) => `Kelas ${g}`)
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (m) => m.toUpperCase());

      rows.push({ label: `${paketLabelFixed} ${kelasLabel}`, value: num(v, 0) });
    }
  }

  return rows;
}

/* =========================================================
   ✅ FETCH SUPABASE (PKBM) - berlaku untuk semua PKBM
   ========================================================= */
const RPC_NAME = "rpc_school_detail_pkbm"; // <- ganti jika nama RPC Anda berbeda

async function fetchPkbmDetailFromSupabase(npsn) {
  // 1) Utama: RPC contract -> HARUS 1 row per NPSN
  try {
    const { data, error } = await supabase.rpc(RPC_NAME, { p_npsn: npsn }).single();
    if (error) throw error;
    return data ?? null;
  } catch (e) {
    // 2) Fallback: ambil dari view (kalau RPC belum ada / error)
    const { data: rows, error } = await supabase
      .from("schools_with_details")
      .select("*")
      .eq("npsn", npsn)
      .limit(1);

    if (error) throw error;
    return rows?.[0] ?? null;
  }
}

/* =========================================================
   ✅ RENDER HELPERS (UI WADAH)
   ========================================================= */
const boolOrDash = (v) => {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "boolean") return v ? "Ya" : "Tidak";
  const s = String(v).trim();
  if (!s) return "-";
  const up = s.toUpperCase();
  if (["YA", "Y", "YES", "TRUE", "1"].includes(up)) return "Ya";
  if (["TIDAK", "TDK", "NO", "FALSE", "0"].includes(up)) return "Tidak";
  return safeText(v, "-");
};

const asRoom = (o) => normalizeRoom(isObj(o) ? o : room0());

const furnitureBaikRusak = (r) => {
  const R = asRoom(r);
  const total = num(R.total_all, 0);
  const baik = num(R.good, 0);
  let rusak =
    total > 0
      ? Math.max(0, total - baik)
      : num(R.light_damage, 0) +
        num(R.moderate_damage, 0) +
        num(R.heavy_damage, 0) +
        num(R.total_damage, 0);
  if (R.total_damage && R.light_damage + R.moderate_damage + R.heavy_damage > 0) {
    rusak = total > 0 ? Math.max(0, total - baik) : R.light_damage + R.moderate_damage + R.heavy_damage;
  }
  return { total, baik, rusak };
};

// legacy: untuk object sederhana
const getLanjutVal = (obj, keys) => {
  const o = isObj(obj) ? obj : {};
  for (const k of keys) {
    const kk = Object.keys(o).find((x) => normKey(x) === normKey(k));
    if (kk) return num(o[kk], 0);
  }
  return 0;
};

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

  const handleLocationClick = () => {
    // ✅ (FIX) Koordinat fallback termasuk META.location_detail.extra.*
    const lat = firstFiniteNumber(
      WADAH?.sekolah?.lat,
      getData(WADAH, ["meta", "location_detail", "extra", "latitude"], undefined),
      getData(WADAH, ["meta", "location_detail", "extra", "lat"], undefined),
      schoolData?.lat,
      schoolData?._raw?.lat,
      schoolData?.latitude
    );

    const lng = firstFiniteNumber(
      WADAH?.sekolah?.lng,
      getData(WADAH, ["meta", "location_detail", "extra", "longitude"], undefined),
      getData(WADAH, ["meta", "location_detail", "extra", "lng"], undefined),
      schoolData?.lng,
      schoolData?._raw?.lng,
      schoolData?.longitude
    );

    // kalau ada coordinates array, tetap dipakai (prioritas pertama)
    const coords = schoolData?.coordinates ?? null;

    let pair = null;
    if (Array.isArray(coords) && coords.length === 2) {
      const a = Number(coords[0]);
      const b = Number(coords[1]);
      if (Number.isFinite(a) && Number.isFinite(b)) pair = [a, b];
    } else if (Number.isFinite(lat) && Number.isFinite(lng)) {
      pair = [lng, lat]; // [lng, lat] mengikuti kebiasaan geojson Anda
    }

    if (pair) {
      let lng2 = Number(pair[0]);
      let lat2 = Number(pair[1]);

      if (Math.abs(lat2) > 90 && Math.abs(lng2) <= 90) [lat2, lng2] = [lng2, lat2];

      // ✅ (opsional aman) jangan buka map jika (0,0) karena biasanya “belum diisi”
      const isZeroZero = lat2 === 0 && lng2 === 0;

      if (!isZeroZero && Math.abs(lat2) <= 90 && Math.abs(lng2) <= 180) {
        const url = `https://www.google.com/maps/search/?api=1&query=${lat2},${lng2}`;
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
    }
    alert("Data koordinat lokasi untuk sekolah ini tidak tersedia atau tidak valid.");
  };

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

  const TEMPLATE = createPkbmMetaTemplate();
  const META = isObj(WADAH?.meta) ? WADAH.meta : TEMPLATE;
  const PR = isObj(META?.prasarana) ? META.prasarana : TEMPLATE.prasarana;
  const KELEM = isObj(META?.kelembagaan) ? META.kelembagaan : TEMPLATE.kelembagaan;

  // ✅ (FIX) precompute flattened numeric keys sekali, dipakai untuk siswa/abk/rombel/lanjut
  const metaFlat = useMemo(() => flattenNumericLeaves(META), [META]);

  // IDENTITAS
  const jenjang = safeText(schoolData?.jenjang || schoolData?.level || META?.jenjang || "PKBM", "PKBM");
  const statusSekolah = safeText(schoolData?.status || schoolData?.status_sekolah || schoolData?.statusSekolah, "");

  const nama = safeText(getData(schoolData, ["name"], "Nama PKBM Tidak Tersedia"), "Nama PKBM Tidak Tersedia");
  const npsn = safeText(getData(schoolData, ["npsn"], "-"), "-");
  const address = safeText(getData(schoolData, ["address"], META?.alamat ?? "-"), "-");

  const desa = safeText(
    schoolData?.desa ?? schoolData?.village_name ?? getData(schoolData, ["village"], undefined) ?? META?.desa ?? "-",
    "-"
  );

  const kecamatan = safeText(
    schoolData?.kecamatan ??
      schoolData?.kecamatan_name ??
      getData(schoolData, ["kecamatan"], undefined) ??
      META?.kecamatan ??
      "-",
    "-"
  );

  const latVal = WADAH?.sekolah?.lat;
  const lngVal = WADAH?.sekolah?.lng;

  // ===================== (FIX) SISWA + ABK flexible =====================
  const siswaMetaRaw = isObj(META?.siswa) ? META.siswa : TEMPLATE.siswa;
  const abkMetaRaw = isObj(META?.siswaAbk) ? META.siswaAbk : TEMPLATE.siswaAbk;

  const siswaLoose = useMemo(() => deriveSiswaStructFromFlat(metaFlat, "siswa"), [metaFlat]);
  const abkLoose = useMemo(() => deriveSiswaStructFromFlat(metaFlat, "abk"), [metaFlat]);

  const siswaMeta = useMemo(() => mergeFill(siswaMetaRaw, siswaLoose), [siswaMetaRaw, siswaLoose]);
  const abkMeta = useMemo(() => mergeFill(abkMetaRaw, abkLoose), [abkMetaRaw, abkLoose]);

  const sumMeta = sumLpDeep(siswaMeta);
  const sumMetaAbk = sumLpDeep(abkMeta);

  const siswaL_db = num(schoolData?.st_male, 0);
  const siswaP_db = num(schoolData?.st_female, 0);

  const siswaL = sumMeta.l > 0 ? sumMeta.l : siswaL_db;
  const siswaP = sumMeta.p > 0 ? sumMeta.p : siswaP_db;
  const totalFromLP = siswaL + siswaP;
  const totalSiswa = totalFromLP > 0 ? totalFromLP : num(schoolData?.student_count, 0);

  const rincianSiswaRows = buildPkbmRincianRows(siswaMeta, "");
  const rincianAbkRows = buildPkbmRincianRows(abkMeta, "ABK ");

  // ABK (wadah selalu tampil)
  const abkL = sumMetaAbk.l;
  const abkP = sumMetaAbk.p;

  // PRASARANA
  const classrooms = isObj(PR?.classrooms) ? PR.classrooms : TEMPLATE.prasarana.classrooms;

  // ===================== (FIX) KEGIATAN FISIK: rehab_unit dll =====================
  const kf = isObj(META?.kegiatanFisik) ? META.kegiatanFisik : TEMPLATE.kegiatanFisik;

  // angka yang dipakai bar chart lama (TIDAK DIUBAH) namun sumbernya diperluas
  const rusakBerat = num(classrooms?.heavy_damage, 0);
  const rusakSedang = num(classrooms?.moderate_damage, 0);
  const kurangRkb = num(classrooms?.lacking_rkb, 0);

  // ✅ (FIX) rehab/pembangunan dari berbagai key
  const rehabKegiatan = firstNumber(
    getData(META, ["kegiatanFisik", "rehabRuangKelas"], undefined),
    getData(META, ["kegiatanFisik", "rehab_unit"], undefined),
    getData(META, ["kegiatanFisik", "rehabUnit"], undefined),
    kf?.rehabRuangKelas,
    kf?.rehab_unit
  );

  const pembangunanKegiatan = firstNumber(
    getData(META, ["kegiatanFisik", "pembangunanRKB"], undefined),
    getData(META, ["kegiatanFisik", "pembangunan_unit"], undefined),
    getData(META, ["kegiatanFisik", "pembangunanUnit"], undefined),
    kf?.pembangunanRKB,
    kf?.pembangunan_unit
  );

  // bar chart tampil walau 0 (wadah)
  const showRKB = true;

  const maxRoomValue = Math.max(rusakBerat, rusakSedang, kurangRkb, rehabKegiatan, pembangunanKegiatan, 1);
  const calculateHeight = (value) => {
    const v = Number(value) || 0;
    if (v === 0) return "calc(0% + 20px)";
    return `calc(${(v / maxRoomValue) * 100}% + 20px)`;
  };

  // RUANG KELAS (wadah lengkap)
  const kelasTotal = num(classrooms?.total_room, 0);
  const kelasBaik = num(classrooms?.good, 0);
  const kelasRingan = num(classrooms?.light_damage, 0);
  const kelasTotalRusak = num(classrooms?.total_damage, 0);

  const kelebihanKelas = num(classrooms?.excess_classrooms, 0);
  const kelasTambahan = num(classrooms?.extra_classrooms, 0);
  const lahanTersedia = classrooms?.lahan;

  // ===================== (FIX) LUAS: prioritas META.luas_* =====================
  const ukuran = isObj(PR?.ukuran) ? PR.ukuran : TEMPLATE.prasarana.ukuran;

  const luasTanah =
    getData(META, ["luas_tanah"], undefined) ??
    getData(META, ["luasTanah"], undefined) ??
    getData(META, ["prasarana", "ukuran", "tanah"], undefined) ??
    ukuran?.tanah ??
    null;

  const luasBangunan =
    getData(META, ["luas_bangunan"], undefined) ??
    getData(META, ["luasBangunan"], undefined) ??
    getData(META, ["prasarana", "ukuran", "bangunan"], undefined) ??
    ukuran?.bangunan ??
    null;

  const luasHalaman =
    getData(META, ["luas_halaman"], undefined) ??
    getData(META, ["luasHalaman"], undefined) ??
    getData(META, ["prasarana", "ukuran", "halaman"], undefined) ??
    ukuran?.halaman ??
    null;

  const jumlahGedung = num(getData(PR, ["gedung", "jumlah"], 0), 0);

  // TOILET (wadah lengkap 5 level)
  const toiletsRoomRaw = PR?.rooms?.toilets ?? PR?.toilets_overall ?? PR?.toilets ?? null;
  const toiletsRoom = normalizeRoom(toiletsRoomRaw ?? room0());

  const stToilet = normalizeToilet(PR?.students_toilet);
  const tcToilet = normalizeToilet(PR?.teachers_toilet);
  const stSum = sumOverall(stToilet);
  const tcSum = sumOverall(tcToilet);

  const toiletTotal =
    num(toiletsRoom.total_all, 0) > 0
      ? num(toiletsRoom.total_all, 0)
      : num(stSum.total_all, 0) + num(tcSum.total_all, 0);

  const toiletGood =
    num(toiletsRoom.total_all, 0) > 0 ? num(toiletsRoom.good, 0) : num(stSum.good, 0) + num(tcSum.good, 0);

  const toiletLight =
    num(toiletsRoom.total_all, 0) > 0
      ? num(toiletsRoom.light_damage, 0)
      : num(stSum.light_damage, 0) + num(tcSum.light_damage, 0);

  const toiletMod =
    num(toiletsRoom.total_all, 0) > 0
      ? num(toiletsRoom.moderate_damage, 0)
      : num(stSum.moderate_damage, 0) + num(tcSum.moderate_damage, 0);

  const toiletHeavy =
    num(toiletsRoom.total_all, 0) > 0
      ? num(toiletsRoom.heavy_damage, 0)
      : num(stSum.heavy_damage, 0) + num(tcSum.heavy_damage, 0);

  const toiletTotalRusak =
    num(toiletsRoom.total_all, 0) > 0
      ? num(toiletsRoom.total_damage, 0)
      : num(stSum.total_damage, 0) + num(tcSum.total_damage, 0);

  // RUANG PENUNJANG & LAB (wadah lengkap)
  const rooms = isObj(PR?.rooms) ? PR.rooms : TEMPLATE.prasarana.rooms;

  const roomRGKS = asRoom(rooms?.rgks);
  const roomPerpus = asRoom(rooms?.library);
  const roomLab = asRoom(rooms?.laboratory);
  const roomGuru = asRoom(rooms?.teacher_room);
  const roomKS = asRoom(rooms?.headmaster_room);
  const roomTU = asRoom(rooms?.tu_room);
  const roomUKS = asRoom(rooms?.uks_room);
  const roomToiletUmum = asRoom(rooms?.toilets);
  const roomRumahDinas = asRoom(rooms?.official_residences);

  const showPrasarana = true; // wadah prasarana selalu tampil

  // MEBEULAIR & TEKNOLOGI (wadah lengkap)
  const fur = isObj(PR?.furniture) ? PR.furniture : TEMPLATE.prasarana.furniture;

  const mejaRoom = fur?.tables ?? room0();
  const kursiRoom = fur?.chairs ?? room0();
  const papanRoom = fur?.whiteboard ?? room0();

  const mejaCount = num(getData(fur, ["tables", "total_all"], undefined), num(getData(fur, ["tables", "total"], 0), 0));
  const kursiCount = num(getData(fur, ["chairs", "total_all"], undefined), num(getData(fur, ["chairs", "total"], 0), 0));
  const papanCount = num(
    getData(fur, ["whiteboard", "total_all"], undefined),
    num(getData(fur, ["whiteboard", "total"], 0), 0)
  );

  const komputerTotal = num(getData(fur, ["computer", "total"], 0), 0);
  const chromebookTotal = num(getData(PR, ["chromebook", "total"], 0), 0);

  const mejaBR = furnitureBaikRusak(mejaRoom);
  const kursiBR = furnitureBaikRusak(kursiRoom);
  const papanBR = furnitureBaikRusak(papanRoom);

  const komputerBaik = num(getData(fur, ["computer", "good"], 0), 0);
  const chromebookBaik = num(getData(PR, ["chromebook", "good"], 0), 0);

  const peralatanRumahTangga =
    PR?.peralatanRumahTangga ?? PR?.peralatan_rumah_tangga ?? KELEM?.alatRumahTangga ?? KELEM?.alat_rumah_tangga ?? null;

  // ===================== (FIX) RENCANA KEGIATAN FISIK =====================
  const rencanaRehabRK = rehabKegiatan;
  const rencanaBangunRKB = pembangunanKegiatan;

  const rencanaRehabToilet = firstNumber(
    getData(META, ["kegiatanFisik", "rehabToilet"], undefined),
    getData(META, ["kegiatanFisik", "rehab_toilet"], undefined),
    getData(META, ["kegiatanFisik", "rehabToiletUnit"], undefined),
    kf?.rehabToilet
  );

  const rencanaBangunToilet = firstNumber(
    getData(META, ["kegiatanFisik", "pembangunanToilet"], undefined),
    getData(META, ["kegiatanFisik", "pembangunan_toilet"], undefined),
    getData(META, ["kegiatanFisik", "bangunToilet"], undefined),
    kf?.pembangunanToilet
  );

  // ===================== (FIX) ROMBEL flexible =====================
  const rombelRaw = isObj(META?.rombel) ? META.rombel : TEMPLATE.rombel;
  const rombelLoose = useMemo(() => deriveRombelStructFromFlat(metaFlat), [metaFlat]);

  const rombelObj = useMemo(() => mergeFill(rombelRaw, rombelLoose), [rombelRaw, rombelLoose]);

  const rombelRows = buildRombelPkbmRows(rombelObj);
  const totalRombel = num(getData(rombelObj, ["total"], undefined), sumRombelPkbm(rombelObj));

  // KELEMBAGAAN
  const kelembagaanBlocks = renderKelembagaanWadah(KELEM);

  // GURU
  const guruMeta = isObj(META?.guru) ? META.guru : TEMPLATE.guru;
  const gPns = num(getData(guruMeta, ["pns"], 0), 0);
  const gPppk = num(getData(guruMeta, ["pppk"], 0), 0);
  const gPppkPt = num(getData(guruMeta, ["pppkParuhWaktu"], 0), 0);
  const gNonDap = num(getData(guruMeta, ["nonAsnDapodik"], 0), 0);
  const gNonNo = num(getData(guruMeta, ["nonAsnTidakDapodik"], 0), 0);
  const kekuranganGuru = num(getData(guruMeta, ["kekuranganGuru"], 0), 0);
  const totalGuru = gPns + gPppk + gPppkPt + gNonDap + gNonNo;

  // ===================== (FIX) LULUSAN / MELANJUTKAN =====================
  // legacy folder lanjut masih didukung
  const lanjut = isObj(META?.lanjut) ? META.lanjut : TEMPLATE.lanjut;

  const lanjutA = isObj(lanjut?.paketA) ? lanjut.paketA : TEMPLATE.lanjut.paketA;
  const lanjutB = isObj(lanjut?.paketB) ? lanjut.paketB : TEMPLATE.lanjut.paketB;
  const lanjutC = isObj(lanjut?.paketC) ? lanjut.paketC : TEMPLATE.lanjut.paketC;

  // fallback ke key baru / label panjang:
  const a_smp = Math.max(
    getLanjutVal(lanjutA, ["smp"]),
    pickFlatByTokenSets(metaFlat, [
      ["lanjut", "paketa", "smp"],
      ["siswalanjut", "paketa", "smp"],
      ["siswalanjutdalamkab", "paketa", "smp"],
      ["siswalanjutluarkab", "paketa", "smp"],
    ])
  );

  const a_mts = Math.max(
    getLanjutVal(lanjutA, ["mts", "mtS"]),
    pickFlatByTokenSets(metaFlat, [
      ["lanjut", "paketa", "mts"],
      ["siswalanjut", "paketa", "mts"],
      ["siswalanjutdalamkab", "paketa", "mts"],
      ["siswalanjutluarkab", "paketa", "mts"],
    ])
  );

  const a_pontren = Math.max(
    getLanjutVal(lanjutA, ["pontren", "pesantren"]),
    pickFlatByTokenSets(metaFlat, [
      ["lanjut", "paketa", "pontren"],
      ["lanjut", "paketa", "pesantren"],
      ["siswalanjut", "paketa", "pontren"],
      ["siswalanjut", "paketa", "pesantren"],
    ])
  );

  const a_paketb = Math.max(
    getLanjutVal(lanjutA, ["paketb", "paket_b", "paketB"]),
    pickFlatByTokenSets(metaFlat, [
      ["lanjut", "paketa", "paketb"],
      ["siswalanjut", "paketa", "paketb"],
    ])
  );

  const b_sma = Math.max(
    getLanjutVal(lanjutB, ["sma"]),
    pickFlatByTokenSets(metaFlat, [
      ["lanjut", "paketb", "sma"],
      ["siswalanjut", "paketb", "sma"],
    ])
  );

  const b_smk = Math.max(
    getLanjutVal(lanjutB, ["smk"]),
    pickFlatByTokenSets(metaFlat, [
      ["lanjut", "paketb", "smk"],
      ["siswalanjut", "paketb", "smk"],
    ])
  );

  const b_ma = Math.max(
    getLanjutVal(lanjutB, ["ma"]),
    pickFlatByTokenSets(metaFlat, [
      ["lanjut", "paketb", "ma"],
      ["siswalanjut", "paketb", "ma"],
    ])
  );

  const b_pontren = Math.max(
    getLanjutVal(lanjutB, ["pontren", "pesantren"]),
    pickFlatByTokenSets(metaFlat, [
      ["lanjut", "paketb", "pontren"],
      ["lanjut", "paketb", "pesantren"],
      ["siswalanjut", "paketb", "pontren"],
      ["siswalanjut", "paketb", "pesantren"],
    ])
  );

  const b_paketc = Math.max(
    getLanjutVal(lanjutB, ["paketc", "paket_c", "paketC"]),
    pickFlatByTokenSets(metaFlat, [
      ["lanjut", "paketb", "paketc"],
      ["siswalanjut", "paketb", "paketc"],
    ])
  );

  const c_pt = Math.max(
    getLanjutVal(lanjutC, ["perguruantinggi", "pt", "kampus"]),
    pickFlatByTokenSets(metaFlat, [
      ["lanjut", "paketc", "perguruantinggi"],
      ["lanjut", "paketc", "pt"],
      ["siswalanjut", "paketc", "perguruantinggi"],
      ["siswalanjut", "paketc", "pt"],
    ])
  );

  const c_bekerja = Math.max(
    getLanjutVal(lanjutC, ["bekerja", "kerja"]),
    pickFlatByTokenSets(metaFlat, [
      ["lanjut", "paketc", "bekerja"],
      ["lanjut", "paketc", "kerja"],
      ["siswalanjut", "paketc", "bekerja"],
      ["siswalanjut", "paketc", "kerja"],
      ["siswabekerja"],
    ])
  );

  // ✅ tambahan total yang “pasti ada” jika DB memakai key baru (tanpa folder lanjut)
  const totalLanjutDalamKab =
    firstNumber(getData(META, ["siswaLanjutDalamKab"], undefined), getData(META, ["siswa_lanjut_dalam_kab"], undefined)) ||
    sumFlatByTokens(metaFlat, ["siswalanjutdalamkab"]);

  const totalLanjutLuarKab =
    firstNumber(getData(META, ["siswaLanjutLuarKab"], undefined), getData(META, ["siswa_lanjut_luar_kab"], undefined)) ||
    sumFlatByTokens(metaFlat, ["siswalanjutluarkab"]);

  const totalTidakLanjut =
    firstNumber(
      getData(META, ["siswaTidakLanjut"], undefined),
      getData(META, ["siswa_tidak_lanjut"], undefined),
      getData(META, ["tidakLanjut"], undefined),
      getData(META, ["tidak_lanjut"], undefined)
    ) || sumFlatByTokens(metaFlat, ["tidaklanjut"]);

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

          {/* ✅ WADAH Koordinat */}
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

      {/* ===================== II. KONDISI PRASARANA (BARCHART JANGAN DIUBAH) ===================== */}
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
              <h4 className={styles.subsectionTitle}>RGKS (Gabungan)</h4>
              <div className={styles.dataRow}>
                <span>Jumlah RGKS (Total): {roomRGKS.total_all}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Kondisi Baik: {roomRGKS.good}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Ringan: {roomRGKS.light_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Sedang: {roomRGKS.moderate_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Berat: {roomRGKS.heavy_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Total: {roomRGKS.total_damage}</span>
              </div>
            </div>

            <div className={styles.subsection}>
              <h4 className={styles.subsectionTitle}>Perpustakaan</h4>
              <div className={styles.dataRow}>
                <span>Jumlah Perpustakaan (Total): {roomPerpus.total_all}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Kondisi Baik: {roomPerpus.good}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Ringan: {roomPerpus.light_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Sedang: {roomPerpus.moderate_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Berat: {roomPerpus.heavy_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Total: {roomPerpus.total_damage}</span>
              </div>
            </div>

            <div className={styles.subsection}>
              <h4 className={styles.subsectionTitle}>Laboratorium (Umum)</h4>
              <div className={styles.dataRow}>
                <span>Jumlah Laboratorium (Total): {roomLab.total_all}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Kondisi Baik: {roomLab.good}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Ringan: {roomLab.light_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Sedang: {roomLab.moderate_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Berat: {roomLab.heavy_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Total: {roomLab.total_damage}</span>
              </div>
            </div>

            <div className={styles.subsection}>
              <h4 className={styles.subsectionTitle}>Ruang Guru</h4>
              <div className={styles.dataRow}>
                <span>Jumlah Ruang Guru (Total): {roomGuru.total_all}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Kondisi Baik: {roomGuru.good}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Ringan: {roomGuru.light_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Sedang: {roomGuru.moderate_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Berat: {roomGuru.heavy_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Total: {roomGuru.total_damage}</span>
              </div>
            </div>

            <div className={styles.subsection}>
              <h4 className={styles.subsectionTitle}>Ruang Kepala Sekolah</h4>
              <div className={styles.dataRow}>
                <span>Jumlah Ruang Kepala Sekolah (Total): {roomKS.total_all}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Kondisi Baik: {roomKS.good}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Ringan: {roomKS.light_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Sedang: {roomKS.moderate_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Berat: {roomKS.heavy_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Total: {roomKS.total_damage}</span>
              </div>
            </div>

            <div className={styles.subsection}>
              <h4 className={styles.subsectionTitle}>Ruang TU</h4>
              <div className={styles.dataRow}>
                <span>Jumlah Ruang TU (Total): {roomTU.total_all}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Kondisi Baik: {roomTU.good}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Ringan: {roomTU.light_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Sedang: {roomTU.moderate_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Berat: {roomTU.heavy_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Total: {roomTU.total_damage}</span>
              </div>
            </div>

            <div className={styles.subsection}>
              <h4 className={styles.subsectionTitle}>UKS</h4>
              <div className={styles.dataRow}>
                <span>Jumlah Ruang UKS (Total): {roomUKS.total_all}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Kondisi Baik: {roomUKS.good}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Ringan: {roomUKS.light_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Sedang: {roomUKS.moderate_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Berat: {roomUKS.heavy_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Total: {roomUKS.total_damage}</span>
              </div>
            </div>

            <div className={styles.subsection}>
              <h4 className={styles.subsectionTitle}>Toilet Umum</h4>
              <div className={styles.dataRow}>
                <span>Jumlah Toilet Umum (Total): {roomToiletUmum.total_all}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Kondisi Baik: {roomToiletUmum.good}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Ringan: {roomToiletUmum.light_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Sedang: {roomToiletUmum.moderate_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Berat: {roomToiletUmum.heavy_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Total: {roomToiletUmum.total_damage}</span>
              </div>
            </div>

            <div className={styles.subsection}>
              <h4 className={styles.subsectionTitle}>Rumah Dinas</h4>
              <div className={styles.dataRow}>
                <span>Jumlah Rumah Dinas (Total): {roomRumahDinas.total_all}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Kondisi Baik: {roomRumahDinas.good}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Ringan: {roomRumahDinas.light_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Sedang: {roomRumahDinas.moderate_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Berat: {roomRumahDinas.heavy_damage}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Total: {roomRumahDinas.total_damage}</span>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.subsectionTitle}>Mebeulair & Peralatan Teknologi</h3>

            <div className={styles.subsection}>
              <h4 className={styles.subsectionTitle}>Meja</h4>
              <div className={styles.dataRow}>
                <span>Jumlah Meja (Total): {mejaCount || mejaBR.total}</span>
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
                <span>Jumlah Kursi (Total): {kursiCount || kursiBR.total}</span>
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
                <span>Jumlah Papan Tulis (Total): {papanCount || papanBR.total}</span>
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
          {/* ✅ (FIX) Total key baru (tanpa folder lanjut) */}
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Ringkasan (Dari Key Baru)</h3>
            <div className={styles.dataRow}>
              <span>Siswa lanjut dalam kabupaten: {num(totalLanjutDalamKab, 0)}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Siswa lanjut luar kabupaten: {num(totalLanjutLuarKab, 0)}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Tidak lanjut: {num(totalTidakLanjut, 0)}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Paket A (Lanjut)</h3>
            <div className={styles.dataRow}>
              <span>Lanjut ke SMP: {a_smp}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Lanjut ke MTs: {a_mts}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Lanjut ke Pontren: {a_pontren}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Lanjut ke Paket B: {a_paketb}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Paket B (Lanjut)</h3>
            <div className={styles.dataRow}>
              <span>Lanjut ke SMA: {b_sma}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Lanjut ke SMK: {b_smk}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Lanjut ke MA: {b_ma}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Lanjut ke Pontren: {b_pontren}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Lanjut ke Paket C: {b_paketc}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Paket C (Lanjut)</h3>
            <div className={styles.dataRow}>
              <span>Lanjut ke Perguruan Tinggi: {c_pt}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Bekerja: {c_bekerja}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== XII. KELEMBAGAAN ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>VI. Kelembagaan</h2>
        <div className={styles.card}>{kelembagaanBlocks}</div>
      </div>

      {/* ===================== VI. DATA GURU ===================== */}
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
