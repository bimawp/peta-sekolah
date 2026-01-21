// src/pages/SchoolDetail/SchoolDetailSd.jsx
import React from "react";
import styles from "./SchoolDetailSd.module.css";

const getData = (data, path, def = "N/A") => {
  const v = path.reduce((o, k) => (o && o[k] != null ? o[k] : undefined), data);
  if (v === 0 || v === 0.0) return 0;
  return v !== undefined ? v : def;
};

const num = (v, d = 0) => (v == null || Number.isNaN(Number(v)) ? d : Number(v));

// ===================== UTIL TAMBAHAN (SESUAI SMP) =====================
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

const toNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const pickStr = (...vals) => {
  for (const v of vals) {
    if (v === 0 || v === "0") return "0";
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
};

// ambil angka "terbesar" dari kandidat yang valid (agar tidak mentok 0 dari META jika BASE punya data)
const pickMaxNumber = (...vals) => {
  let best = null;
  let hasFinite = false;
  for (const v of vals) {
    const n = Number(v);
    if (Number.isFinite(n)) {
      hasFinite = true;
      if (best === null || n > best) best = n;
    }
  }
  return hasFinite ? best : 0;
};

const pickFirstFinite = (...vals) => {
  for (const v of vals) {
    if (v === 0 || v === "0") return 0;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
};

// khusus koordinat: jangan “mengunci” di 0 jika kandidat berikutnya punya koordinat valid
const pickCoord = (...vals) => {
  let sawZero = false;
  for (const v of vals) {
    if (v == null || v === "") continue;
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    if (n === 0) {
      sawZero = true;
      continue;
    }
    return n;
  }
  return sawZero ? 0 : 0;
};

const deepMerge = (base, patch) => {
  if (!isObj(base)) base = {};
  if (!isObj(patch)) return base;
  const out = { ...base };
  for (const k of Object.keys(patch)) {
    const bv = out[k];
    const pv = patch[k];
    if (isObj(bv) && isObj(pv)) out[k] = deepMerge(bv, pv);
    else out[k] = pv;
  }
  return out;
};

function mergeMeta(meta, details) {
  const m = isObj(meta) ? meta : {};
  const d = isObj(details) ? details : {};
  const dMeta = isObj(d?.meta) ? d.meta : {};
  const dMetaAlt = !Object.keys(dMeta).length && isObj(d) ? d : {};
  return deepMerge(m, Object.keys(dMeta).length ? dMeta : dMetaAlt);
}

// Unwrap payload RPC: {data:{...}} / {school:{...}} / {payload:{...}} / {detail:{...}}
function unwrapPayload(x) {
  let cur = x;
  for (let i = 0; i < 4; i++) {
    if (!isObj(cur)) break;
    if (isObj(cur.data)) cur = cur.data;
    else if (isObj(cur.school)) cur = cur.school;
    else if (isObj(cur.detail)) cur = cur.detail;
    else if (isObj(cur.payload)) cur = cur.payload;
    else break;
  }
  return cur;
}

// ===================== (FIX) Regex fleksibel untuk Kelas/Rombel =====================
const RX_KELAS_FLEX = /^(kelas|kelaskelas)(\d+)(?:_([LP]))?$/i;

const collectKelasGenderRows = (obj) => {
  // Dukung:
  // 1) {kelas1:{l,p}, kelas2:{l,p}, ...}
  // 2) flat: {kelaskelas1_L: n, kelaskelas1_P: n, kelas2_L: n, ...}
  if (!isObj(obj)) return [];

  const bucket = new Map(); // grade -> {male,female,totalOnly?}
  for (const [k, v] of Object.entries(obj)) {
    const m = String(k).match(RX_KELAS_FLEX);
    if (!m) continue;

    const grade = parseInt(m[2], 10) || 0;
    const gKey = grade;
    const suffix = (m[3] || "").toUpperCase(); // L / P / ""

    if (!bucket.has(gKey)) bucket.set(gKey, { male: 0, female: 0, totalOnly: null });

    const cur = bucket.get(gKey);

    // bentuk nested object: {kelas1:{l,p}}
    if (!suffix && isObj(v)) {
      const male = toNum(getData(v, ["l"], 0), 0);
      const female = toNum(getData(v, ["p"], 0), 0);
      cur.male = Math.max(cur.male, male);
      cur.female = Math.max(cur.female, female);
      continue;
    }

    // bentuk number langsung
    if (typeof v === "number" || (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)))) {
      const n = toNum(v, 0);
      if (suffix === "L") cur.male += n;
      else if (suffix === "P") cur.female += n;
      else {
        // tidak ada info gender -> simpan sebagai totalOnly (agar tetap tampil)
        cur.totalOnly = Math.max(toNum(cur.totalOnly, 0), n);
      }
    }
  }

  const sortedGrades = Array.from(bucket.keys()).sort((a, b) => (a || 0) - (b || 0));

  return sortedGrades.map((grade) => {
    const x = bucket.get(grade) || { male: 0, female: 0, totalOnly: null };
    const male = toNum(x.male, 0);
    const female = toNum(x.female, 0);
    const totalLP = male + female;
    const total = totalLP > 0 ? totalLP : toNum(x.totalOnly, 0);

    return {
      key: `kelas${grade}`,
      grade,
      label: `Kelas ${grade}`,
      male,
      female,
      total,
    };
  });
};

const sumFromKelasRows = (rows) => {
  let l = 0;
  let p = 0;
  let total = 0;
  for (const r of rows) {
    const ml = toNum(r.male, 0);
    const fp = toNum(r.female, 0);
    const tt = toNum(r.total, ml + fp);
    l += ml;
    p += fp;
    total += tt;
  }
  // jika total berbasis LP tersedia, total seharusnya l+p; namun jika hanya totalOnly yang ada, total sudah benar
  const lpTotal = l + p;
  return { l, p, total: lpTotal > 0 ? lpTotal : total };
};

const pickTotalsFromSiswaObj = (obj) => {
  if (!isObj(obj)) return { l: 0, p: 0, total: 0 };

  const kelasRows = collectKelasGenderRows(obj);
  if (kelasRows.length) return sumFromKelasRows(kelasRows);

  const tL = pickMaxNumber(obj?.total?.l, obj?.l, obj?.male, obj?.laki_laki, obj?.lk);
  const tP = pickMaxNumber(obj?.total?.p, obj?.p, obj?.female, obj?.perempuan, obj?.pr);
  if ((tL || 0) + (tP || 0) > 0) {
    return { l: toNum(tL, 0), p: toNum(tP, 0), total: toNum(tL, 0) + toNum(tP, 0) };
  }

  // fallback recursive: jumlahkan semua leaf .l/.p
  let l = 0;
  let p = 0;
  const walk = (x) => {
    if (!isObj(x)) return;
    for (const kk of Object.keys(x)) {
      const vv = x[kk];
      if (kk === "l") l += toNum(vv, 0);
      else if (kk === "p") p += toNum(vv, 0);
      else if (isObj(vv)) walk(vv);
    }
  };
  walk(obj);
  return { l, p, total: l + p };
};

const normalizeRoom = (src) => {
  // dukung bentuk angka langsung: 3 -> {total_all:3}
  const o =
    typeof src === "number"
      ? { total_all: src }
      : src && typeof src === "object"
      ? src
      : {};

  // 5-level kondisi: baik, rusak ringan, rusak sedang, rusak berat, rusak total
  const good = pickMaxNumber(o.good, o.classrooms_good, o.baik, 0);
  const light = pickMaxNumber(
    o.light_damage,
    o.classrooms_light_damage,
    o.rusak_ringan,
    o.rusakRingan,
    0
  );
  const moderate = pickMaxNumber(
    o.moderate_damage,
    o.classrooms_moderate_damage,
    o.rusak_sedang,
    o.rusakSedang,
    0
  );
  const heavy = pickMaxNumber(
    o.heavy_damage,
    o.classrooms_heavy_damage,
    o.rusak_berat,
    o.rusakBerat,
    0
  );
  const totalDamage = pickMaxNumber(
    o.total_damage,
    o.classrooms_total_damage,
    o.rusak_total,
    o.rusakTotal,
    0
  );

  const computedTotal =
    toNum(good, 0) +
    toNum(light, 0) +
    toNum(moderate, 0) +
    toNum(heavy, 0) +
    toNum(totalDamage, 0);

  const totalAll = pickMaxNumber(o.total_all, o.total, o.total_room, o.jumlah, computedTotal, 0);
  const totalMh = pickMaxNumber(
    o.total_mh,
    toNum(moderate, 0) + toNum(heavy, 0) + toNum(totalDamage, 0),
    0
  );

  return {
    good: toNum(good, 0),
    light_damage: toNum(light, 0),
    moderate_damage: toNum(moderate, 0),
    heavy_damage: toNum(heavy, 0),
    total_damage: toNum(totalDamage, 0),
    total_all: toNum(totalAll, 0),
    total_mh: toNum(totalMh, 0),
  };
};

const normalizeToiletGender = (src) => {
  const o =
    typeof src === "number"
      ? { total_all: src }
      : src && typeof src === "object"
      ? src
      : {};

  const good = pickMaxNumber(o.good, o.baik, 0);
  const light = pickMaxNumber(o.light_damage, o.rusak_ringan, o.rusakRingan, 0);
  const moderate = pickMaxNumber(o.moderate_damage, o.rusak_sedang, o.rusakSedang, 0);
  const heavy = pickMaxNumber(o.heavy_damage, o.rusak_berat, o.rusakBerat, 0);
  const totalDamage = pickMaxNumber(o.total_damage, o.rusak_total, o.rusakTotal, 0);

  const computedTotal =
    toNum(good, 0) + toNum(light, 0) + toNum(moderate, 0) + toNum(heavy, 0) + toNum(totalDamage, 0);

  const totalAll = pickMaxNumber(o.total_all, o.total, o.jumlah, computedTotal, 0);
  const totalMh = pickMaxNumber(
    o.total_mh,
    toNum(moderate, 0) + toNum(heavy, 0) + toNum(totalDamage, 0),
    0
  );

  return {
    good: toNum(good, 0),
    light_damage: toNum(light, 0),
    moderate_damage: toNum(moderate, 0),
    heavy_damage: toNum(heavy, 0),
    total_damage: toNum(totalDamage, 0),
    total_all: toNum(totalAll, 0),
    total_mh: toNum(totalMh, 0),
  };
};

const normalizeToilet = (src) => {
  const o = src && typeof src === "object" ? src : {};
  const maleSrc = o.male ?? o.laki_laki ?? o.lakiLaki ?? o.lk ?? o.guru_lk ?? o.siswa_lk;
  const femaleSrc = o.female ?? o.perempuan ?? o.pr ?? o.guru_pr ?? o.siswa_pr;
  return {
    male: normalizeToiletGender(maleSrc),
    female: normalizeToiletGender(femaleSrc),
  };
};

// ===================== fasilitas helpers (view/tabel lain) =====================
const pickFirstObj = (...vals) => {
  for (const v of vals) {
    if (isObj(v) && Object.keys(v).length) return v;
  }
  for (const v of vals) {
    if (isObj(v)) return v;
  }
  return {};
};

const roomByKeys = (root, keys) => {
  if (!isObj(root)) return undefined;
  for (const k of keys) {
    const v = root?.[k];
    if (v == null) continue;
    if (typeof v === "number") return v;
    if (isObj(v)) return v;
  }
  return undefined;
};

const getFacilitiesRoots = (BASE) => {
  const fac = pickFirstObj(BASE?.facilities, BASE?._raw?.facilities, BASE?.facility, BASE?.fasilitas);
  const raw = pickFirstObj(
    fac?.raw_facilities,
    fac?.rawFacilities,
    BASE?.raw_facilities,
    BASE?.facilities_raw,
    BASE?._raw?.raw_facilities,
    BASE?._raw?.facilities_raw
  );

  // beberapa view menaruh rooms_by_type langsung di row
  const roomsByType = pickFirstObj(
    raw?.rooms_by_type,
    raw?.roomsByType,
    fac?.rooms_by_type,
    fac?.roomsByType,
    BASE?.rooms_by_type,
    BASE?.roomsByType
  );

  const rooms = pickFirstObj(raw?.rooms, fac?.rooms, BASE?.rooms, BASE?.room, raw?.prasarana_rooms);
  const labs = pickFirstObj(raw?.labs, fac?.labs, raw?.laboratorium, fac?.laboratorium, BASE?.labs);
  const furniture = pickFirstObj(
    raw?.furniture,
    fac?.furniture,
    BASE?.furniture,
    BASE?.mebeulair,
    raw?.mebeulair,
    fac?.mebeulair,
    BASE?.furniture_by_category,
    BASE?.furnitureByCategory
  );
  const toilets = pickFirstObj(raw?.toilets, fac?.toilets, raw?.toilet, fac?.toilet, BASE?.toilets);

  return { fac, raw, roomsByType, rooms, labs, furniture, toilets };
};

function extractIntervensiFromMeta(meta, base) {
  const m0 = isObj(meta) ? meta : {};
  const b = isObj(base) ? base : {};

  const parseMaybeJson = (v) => {
    if (typeof v === "string") {
      try {
        return JSON.parse(v);
      } catch {
        return v;
      }
    }
    return v;
  };

  // (FIX) prioritas rehab_unit & pembangunan_unit
  let rehab = pickMaxNumber(
    m0?.kegiatanFisik?.rehab_unit,
    m0?.kegiatanFisik?.rehabilitasi_unit,
    m0?.kegiatanFisik?.rehabRuangKelas,
    m0?.rehab_unit,
    m0?.rehabilitasi_unit,
    m0?.prasarana?.classrooms?.rehab_unit,
    b?.rehab_unit
  );

  let pembangunan = pickMaxNumber(
    m0?.kegiatanFisik?.pembangunan_unit,
    m0?.kegiatanFisik?.bangun_unit,
    m0?.kegiatanFisik?.pembangunanRKB,
    m0?.pembangunan_unit,
    m0?.bangun_unit,
    m0?.prasarana?.classrooms?.pembangunan_unit,
    b?.pembangunan_unit
  );

  // fallback ke kemungkinan tabel/view: school_projects / projects / intervensi list
  const candidates = [
    m0?.kegiatanFisik,
    m0?.kegiatan,
    b?.kegiatan,
    m0?.projects,
    m0?.intervensi,
    b?.projects,
    b?.school_projects,
    b?.schoolProjects,
  ].map(parseMaybeJson);

  const list = candidates.find((v) => Array.isArray(v)) || null;

  const getUnit = (it) => toNum(it?.lokal ?? it?.unit ?? it?.jumlah ?? it?.count ?? it?.volume ?? 0, 0);
  const getType = (it) =>
    String(
      it?.kegiatan_type ??
        it?.type ??
        it?.jenis ??
        it?.kegiatan ??
        it?.activity_name ??
        it?.name ??
        it?.kegiatan_nama ??
        ""
    )
      .toLowerCase()
      .trim();

  if (Array.isArray(list)) {
    let rSum = 0;
    let pSum = 0;
    for (const it of list) {
      const t = getType(it);
      if (!t) continue;
      if (t === "rehab" || t.includes("rehab") || t.includes("rehabilit")) rSum += getUnit(it);
      else if (t === "pembangunan" || t.includes("pembangunan") || t.includes("bangun") || t.includes("rkb"))
        pSum += getUnit(it);
    }
    rehab = Math.max(toNum(rehab, 0), rSum);
    pembangunan = Math.max(toNum(pembangunan, 0), pSum);
  }

  return { rehab_unit: toNum(rehab, 0), pembangunan_unit: toNum(pembangunan, 0) };
}

function extractIntervensiToiletFromMeta(meta, base) {
  const m0 = isObj(meta) ? meta : {};
  const b = isObj(base) ? base : {};
  const kf = isObj(m0?.kegiatanFisik) ? m0.kegiatanFisik : {};

  const rehabToilet = pickMaxNumber(
    kf?.rehabToilet,
    kf?.rehab_toilet,
    kf?.rehabilitasiToilet,
    kf?.rehabilitasi_toilet,
    m0?.rehabToilet,
    m0?.rehab_toilet,
    b?.rehab_toilet,
    b?.rehabToilet
  );
  const pembangunanToilet = pickMaxNumber(
    kf?.pembangunanToilet,
    kf?.pembangunan_toilet,
    kf?.bangunToilet,
    kf?.bangun_toilet,
    m0?.pembangunanToilet,
    m0?.pembangunan_toilet,
    b?.pembangunan_toilet,
    b?.pembangunanToilet
  );

  return {
    rehab_toilet_unit: toNum(rehabToilet, 0),
    pembangunan_toilet_unit: toNum(pembangunanToilet, 0),
  };
}

// ===================== KELEMBAGAAN MAPPER =====================
const mapYesNo = (v) => (v === "YA" ? "Ya" : v === "TIDAK" ? "Tidak" : v || "-");
const mapSudahBelum = (v) => (v === "SUDAH" ? "Sudah" : v === "BELUM" ? "Belum" : v || "-");
const mapPeralatan = (v) => {
  const raw = String(v ?? "").trim();
  const up = raw.toUpperCase().replace(/\s+/g, "_");

  if (!raw) return "-";
  if (up === "TIDAK_MEMILIKI" || up === "TIDAK_PUNYA" || up === "TIDAK_ADA") return "Tidak Memiliki";
  if (up === "HARUS_DIGANTI" || up === "GANTI" || up === "PERLU_DIGANTI") return "Harus Diganti";
  if (up === "BAIK") return "Baik";
  if (up === "PERLU_REHABILITASI" || up === "PERLU_REHAB" || up === "REHABILITASI") return "Perlu Rehabilitasi";

  if (raw.toLowerCase() === "tidak memiliki") return "Tidak Memiliki";
  if (raw.toLowerCase() === "harus diganti") return "Harus Diganti";
  if (raw.toLowerCase() === "perlu rehabilitasi") return "Perlu Rehabilitasi";
  if (raw.toLowerCase() === "baik") return "Baik";

  return raw || "-";
};

const SchoolDetailSd = ({ schoolData }) => {
  // ====== FIX: unwrap payload + satukan meta/details ======
  const BASE0 = unwrapPayload(schoolData);
  const BASE = isObj(BASE0) ? BASE0 : {};

  // merge meta dari beberapa tempat yang umum (meta + details.meta atau details langsung)
  const mergedMeta0 = mergeMeta(BASE?.meta ?? BASE?._raw?.meta, BASE?.details ?? BASE?._raw?.details);

  // kalau kegiatan ada sebagai kolom terpisah, gabungkan agar extractor bisa baca
  const META = BASE?.kegiatan != null ? deepMerge(mergedMeta0, { kegiatan: BASE.kegiatan }) : mergedMeta0;

  const PR = META?.prasarana || {};
  const KL = META?.kelembagaan || {};

  // ====== ambil fasilitas dari view/tabel lain (agar tidak nol ketika meta kosong) ======
  const { fac, raw, roomsByType, rooms: roomsAny, labs: labsAny, furniture: furnitureAny, toilets: toiletsAny } =
    getFacilitiesRoots(BASE);

  // class_condition biasanya tersedia di view
  const CLASSCOND = pickFirstObj(BASE?.class_condition, BASE?._raw?.class_condition, BASE?.classCondition);

  // staff_summary biasanya tersedia di view
  const staff0 = Array.isArray(BASE?.staff_summary)
    ? BASE.staff_summary[0]
    : isObj(BASE?.staff_summary)
    ? BASE.staff_summary
    : isObj(BASE?.staffSummary)
    ? BASE.staffSummary
    : null;

  // ====== koordinat (wadah lat/lng) ======
  // (FIX) Prioritas: META.location_detail.extra.latitude/longitude
  const latVal = pickCoord(
    META?.location_detail?.extra?.latitude,
    META?.location_detail?.extra?.lat,
    META?.location_detail?.latitude,
    META?.location_detail?.lat,
    META?.lokasi?.latitude,
    META?.lokasi?.lat,
    BASE?.lat,
    BASE?._raw?.lat,
    BASE?.latitude,
    BASE?.koordinat_lat,
    META?.lat,
    META?.latitude
  );

  const lngVal = pickCoord(
    META?.location_detail?.extra?.longitude,
    META?.location_detail?.extra?.lng,
    META?.location_detail?.extra?.lon,
    META?.location_detail?.longitude,
    META?.location_detail?.lng,
    META?.location_detail?.lon,
    META?.lokasi?.longitude,
    META?.lokasi?.lng,
    META?.lokasi?.lon,
    BASE?.lng,
    BASE?._raw?.lng,
    BASE?.longitude,
    BASE?.koordinat_lng,
    META?.lng,
    META?.longitude
  );

  const handleLocationClick = () => {
    const coords =
      BASE?.coordinates ??
      (() => {
        const lat = Number(latVal);
        const lng = Number(lngVal);
        if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) return [lng, lat];
        return null;
      })();

    if (Array.isArray(coords) && coords.length === 2) {
      let lng = Number(coords[0]);
      let lat = Number(coords[1]);

      if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
        [lat, lng] = [lng, lat];
      }

      if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
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

  // ===================== IDENTITAS =====================
  const nama =
    pickStr(
      BASE?.name,
      BASE?.namaSekolah,
      BASE?.nama_sekolah,
      BASE?.school_name,
      BASE?._raw?.name,
      META?.namaSekolah,
      META?.nama_sekolah
    ) || "Nama Sekolah Tidak Tersedia";

  const npsn = pickStr(BASE?.npsn, BASE?.NPSN, BASE?._raw?.npsn, META?.npsn) || "-";
  const alamat = pickStr(BASE?.address, BASE?.alamat, BASE?._raw?.address, META?.alamat) || "-";
  const desa = pickStr(BASE?.desa, BASE?.village, BASE?.village_name, META?.desa, META?.village_name) || "-";
  const kecamatan =
    pickStr(BASE?.kecamatan, BASE?.kecamatan_name, META?.kecamatan, META?.kecamatan_name) || "—";
  const jenjang = pickStr(BASE?.jenjang, BASE?.level, BASE?.school_types?.code, META?.jenjang) || "SD";
  const statusSekolah = pickStr(BASE?.status, BASE?.status_sekolah, META?.status) || "-";

  // ===================== DATA SISWA (total + wadah per kelas) =====================
  const siswaMetaTotals = pickTotalsFromSiswaObj(META?.siswa);

  const siswaLBase = pickMaxNumber(
    BASE?.st_male,
    BASE?.student_male,
    BASE?.students_male,
    BASE?.students?.male,
    BASE?.students?.l,
    BASE?.siswa_l
  );
  const siswaPBase = pickMaxNumber(
    BASE?.st_female,
    BASE?.student_female,
    BASE?.students_female,
    BASE?.students?.female,
    BASE?.students?.p,
    BASE?.siswa_p
  );
  const totalFromLP = siswaLBase + siswaPBase;

  const siswaL = totalFromLP > 0 ? siswaLBase : toNum(siswaMetaTotals.l, 0);
  const siswaP = totalFromLP > 0 ? siswaPBase : toNum(siswaMetaTotals.p, 0);
  const totalSiswa =
    siswaL + siswaP > 0
      ? siswaL + siswaP
      : pickMaxNumber(BASE?.student_count, BASE?.students_total, META?.student_count, siswaMetaTotals.total, 0);

  // ABK dari meta.siswaAbk
  const abkMetaTotals = pickTotalsFromSiswaObj(META?.siswaAbk);
  const abkL = pickMaxNumber(abkMetaTotals.l, BASE?.abk_l, BASE?.abk_male, 0);
  const abkP = pickMaxNumber(abkMetaTotals.p, BASE?.abk_p, BASE?.abk_female, 0);

  const siswaKelasRows = collectKelasGenderRows(META?.siswa).filter((r) => r.grade >= 1 && r.grade <= 6);
  const abkKelasRows = collectKelasGenderRows(META?.siswaAbk).filter((r) => r.grade >= 1 && r.grade <= 6);

  // ===================== KONDISI KELAS =====================
  const classrooms = isObj(PR?.classrooms)
    ? PR.classrooms
    : isObj(PR?.kelas)
    ? PR.kelas
    : isObj(PR?.ruangKelas)
    ? PR.ruangKelas
    : {};

  const kelasBaik = pickMaxNumber(
    classrooms?.good,
    classrooms?.classrooms_good,
    classrooms?.baik,
    CLASSCOND?.classrooms_good,
    CLASSCOND?.good,
    BASE?.kondisiKelas?.baik,
    0
  );
  const rusakSedang = pickMaxNumber(
    classrooms?.moderate_damage,
    classrooms?.classrooms_moderate_damage,
    classrooms?.rusak_sedang,
    classrooms?.rusakSedang,
    CLASSCOND?.classrooms_moderate_damage,
    CLASSCOND?.moderate_damage,
    BASE?.kondisiKelas?.rusakSedang,
    0
  );
  const rusakBerat = pickMaxNumber(
    classrooms?.heavy_damage,
    classrooms?.classrooms_heavy_damage,
    classrooms?.rusak_berat,
    classrooms?.rusakBerat,
    CLASSCOND?.classrooms_heavy_damage,
    CLASSCOND?.heavy_damage,
    BASE?.kondisiKelas?.rusakBerat,
    0
  );
  const kurangRkb = pickMaxNumber(
    classrooms?.lacking_rkb,
    classrooms?.kurangRkb,
    classrooms?.kurang_rkb,
    CLASSCOND?.lacking_rkb,
    BASE?.kurangRKB,
    0
  );

  // tambahan wadah sesuai modul input
  const rusakRingan = pickMaxNumber(
    classrooms?.light_damage,
    classrooms?.classrooms_light_damage,
    classrooms?.rusak_ringan,
    classrooms?.rusakRingan,
    CLASSCOND?.classrooms_light_damage,
    CLASSCOND?.light_damage,
    BASE?.kondisiKelas?.rusakRingan,
    0
  );

  const rusakTotal = pickMaxNumber(
    classrooms?.total_damage,
    classrooms?.classrooms_total_damage,
    classrooms?.rusak_total,
    classrooms?.rusakTotal,
    CLASSCOND?.classrooms_total_damage,
    CLASSCOND?.total_damage,
    BASE?.kondisiKelas?.rusakTotal,
    0
  );

  const totalRuangKelas = pickMaxNumber(
    classrooms?.total_all,
    classrooms?.total,
    classrooms?.total_room,
    classrooms?.jumlah,
    CLASSCOND?.classrooms_total,
    CLASSCOND?.total_all,
    BASE?.total_ruang_kelas,
    BASE?.classrooms_total,
    toNum(kelasBaik, 0) +
      toNum(rusakRingan, 0) +
      toNum(rusakSedang, 0) +
      toNum(rusakBerat, 0) +
      toNum(rusakTotal, 0),
    0
  );

  const kelebihanKelas = pickMaxNumber(
    classrooms?.excess_class,
    classrooms?.kelebihan_kelas,
    classrooms?.kelebihanKelas,
    CLASSCOND?.excess_class,
    CLASSCOND?.kelebihan_kelas,
    BASE?.kelebihan_kelas,
    0
  );

  const ruangKelasTambahan = pickMaxNumber(
    classrooms?.additional_classrooms,
    classrooms?.ruang_kelas_tambahan,
    classrooms?.ruangKelasTambahan,
    CLASSCOND?.additional_classrooms,
    CLASSCOND?.ruang_kelas_tambahan,
    BASE?.ruang_kelas_tambahan,
    0
  );

  const lahanTersediaRaw = pickStr(
    classrooms?.land_available,
    classrooms?.ketersediaan_lahan,
    classrooms?.lahan_tersedia,
    CLASSCOND?.land_available,
    CLASSCOND?.ketersediaan_lahan,
    BASE?.land_available,
    BASE?.lahan_tersedia,
    META?.prasarana?.classrooms?.land_available,
    META?.prasarana?.classrooms?.lahan_tersedia
  );
  const lahanTersedia =
    String(lahanTersediaRaw).toLowerCase() === "true" ||
    String(lahanTersediaRaw).toUpperCase() === "YA" ||
    String(lahanTersediaRaw).toUpperCase() === "ADA";

  // Intervensi ruang kelas
  const intervensi = extractIntervensiFromMeta(META, BASE);

  // (FIX) Kategori XV: rehab_unit & pembangunan_unit sebagai prioritas utama
  const rehabKegiatan = toNum(
    pickMaxNumber(
      getData(META, ["kegiatanFisik", "rehab_unit"], 0),
      getData(META, ["kegiatanFisik", "rehabilitasi_unit"], 0),
      getData(META, ["kegiatanFisik", "rehabRuangKelas"], 0),
      intervensi.rehab_unit,
      BASE?.rehab_unit,
      0
    ),
    0
  );

  const pembangunanKegiatan = toNum(
    pickMaxNumber(
      getData(META, ["kegiatanFisik", "pembangunan_unit"], 0),
      getData(META, ["kegiatanFisik", "bangun_unit"], 0),
      getData(META, ["kegiatanFisik", "pembangunanRKB"], 0),
      intervensi.pembangunan_unit,
      BASE?.pembangunan_unit,
      0
    ),
    0
  );

  // Intervensi toilet
  const intervensiToilet = extractIntervensiToiletFromMeta(META, BASE);
  const rehabToiletKegiatan = toNum(intervensiToilet.rehab_toilet_unit, 0);
  const pembangunanToiletKegiatan = toNum(intervensiToilet.pembangunan_toilet_unit, 0);

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
    const v = Number(val) || 0;
    if (v <= 0) return "calc(0% + 20px)";
    return `calc(${(v / maxRoomValue) * 100}% + 20px)`;
  };

  // ===================== UKURAN / GEDUNG =====================
  const ukuran = isObj(PR?.ukuran) ? PR.ukuran : {};

  // (FIX) Kategori IV: prioritas META.luas_tanah & META.luas_bangunan
  const landArea = pickMaxNumber(
    META?.luas_tanah,
    META?.luasTanah,
    BASE?.luas_tanah,
    BASE?.land_area,
    BASE?.ukuran_tanah,
    ukuran?.tanah,
    0
  );

  const buildingArea = pickMaxNumber(
    META?.luas_bangunan,
    META?.luasBangunan,
    BASE?.luas_bangunan,
    BASE?.building_area,
    BASE?.ukuran_bangunan,
    ukuran?.bangunan,
    0
  );

  const yardArea = pickMaxNumber(ukuran?.halaman, BASE?.yard_area, BASE?.luas_halaman, BASE?.ukuran_halaman, 0);
  const jumlahGedung = pickMaxNumber(getData(PR, ["gedung", "jumlah"], 0), BASE?.building_count, BASE?.jumlah_gedung, 0);

  // ===================== DATA KELAS (TABLE school_classes + fallback meta.siswa) =====================
  const classes = BASE?.classes ?? schoolData?.classes ?? BASE?.class_counts ?? BASE?.classCounts ?? {};
  const g = (k) => toNum(classes?.[k], 0);

  const metaGradeGender = (rootObj, grade, gender) => {
    const root = isObj(rootObj) ? rootObj : {};
    const gUp = String(gender || "").toUpperCase() === "P" ? "P" : "L";
    const gLow = gUp === "P" ? "p" : "l";
    const k1 = `kelas${grade}`;
    const k2 = `kelaskelas${grade}`;

    // nested: {kelas1:{l,p}} atau {kelaskelas1:{l,p}}
    const nested = pickMaxNumber(
      getData(root, [k1, gLow], 0),
      getData(root, [k2, gLow], 0),
      0
    );

    // flat: kelas1_L / kelaskelas1_L
    const flat = pickMaxNumber(
      root[`${k1}_${gUp}`],
      root[`${k2}_${gUp}`],
      0
    );

    return toNum(pickMaxNumber(nested, flat, 0), 0);
  };

  const metaSiswaByGrade = (grade, gender) => metaGradeGender(META?.siswa, grade, gender);
  const metaAbkByGrade = (grade, gender) => metaGradeGender(META?.siswaAbk, grade, gender);

  // ===================== GURU =====================
  const guru = isObj(META?.guru) ? META.guru : {};
  const jumlahGuru = pickMaxNumber(
    guru?.jumlahGuru,
    guru?.jumlah_guru,
    staff0?.jumlah_guru,
    staff0?.teacher_count,
    staff0?.total_teachers,
    BASE?.teacher_count,
    0
  );

  const pns = pickMaxNumber(guru?.pns, staff0?.pns, staff0?.teacher_pns, staff0?.pns_teachers, 0);
  const pppk = pickMaxNumber(guru?.pppk, staff0?.pppk, staff0?.teacher_pppk, staff0?.pppk_teachers, 0);
  const pppkParuhWaktu = pickMaxNumber(
    guru?.pppkParuhWaktu,
    guru?.pppk_paruh_waktu,
    staff0?.pppk_paruh_waktu,
    staff0?.teacher_pppk_part_time,
    0
  );
  const nonAsnDapodik = pickMaxNumber(
    guru?.nonAsnDapodik,
    guru?.non_asn_dapodik,
    staff0?.non_asn_dapodik,
    staff0?.teacher_non_asn_dapodik,
    0
  );
  const nonAsnNonDapodik = pickMaxNumber(
    guru?.nonAsnTidakDapodik,
    guru?.non_asn_non_dapodik,
    staff0?.non_asn_tidak_dapodik,
    staff0?.teacher_non_asn_non_dapodik,
    0
  );
  const kekuranganGuru = pickMaxNumber(
    guru?.kekuranganGuru,
    guru?.kekurangan_guru,
    staff0?.kekurangan_guru,
    BASE?.kekurangan_guru,
    0
  );

  // ===================== ROMBEL =====================
  const rombel =
    (isObj(BASE?.rombel) ? BASE.rombel : null) ||
    (isObj(BASE?.rombel_summary) ? BASE.rombel_summary : null) ||
    (isObj(BASE?.rombelSummary) ? BASE.rombelSummary : null) ||
    (isObj(META?.rombel) ? META.rombel : {}) ||
    {};

  const r = (k) => toNum(rombel?.[k], 0);

  // (FIX) regex fleksibel & grouping jika ada _L/_P
  const rombelBucket = new Map(); // grade -> value sum
  for (const k of Object.keys(rombel)) {
    const m = String(k).match(RX_KELAS_FLEX);
    if (!m) continue;
    const grade = parseInt(m[2], 10) || 0;
    const v = toNum(rombel[k], 0);
    rombelBucket.set(grade, toNum(rombelBucket.get(grade), 0) + v);
  }

  const rombelRows = Array.from(rombelBucket.entries())
    .sort((a, b) => (a[0] || 0) - (b[0] || 0))
    .map(([grade, value]) => ({
      key: `kelas${grade}`,
      label: `Kelas ${grade}`,
      value: toNum(value, 0),
    }));

  const totalRombel = rombelRows.reduce((acc, it) => acc + toNum(it.value, 0), 0);

  // ===================== ROOMS / LABS / FURNITURE =====================
  const roomsRoot = isObj(PR?.rooms) ? PR.rooms : {};

  const librarySrc = pickFirstObj(
    roomsRoot?.library,
    roomsRoot?.perpustakaan,
    PR?.library,
    PR?.perpustakaan,
    roomByKeys(roomsAny, ["library", "perpustakaan"]),
    roomByKeys(roomsByType, ["perpustakaan", "library"]),
    roomByKeys(raw, ["perpustakaan", "library"])
  );
  const teacherRoomSrc = pickFirstObj(
    roomsRoot?.teacher_room,
    PR?.teacher_room,
    PR?.ruang_guru,
    roomByKeys(roomsAny, ["teacher_room", "ruang_guru", "guru"]),
    roomByKeys(roomsByType, ["guru", "teacher_room"])
  );
  const uksSrc = pickFirstObj(
    roomsRoot?.uks_room,
    PR?.uks_room,
    PR?.ruang_uks,
    roomByKeys(roomsAny, ["uks_room", "ruang_uks", "uks"]),
    roomByKeys(roomsByType, ["uks", "uks_room"])
  );

  // wadah tambahan: kepala sekolah, TU, toilet umum, rumah dinas
  const headmasterRoomSrc = pickFirstObj(
    roomsRoot?.headmaster_room,
    PR?.headmaster_room,
    PR?.ruang_kepala_sekolah,
    PR?.ruang_kepsek,
    roomByKeys(roomsAny, ["headmaster_room", "ruang_kepala_sekolah", "ruang_kepsek", "kepsek"]),
    roomByKeys(roomsByType, ["kepsek", "ruang_kepsek", "headmaster_room"])
  );

  const tuRoomSrc = pickFirstObj(
    roomsRoot?.tu_room,
    PR?.tu_room,
    PR?.ruang_tu,
    roomByKeys(roomsAny, ["tu_room", "ruang_tu", "tu"]),
    roomByKeys(roomsByType, ["tu", "ruang_tu", "tu_room"])
  );

  const publicToiletRoomSrc = pickFirstObj(
    roomsRoot?.public_toilet,
    PR?.public_toilet,
    PR?.toilet_umum,
    roomByKeys(roomsAny, ["public_toilet", "toilet_umum", "toilet_umum_sd", "toilet_umum_sekolah"]),
    roomByKeys(roomsByType, ["toilet_umum", "public_toilet"])
  );

  const rumahDinasRoomSrc = pickFirstObj(
    roomsRoot?.rumah_dinas,
    PR?.rumah_dinas,
    roomByKeys(roomsAny, ["rumah_dinas", "rumahdinas", "house_dinas"]),
    roomByKeys(roomsByType, ["rumah_dinas", "rumahdinas"])
  );

  const library = normalizeRoom(librarySrc);
  const teacherRoom = normalizeRoom(teacherRoomSrc);
  const uks = normalizeRoom(uksSrc);
  const headmasterRoom = normalizeRoom(headmasterRoomSrc);
  const tuRoom = normalizeRoom(tuRoomSrc);
  const publicToiletRoom = normalizeRoom(publicToiletRoomSrc);
  const rumahDinasRoom = normalizeRoom(rumahDinasRoomSrc);

  // Labs
  const labsRoot = isObj(PR?.labs) ? PR.labs : {};
  const labKomputer = normalizeRoom(
    pickFirstObj(
      labsRoot?.laboratory_comp,
      PR?.laboratory_comp,
      PR?.lab_komputer,
      labsAny?.laboratory_comp,
      labsAny?.lab_komputer,
      roomByKeys(raw, ["laboratory_comp", "lab_komputer"])
    )
  );
  const labIpa = normalizeRoom(
    pickFirstObj(
      labsRoot?.laboratory_ipa,
      PR?.laboratory_ipa,
      PR?.lab_ipa,
      labsAny?.laboratory_ipa,
      labsAny?.lab_ipa,
      roomByKeys(raw, ["laboratory_ipa", "lab_ipa"])
    )
  );

  // wadah lab umum (jika input Anda bentuknya "laboratorium umum")
  const labUmum = normalizeRoom(
    pickFirstObj(
      labsAny?.laboratorium_umum,
      labsAny?.lab_umum,
      PR?.laboratorium_umum,
      PR?.lab_umum,
      roomByKeys(labsAny, ["laboratorium_umum", "lab_umum"]),
      roomByKeys(roomsByType, ["laboratorium", "lab", "lab_umum", "laboratorium_umum"]),
      roomByKeys(raw, ["laboratorium_umum", "lab_umum"])
    )
  );

  // Toilet ringkasan
  const toiletOverall = pickFirstObj(
    PR?.toilets_overall,
    PR?.toilet_overall,
    toiletsAny,
    raw?.toilets_overall,
    raw?.toilet_overall,
    raw?.toilets,
    fac?.toilets_overall,
    fac?.toilets,
    roomByKeys(roomsByType, ["toiletgurusiswa", "toilets", "toilet"])
  );

  const toiletTotal = pickMaxNumber(toiletOverall?.total, toiletOverall?.total_all, toiletOverall?.jumlah, 0);
  const toiletGood = pickMaxNumber(toiletOverall?.good, toiletOverall?.baik, 0);
  const toiletLight = pickMaxNumber(toiletOverall?.light_damage, toiletOverall?.rusak_ringan, toiletOverall?.rusakRingan, 0);
  const toiletMod = pickMaxNumber(toiletOverall?.moderate_damage, toiletOverall?.rusak_sedang, 0);
  const toiletHeavy = pickMaxNumber(toiletOverall?.heavy_damage, toiletOverall?.rusak_berat, 0);
  const toiletTotalDamage = pickMaxNumber(toiletOverall?.total_damage, toiletOverall?.rusak_total, 0);

  // Detail toilet guru/siswa
  const teachersToilet = normalizeToilet(
    pickFirstObj(
      PR?.teachers_toilet,
      PR?.toilet_guru,
      PR?.toiletGuru,
      raw?.teachers_toilet,
      fac?.teachers_toilet,
      BASE?.teachers_toilet
    )
  );
  const studentsToilet = normalizeToilet(
    pickFirstObj(
      PR?.students_toilet,
      PR?.toilet_siswa,
      PR?.toiletSiswa,
      raw?.students_toilet,
      fac?.students_toilet,
      BASE?.students_toilet
    )
  );
  const toiletGuruMale = normalizeRoom(teachersToilet.male);
  const toiletGuruFemale = normalizeRoom(teachersToilet.female);
  const toiletSiswaMale = normalizeRoom(studentsToilet.male);
  const toiletSiswaFemale = normalizeRoom(studentsToilet.female);

  // Furniture
  const furnitureRoot = isObj(PR?.furniture)
    ? PR.furniture
    : isObj(PR?.mebeulair)
    ? PR.mebeulair
    : isObj(furnitureAny)
    ? furnitureAny
    : {};

  const mejaObj = isObj(furnitureRoot?.tables)
    ? furnitureRoot.tables
    : isObj(furnitureRoot?.meja)
    ? furnitureRoot.meja
    : isObj(furnitureRoot?.table)
    ? furnitureRoot.table
    : {};
  const kursiObj = isObj(furnitureRoot?.chairs)
    ? furnitureRoot.chairs
    : isObj(furnitureRoot?.kursi)
    ? furnitureRoot.kursi
    : isObj(furnitureRoot?.chair)
    ? furnitureRoot.chair
    : {};

  // papan tulis: tambah wadah kondisi baik/rusak
  const papanObj = isObj(furnitureRoot?.whiteboard)
    ? furnitureRoot.whiteboard
    : isObj(furnitureRoot?.papan_tulis)
    ? furnitureRoot.papan_tulis
    : isObj(furnitureRoot?.boards)
    ? furnitureRoot.boards
    : {};

  const mejaCat = isObj(BASE?.furniture_by_category) ? BASE.furniture_by_category?.tables : undefined;
  const kursiCat = isObj(BASE?.furniture_by_category) ? BASE.furniture_by_category?.chairs : undefined;

  const mejaTotal = toNum(
    pickMaxNumber(
      mejaObj?.total,
      mejaObj?.total_all,
      getData(furnitureRoot, ["tables", "total"], 0),
      typeof mejaCat === "number" ? mejaCat : undefined,
      0
    ),
    0
  );
  const mejaGood = toNum(pickMaxNumber(mejaObj?.good, getData(furnitureRoot, ["tables", "good"], 0), 0), 0);
  const mejaMod = toNum(
    pickMaxNumber(mejaObj?.moderate_damage, getData(furnitureRoot, ["tables", "moderate_damage"], 0), 0),
    0
  );
  const mejaHeavy = toNum(
    pickMaxNumber(mejaObj?.heavy_damage, getData(furnitureRoot, ["tables", "heavy_damage"], 0), 0),
    0
  );

  const kursiTotal = toNum(
    pickMaxNumber(
      kursiObj?.total,
      kursiObj?.total_all,
      getData(furnitureRoot, ["chairs", "total"], 0),
      typeof kursiCat === "number" ? kursiCat : undefined,
      0
    ),
    0
  );
  const kursiGood = toNum(pickMaxNumber(kursiObj?.good, getData(furnitureRoot, ["chairs", "good"], 0), 0), 0);
  const kursiMod = toNum(
    pickMaxNumber(kursiObj?.moderate_damage, getData(furnitureRoot, ["chairs", "moderate_damage"], 0), 0),
    0
  );
  const kursiHeavy = toNum(
    pickMaxNumber(kursiObj?.heavy_damage, getData(furnitureRoot, ["chairs", "heavy_damage"], 0), 0),
    0
  );

  const papanTotal = toNum(
    pickMaxNumber(
      papanObj?.total,
      papanObj?.total_all,
      papanObj?.jumlah,
      PR?.papan_tulis,
      getData(PR, ["papan_tulis"], 0),
      BASE?.papan_tulis,
      0
    ),
    0
  );

  let papanBaik = toNum(
    pickMaxNumber(
      papanObj?.good,
      papanObj?.baik,
      papanObj?.kondisi_baik,
      papanObj?.baik_count,
      BASE?.papan_tulis_baik,
      0
    ),
    0
  );
  let papanRusak = toNum(
    pickMaxNumber(
      papanObj?.broken,
      papanObj?.rusak,
      papanObj?.kondisi_rusak,
      papanObj?.rusak_count,
      BASE?.papan_tulis_rusak,
      0
    ),
    0
  );

  if (papanTotal > 0 && papanBaik > 0 && papanRusak === 0) {
    papanRusak = Math.max(0, papanTotal - papanBaik);
  }

  const komputerTotal = toNum(
    pickMaxNumber(
      furnitureRoot?.computer,
      getData(furnitureRoot, ["computer"], 0),
      BASE?.computer,
      BASE?.komputer,
      raw?.computer,
      0
    ),
    0
  );
  const chromebookTotal = toNum(
    pickMaxNumber(getData(PR, ["chromebook"], 0), BASE?.chromebook, raw?.chromebook, 0),
    0
  );

  // ===================== SISWA LANJUT =====================
  // (FIX) Kategori XIV: gunakan META.siswaLanjutDalamKab / META.siswaLanjutLuarKab + siswaTidakLanjut + siswaBekerja
  const lanjutObj = isObj(META?.lanjut) ? META.lanjut : {};

  const lanjutDalamObj =
    (isObj(META?.siswaLanjutDalamKab) ? META.siswaLanjutDalamKab : null) ||
    (isObj(META?.siswa_lanjut_dalam_kab) ? META.siswa_lanjut_dalam_kab : null) ||
    (isObj(lanjutObj?.dalamKab) ? lanjutObj.dalamKab : null) ||
    (isObj(lanjutObj?.dalam_kab) ? lanjutObj.dalam_kab : null) ||
    (isObj(lanjutObj?.dalam) ? lanjutObj.dalam : null) ||
    null;

  const lanjutLuarObj =
    (isObj(META?.siswaLanjutLuarKab) ? META.siswaLanjutLuarKab : null) ||
    (isObj(META?.siswa_lanjut_luar_kab) ? META.siswa_lanjut_luar_kab : null) ||
    (isObj(lanjutObj?.luarKab) ? lanjutObj.luarKab : null) ||
    (isObj(lanjutObj?.luar_kab) ? lanjutObj.luar_kab : null) ||
    (isObj(lanjutObj?.luar) ? lanjutObj.luar : null) ||
    null;

  // Jika field tersebut ternyata angka total (bukan object), tetap dibaca sebagai fallback total SD->SMP
  const lanjutDalamTotalFlat = !isObj(META?.siswaLanjutDalamKab) ? toNum(META?.siswaLanjutDalamKab, 0) : 0;
  const lanjutLuarTotalFlat = !isObj(META?.siswaLanjutLuarKab) ? toNum(META?.siswaLanjutLuarKab, 0) : 0;

  const pickLanjutFlat = (...keys) => pickMaxNumber(...keys.map((k) => BASE?.[k]), 0);

  const lanjutDalamNorm = {
    smp: pickMaxNumber(
      lanjutDalamObj?.smp,
      lanjutDalamObj?.SMP,
      pickLanjutFlat("lanjut_dalam_smp", "lanjut_smp_dalam", "smp_dalam", "lanjut_ke_smp_dalam"),
      lanjutDalamTotalFlat,
      0
    ),
    mts: pickMaxNumber(
      lanjutDalamObj?.mts,
      lanjutDalamObj?.MTs,
      pickLanjutFlat("lanjut_dalam_mts", "lanjut_mts_dalam", "mts_dalam", "lanjut_ke_mts_dalam"),
      0
    ),
    pontren: pickMaxNumber(
      lanjutDalamObj?.pontren,
      lanjutDalamObj?.ponpes,
      lanjutDalamObj?.pesantren,
      pickLanjutFlat("lanjut_dalam_pontren", "lanjut_dalam_ponpes", "pontren_dalam", "ponpes_dalam", "pesantren_dalam"),
      0
    ),
    pkbm: pickMaxNumber(
      lanjutDalamObj?.pkbm,
      lanjutDalamObj?.PKBM,
      pickLanjutFlat("lanjut_dalam_pkbm", "lanjut_pkbm_dalam", "pkbm_dalam", "lanjut_ke_pkbm_dalam"),
      0
    ),
  };

  const lanjutLuarNorm = {
    smp: pickMaxNumber(
      lanjutLuarObj?.smp,
      lanjutLuarObj?.SMP,
      pickLanjutFlat("lanjut_luar_smp", "lanjut_smp_luar", "smp_luar", "lanjut_ke_smp_luar"),
      lanjutLuarTotalFlat,
      0
    ),
    mts: pickMaxNumber(
      lanjutLuarObj?.mts,
      lanjutLuarObj?.MTs,
      pickLanjutFlat("lanjut_luar_mts", "lanjut_mts_luar", "mts_luar", "lanjut_ke_mts_luar"),
      0
    ),
    pontren: pickMaxNumber(
      lanjutLuarObj?.pontren,
      lanjutLuarObj?.ponpes,
      lanjutLuarObj?.pesantren,
      pickLanjutFlat("lanjut_luar_pontren", "lanjut_luar_ponpes", "pontren_luar", "ponpes_luar", "pesantren_luar"),
      0
    ),
    pkbm: pickMaxNumber(
      lanjutLuarObj?.pkbm,
      lanjutLuarObj?.PKBM,
      pickLanjutFlat("lanjut_luar_pkbm", "lanjut_pkbm_luar", "pkbm_luar", "lanjut_ke_pkbm_luar"),
      0
    ),
  };

  const lanjutTidak = toNum(
    pickMaxNumber(
      META?.siswaTidakLanjut,
      META?.siswa_tidak_lanjut,
      lanjutObj?.tidakLanjut,
      lanjutObj?.tidak_lanjut,
      BASE?.tidak_lanjut,
      0
    ),
    0
  );

  const lanjutBekerja = toNum(
    pickMaxNumber(
      META?.siswaBekerja,
      META?.siswa_bekerja,
      lanjutObj?.bekerja,
      BASE?.bekerja,
      0
    ),
    0
  );

  const lanjutDalamRows = [
    { key: "smp", label: "SMP", value: toNum(lanjutDalamNorm.smp, 0) },
    { key: "mts", label: "MTs", value: toNum(lanjutDalamNorm.mts, 0) },
    { key: "pontren", label: "Pontren", value: toNum(lanjutDalamNorm.pontren, 0) },
    { key: "pkbm", label: "PKBM", value: toNum(lanjutDalamNorm.pkbm, 0) },
  ];

  const lanjutLuarRows = [
    { key: "smp", label: "SMP", value: toNum(lanjutLuarNorm.smp, 0) },
    { key: "mts", label: "MTs", value: toNum(lanjutLuarNorm.mts, 0) },
    { key: "pontren", label: "Pontren", value: toNum(lanjutLuarNorm.pontren, 0) },
    { key: "pkbm", label: "PKBM", value: toNum(lanjutLuarNorm.pkbm, 0) },
  ];

  // ===================== KELEMBAGAAN =====================
  const bopTenagaPeningkatanVal = getData(KL, ["bop", "tenagaPeningkatan"], "");
  const bopTenagaPeningkatan =
    Number.isFinite(Number(bopTenagaPeningkatanVal)) && String(bopTenagaPeningkatanVal) !== ""
      ? String(Number(bopTenagaPeningkatanVal))
      : mapYesNo(bopTenagaPeningkatanVal);

  const kelembagaan = {
    peralatanRumahTangga: mapPeralatan(
      getData(
        KL,
        ["peralatanRumahTangga"],
        getData(PR, ["peralatanRumahTangga"], getData(BASE, ["peralatanRumahTangga"], "-"))
      )
    ),
    pembinaan: mapSudahBelum(getData(KL, ["pembinaan"], getData(BASE, ["pembinaan"], "-"))),
    asesmen: mapSudahBelum(getData(KL, ["asesmen"], getData(BASE, ["asesmen"], "-"))),
    menyelenggarakanBelajar: mapYesNo(
      getData(KL, ["menyelenggarakanBelajar"], getData(BASE, ["menyelenggarakanBelajar"], "-"))
    ),
    melaksanakanRekomendasi: mapYesNo(
      getData(KL, ["melaksanakanRekomendasi"], getData(BASE, ["melaksanakanRekomendasi"], "-"))
    ),
    siapDievaluasi: mapYesNo(getData(KL, ["siapDievaluasi"], getData(BASE, ["siapDievaluasi"], "-"))),
    bopPengelola: mapYesNo(getData(KL, ["bop", "pengelola"], getData(BASE, ["bop", "pengelola"], "-"))),
    bopTenagaPeningkatan,
    izinPengendalian: mapYesNo(
      getData(KL, ["perizinan", "pengendalian"], getData(BASE, ["perizinan", "pengendalian"], "-"))
    ),
    izinKelayakan: mapYesNo(getData(KL, ["perizinan", "kelayakan"], getData(BASE, ["perizinan", "kelayakan"], "-"))),
    silabus: mapYesNo(getData(KL, ["kurikulum", "silabus"], getData(BASE, ["kurikulum", "silabus"], "-"))),
    kompetensiDasar: mapYesNo(
      getData(KL, ["kurikulum", "kompetensiDasar"], getData(BASE, ["kurikulum", "kompetensiDasar"], "-"))
    ),
  };

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <div className={styles.header}>
        <h1 className={styles.schoolName}>{nama}</h1>

        <div className={styles.schoolInfo}>
          <div className={styles.infoRow}>
            <span className={styles.label}>Jenjang</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{jenjang}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Status</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{statusSekolah}</span>
          </div>
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

          {/* WADAH KOORDINAT */}
          <div className={styles.infoRow}>
            <span className={styles.label}>Latitude</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>
              {Number.isFinite(Number(latVal)) ? Number(latVal) : 0}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Longitude</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>
              {Number.isFinite(Number(lngVal)) ? Number(lngVal) : 0}
            </span>
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
          {/* MODE GRAFIK BATANG TIDAK DIHAPUS */}
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

          {/* WADAH TAMBAHAN (sesuai modul input) */}
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Kelengkapan Kondisi & Kebutuhan Ruang Kelas</h3>
            <div className={styles.dataRow}>
              <span>Jumlah Total Ruang Kelas: {totalRuangKelas}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Ringan: {rusakRingan}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Total: {rusakTotal}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Kelebihan Kelas: {kelebihanKelas}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Ruang Kelas Tambahan: {ruangKelasTambahan}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Ketersediaan Lahan Pembangunan: {lahanTersedia ? "Ada" : "Tidak ada"}</span>
            </div>
          </div>

          {/* wadah tambahan rencana toilet */}
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Rencana Kegiatan Fisik Toilet</h3>
            <div className={styles.dataRow}>
              <span>Rehabilitasi Toilet: {rehabToiletKegiatan}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Pembangunan Toilet: {pembangunanToiletKegiatan}</span>
            </div>
          </div>
        </div>
      </div>

      {/* DATA FISIK */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Fisik Bangunan Sekolah</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Luas Tanah: {landArea} m²</span>
          </div>
          <div className={styles.dataRow}>
            <span>Luas Bangunan: {buildingArea} m²</span>
          </div>
          <div className={styles.dataRow}>
            <span>Luas Halaman: {yardArea} m²</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Gedung: {jumlahGedung}</span>
          </div>
        </div>
      </div>

      {/* DATA SISWA (WADAH META) */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Rincian Siswa (Meta)</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Siswa Laki-laki (Total): {siswaL}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Siswa Perempuan (Total): {siswaP}</span>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Rincian Siswa Reguler per Kelas</h3>
            {siswaKelasRows.length ? (
              siswaKelasRows.map((r0) => (
                <div key={`siswa-${r0.key}`} className={styles.dataRow}>
                  <span>
                    {r0.label} — L: {r0.male} | P: {r0.female} | Total: {r0.total}
                  </span>
                </div>
              ))
            ) : (
              <div className={styles.dataRow}>
                <span>-</span>
              </div>
            )}
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Siswa Berkebutuhan Khusus</h3>
            <div className={styles.dataRow}>
              <span>ABK Laki-laki: {abkL}</span>
            </div>
            <div className={styles.dataRow}>
              <span>ABK Perempuan: {abkP}</span>
            </div>
            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Rincian ABK per Kelas</h3>
              {abkKelasRows.length ? (
                abkKelasRows.map((r0) => (
                  <div key={`abk-${r0.key}`} className={styles.dataRow}>
                    <span>
                      {r0.label} — L: {r0.male} | P: {r0.female} | Total: {r0.total}
                    </span>
                  </div>
                ))
              ) : (
                <div className={styles.dataRow}>
                  <span>-</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DATA KELAS */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Kelas</h2>
        <div className={styles.card}>
          <div className={styles.gradeGrid}>
            {[1, 2, 3, 4, 5, 6].map((k) => {
              const l0 = g(`${k}_L`) || metaSiswaByGrade(k, "l");
              const p0 = g(`${k}_P`) || metaSiswaByGrade(k, "p");
              const abk0 =
                (g(`khusus_${k}_L`) + g(`khusus_${k}_P`)) ||
                (metaAbkByGrade(k, "l") + metaAbkByGrade(k, "p"));

              return (
                <div key={k} className={styles.gradeItem}>
                  <div className={styles.dataRow}>
                    <span>Kelas {k} Laki-laki: {l0}</span>
                  </div>
                  <div className={styles.dataRow}>
                    <span>Kelas {k} Perempuan: {p0}</span>
                  </div>
                  <div className={styles.dataRow}>
                    <span>Kelas {k} Kebutuhan Khusus: {abk0}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* GURU */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Guru & Tenaga Kerja</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Jumlah Guru: {jumlahGuru}</span>
          </div>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Status Kepegawaian</h3>
            <div className={styles.dataRow}>
              <span>PNS: {pns}</span>
            </div>
            <div className={styles.dataRow}>
              <span>PPPK: {pppk}</span>
            </div>
            <div className={styles.dataRow}>
              <span>PPPK (Paruh Waktu): {pppkParuhWaktu}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Non ASN (Dapodik): {nonAsnDapodik}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Non ASN (Tidak Dapodik): {nonAsnNonDapodik}</span>
            </div>
          </div>
          <div className={styles.dataRow}>
            <span>Kekurangan Guru: {kekuranganGuru}</span>
          </div>
        </div>
      </div>

      {/* ROMBEL */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Rombel</h2>
        <div className={styles.card}>
          {rombelRows.length ? (
            <>
              {rombelRows.map((it) => (
                <div key={`rombel-${it.key}`} className={styles.dataRow}>
                  <span>Jumlah Rombel {it.label}: {it.value}</span>
                </div>
              ))}
              <div className={styles.dataRow}>
                <span>Jumlah Keseluruhan Rombel: {totalRombel || r("total")}</span>
              </div>
            </>
          ) : (
            <>
              {[1, 2, 3, 4, 5, 6].map((k) => (
                <div key={k} className={styles.dataRow}>
                  <span>Jumlah Rombel Kelas {k}: {r(`kelas${k}`) || r(String(k))}</span>
                </div>
              ))}
              <div className={styles.dataRow}>
                <span>Jumlah Keseluruhan Rombel: {r("total")}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* SISWA LANJUT */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Siswa Lanjut</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Dalam Kabupaten</h3>
            {lanjutDalamRows.map((x) => (
              <div key={`lanjut-dalam-${x.key}`} className={styles.dataRow}>
                <span>{x.label}: {x.value}</span>
              </div>
            ))}
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Luar Kabupaten</h3>
            {lanjutLuarRows.map((x) => (
              <div key={`lanjut-luar-${x.key}`} className={styles.dataRow}>
                <span>{x.label}: {x.value}</span>
              </div>
            ))}
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Lainnya</h3>
            <div className={styles.dataRow}>
              <span>Tidak Lanjut: {lanjutTidak}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Bekerja: {lanjutBekerja}</span>
            </div>
          </div>
        </div>
      </div>

      {/* PERPUSTAKAAN */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Perpustakaan</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Jumlah Ruang Perpustakaan: {library.total_all}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kondisi Baik: {library.good}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Rusak Ringan: {library.light_damage}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Rusak Sedang: {library.moderate_damage}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Rusak Berat: {library.heavy_damage}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Rusak Total: {library.total_damage}</span>
          </div>
        </div>
      </div>

      {/* RUANG GURU */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Ruang Guru</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Jumlah Ruang Guru: {teacherRoom.total_all}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kondisi Baik: {teacherRoom.good}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Rusak Ringan: {teacherRoom.light_damage}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Rusak Sedang: {teacherRoom.moderate_damage}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Rusak Berat: {teacherRoom.heavy_damage}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Rusak Total: {teacherRoom.total_damage}</span>
          </div>
        </div>
      </div>

      {/* UKS */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>UKS</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Jumlah Ruang UKS: {uks.total_all}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kondisi Baik: {uks.good}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Rusak Ringan: {uks.light_damage}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Rusak Sedang: {uks.moderate_damage}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Rusak Berat: {uks.heavy_damage}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Rusak Total: {uks.total_damage}</span>
          </div>
        </div>
      </div>

      {/* RUANG PENUNJANG LAINNYA (wadah tambahan) */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Ruang Penunjang Lainnya (Jika Ada)</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Ruang Kepala Sekolah</h3>
            <div className={styles.dataRow}><span>Jumlah: {headmasterRoom.total_all}</span></div>
            <div className={styles.dataRow}><span>Baik: {headmasterRoom.good}</span></div>
            <div className={styles.dataRow}><span>Rusak Ringan: {headmasterRoom.light_damage}</span></div>
            <div className={styles.dataRow}><span>Rusak Sedang: {headmasterRoom.moderate_damage}</span></div>
            <div className={styles.dataRow}><span>Rusak Berat: {headmasterRoom.heavy_damage}</span></div>
            <div className={styles.dataRow}><span>Rusak Total: {headmasterRoom.total_damage}</span></div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Ruang TU</h3>
            <div className={styles.dataRow}><span>Jumlah: {tuRoom.total_all}</span></div>
            <div className={styles.dataRow}><span>Baik: {tuRoom.good}</span></div>
            <div className={styles.dataRow}><span>Rusak Ringan: {tuRoom.light_damage}</span></div>
            <div className={styles.dataRow}><span>Rusak Sedang: {tuRoom.moderate_damage}</span></div>
            <div className={styles.dataRow}><span>Rusak Berat: {tuRoom.heavy_damage}</span></div>
            <div className={styles.dataRow}><span>Rusak Total: {tuRoom.total_damage}</span></div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Toilet Umum</h3>
            <div className={styles.dataRow}><span>Jumlah: {publicToiletRoom.total_all}</span></div>
            <div className={styles.dataRow}><span>Baik: {publicToiletRoom.good}</span></div>
            <div className={styles.dataRow}><span>Rusak Ringan: {publicToiletRoom.light_damage}</span></div>
            <div className={styles.dataRow}><span>Rusak Sedang: {publicToiletRoom.moderate_damage}</span></div>
            <div className={styles.dataRow}><span>Rusak Berat: {publicToiletRoom.heavy_damage}</span></div>
            <div className={styles.dataRow}><span>Rusak Total: {publicToiletRoom.total_damage}</span></div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Rumah Dinas</h3>
            <div className={styles.dataRow}><span>Jumlah: {rumahDinasRoom.total_all}</span></div>
            <div className={styles.dataRow}><span>Baik: {rumahDinasRoom.good}</span></div>
            <div className={styles.dataRow}><span>Rusak Ringan: {rumahDinasRoom.light_damage}</span></div>
            <div className={styles.dataRow}><span>Rusak Sedang: {rumahDinasRoom.moderate_damage}</span></div>
            <div className={styles.dataRow}><span>Rusak Berat: {rumahDinasRoom.heavy_damage}</span></div>
            <div className={styles.dataRow}><span>Rusak Total: {rumahDinasRoom.total_damage}</span></div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Laboratorium Umum</h3>
            <div className={styles.dataRow}><span>Jumlah: {labUmum.total_all}</span></div>
            <div className={styles.dataRow}><span>Baik: {labUmum.good}</span></div>
            <div className={styles.dataRow}><span>Rusak Ringan: {labUmum.light_damage}</span></div>
            <div className={styles.dataRow}><span>Rusak Sedang: {labUmum.moderate_damage}</span></div>
            <div className={styles.dataRow}><span>Rusak Berat: {labUmum.heavy_damage}</span></div>
            <div className={styles.dataRow}><span>Rusak Total: {labUmum.total_damage}</span></div>
          </div>
        </div>
      </div>

      {/* LAB */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Laboratorium (Jika Ada)</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Lab Komputer</h3>
            <div className={styles.dataRow}><span>Jumlah: {labKomputer.total_all}</span></div>
            <div className={styles.dataRow}><span>Baik: {labKomputer.good}</span></div>
            <div className={styles.dataRow}><span>Rusak Ringan: {labKomputer.light_damage}</span></div>
            <div className={styles.dataRow}><span>Rusak Sedang: {labKomputer.moderate_damage}</span></div>
            <div className={styles.dataRow}><span>Rusak Berat: {labKomputer.heavy_damage}</span></div>
            <div className={styles.dataRow}><span>Rusak Total: {labKomputer.total_damage}</span></div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Lab IPA</h3>
            <div className={styles.dataRow}><span>Jumlah: {labIpa.total_all}</span></div>
            <div className={styles.dataRow}><span>Baik: {labIpa.good}</span></div>
            <div className={styles.dataRow}><span>Rusak Ringan: {labIpa.light_damage}</span></div>
            <div className={styles.dataRow}><span>Rusak Sedang: {labIpa.moderate_damage}</span></div>
            <div className={styles.dataRow}><span>Rusak Berat: {labIpa.heavy_damage}</span></div>
            <div className={styles.dataRow}><span>Rusak Total: {labIpa.total_damage}</span></div>
          </div>
        </div>
      </div>

      {/* TOILET */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Toilet (Ringkasan)</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Jumlah Toilet (Total): {toiletTotal}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Baik: {toiletGood}</span>
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
            <span>Rusak Total: {toiletTotalDamage}</span>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Toilet Guru (Detail)</h3>
            <div className={styles.dataRow}>
              <span>
                Laki-laki — Total: {toiletGuruMale.total_all} | Baik: {toiletGuruMale.good} | Ringan:{" "}
                {toiletGuruMale.light_damage} | Sedang: {toiletGuruMale.moderate_damage} | Berat:{" "}
                {toiletGuruMale.heavy_damage} | Total Rusak: {toiletGuruMale.total_damage}
              </span>
            </div>
            <div className={styles.dataRow}>
              <span>
                Perempuan — Total: {toiletGuruFemale.total_all} | Baik: {toiletGuruFemale.good} | Ringan:{" "}
                {toiletGuruFemale.light_damage} | Sedang: {toiletGuruFemale.moderate_damage} | Berat:{" "}
                {toiletGuruFemale.heavy_damage} | Total Rusak: {toiletGuruFemale.total_damage}
              </span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Toilet Siswa (Detail)</h3>
            <div className={styles.dataRow}>
              <span>
                Laki-laki — Total: {toiletSiswaMale.total_all} | Baik: {toiletSiswaMale.good} | Ringan:{" "}
                {toiletSiswaMale.light_damage} | Sedang: {toiletSiswaMale.moderate_damage} | Berat:{" "}
                {toiletSiswaMale.heavy_damage} | Total Rusak: {toiletSiswaMale.total_damage}
              </span>
            </div>
            <div className={styles.dataRow}>
              <span>
                Perempuan — Total: {toiletSiswaFemale.total_all} | Baik: {toiletSiswaFemale.good} | Ringan:{" "}
                {toiletSiswaFemale.light_damage} | Sedang: {toiletSiswaFemale.moderate_damage} | Berat:{" "}
                {toiletSiswaFemale.heavy_damage} | Total Rusak: {toiletSiswaFemale.total_damage}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FURNITURE */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Furniture dan Komputer</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Meja</h3>
            <div className={styles.dataRow}>
              <span>Jumlah Meja: {mejaTotal}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Meja Kondisi Baik: {mejaGood}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Meja Rusak Sedang: {mejaMod}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Meja Rusak Berat: {mejaHeavy}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Kursi</h3>
            <div className={styles.dataRow}>
              <span>Jumlah Kursi: {kursiTotal}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Kursi Kondisi Baik: {kursiGood}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Kursi Rusak Sedang: {kursiMod}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Kursi Rusak Berat: {kursiHeavy}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Papan Tulis</h3>
            <div className={styles.dataRow}>
              <span>Jumlah Papan Tulis: {papanTotal}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Papan Tulis Kondisi Baik: {papanBaik}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Papan Tulis Rusak: {papanRusak}</span>
            </div>
          </div>

          <div className={styles.dataRow}>
            <span>Jumlah Komputer: {komputerTotal}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Chromebook: {chromebookTotal}</span>
          </div>
        </div>
      </div>

      {/* XII KELEMBAGAAN */}
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

export default SchoolDetailSd;
