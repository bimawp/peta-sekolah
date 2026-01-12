// src/components/schools/SchoolDetail/Paud/SchoolDetailPaud.jsx
import React from "react";
import styles from "./SchoolDetailPaud.module.css";

const getData = (data, path, def = undefined) => {
  const v = path.reduce((o, k) => (o && o[k] != null ? o[k] : undefined), data);
  if (v === 0 || v === 0.0) return 0;
  return v !== undefined && v !== null && v !== "" ? v : def;
};

const num = (v, d = 0) => (v == null || Number.isNaN(Number(v)) ? d : Number(v));
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const hasKeys = (o) => isObj(o) && Object.keys(o).length > 0;
const hasAnyNumber = (...vals) => vals.some((v) => Number(v) > 0);

const normalizeRoom = (src) => {
  const o = isObj(src) ? src : {};
  const good = num(o.good, 0);
  const moderate = num(o.moderate_damage, 0);
  const heavy = num(o.heavy_damage, 0);
  const totalAll = num(o.total_all ?? o.total, good + moderate + heavy);
  const totalMh = num(o.total_mh, moderate + heavy);
  return { good, moderate_damage: moderate, heavy_damage: heavy, total_all: totalAll, total_mh: totalMh };
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
  const moderate_damage = num(t?.male?.moderate_damage, 0) + num(t?.female?.moderate_damage, 0);
  const heavy_damage = num(t?.male?.heavy_damage, 0) + num(t?.female?.heavy_damage, 0);
  return { total_all, good, moderate_damage, heavy_damage };
};

// =========================================================
// ✅ LABEL & VALUE FORMATTER (KELEMBAGAAN)
// =========================================================
const normKey = (k) => String(k ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

// label rapih + dukung singkatan supaya tidak jadi "Bop"
const prettyLabel = (k) => {
  const raw = String(k ?? "").trim();
  const lower = raw.toLowerCase();

  const ABBR = {
    bop: "BOP",
    uks: "UKS",
    rgks: "RGKS",
    ape: "APE",
    abk: "ABK",
    kb: "KB",
    tk: "TK",
    sps_tpa: "SPS/TPA",
    sps: "SPS",
    tpa: "TPA",
    npsn: "NPSN",
    pns: "PNS",
    pppk: "PPPK",
  };

  // label khusus (agar sesuai contoh output)
  const LABEL_MAP = {
    alatrumahtangga: "Alat Rumah Tangga",
    pembinaan: "Pembinaan",
    asesmen: "Asesmen",
    menyelenggarakanbelajar: "Menyelenggarakan Belajar",
    melaksanakanrekomendasi: "Melaksanakan Rekomendasi",
    siapdievaluasi: "Siap Dievaluasi",
    pengelola: "Pengelola",
    tenagapeningkatan: "Tenaga Peningkatan",
    pengendalian: "Izin Pengendalian",
    izinpengendalian: "Izin Pengendalian",
    kelayakan: "Izin Kelayakan",
    izinkelayakan: "Izin Kelayakan",
    silabus: "Silabus",
    kompetensidasar: "Kompetensi Dasar",
  };

  const nk = normKey(raw);
  if (LABEL_MAP[nk]) return LABEL_MAP[nk];
  if (ABBR[lower]) return ABBR[lower];

  return raw
    .replace(/([a-z])([A-Z])/g, "$1 $2") // camelCase -> camel Case
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
};

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

  if (typeof v === "boolean") return v ? "Ya" : "Tidak";
  if (typeof v === "number") return String(v);

  const s = String(v).trim();
  const upper = s.toUpperCase();

  // normalisasi YA/TIDAK/BELUM + variasi umum
  const YES = new Set(["YA", "Y", "YES", "TRUE", "1"]);
  const NO = new Set(["TIDAK", "TDK", "TIDAK.", "NO", "FALSE", "0"]);
  const NOTYET = new Set(["BELUM", "BLM"]);

  if (YES.has(upper)) return "Ya";
  if (NO.has(upper)) return "Tidak";
  if (NOTYET.has(upper)) return "Belum";

  // kondisi umum
  if (upper === "BAIK") return "Baik";
  if (upper === "RUSAK") return "Rusak";
  if (upper === "RUSAK SEDANG" || upper === "RUSAK_SEDANG") return "Rusak Sedang";
  if (upper === "RUSAK BERAT" || upper === "RUSAK_BERAT") return "Rusak Berat";

  // fallback title-case agar tidak tampil all-caps
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

const makeItemsFromObject = (obj, preferredOrder = []) => {
  if (!isObj(obj)) return [];

  const orderNorm = preferredOrder.map(normKey);
  const entries = Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== "");

  // sort: preferred first (by index), then remaining by original order
  entries.sort(([ka], [kb]) => {
    const ia = orderNorm.indexOf(normKey(ka));
    const ib = orderNorm.indexOf(normKey(kb));
    const pa = ia === -1 ? 9999 : ia;
    const pb = ib === -1 ? 9999 : ib;
    return pa - pb;
  });

  const items = [];
  for (const [k, v] of entries) {
    if (isObj(v)) {
      // flatten 1 level: parent jadi heading + anak-anak jadi baris
      const inner = makeItemsFromObject(v);
      if (inner.length) {
        items.push({ type: "heading", text: prettyLabel(k), key: `h_${k}` });
        inner.forEach((it) => items.push({ ...it, key: `inner_${k}_${it.key}` }));
      }
      continue;
    }
    const pv = prettyValue(v);
    if (pv == null) continue;
    items.push({ type: "row", label: prettyLabel(k), value: pv, key: String(k) });
  }
  return items;
};

/**
 * ✅ KELEMBAGAAN OUTPUT SESUAI CONTOH:
 * - baris umum (Alat Rumah Tangga, Pembinaan, Asesmen, dst.)
 * - group "BOP" (Pengelola, Tenaga Peningkatan)
 * - group "Perizinan & Kurikulum" (Izin Pengendalian, Izin Kelayakan, Silabus, Kompetensi Dasar)
 */
const renderKelembagaanRows = (kelembagaan) => {
  if (!isObj(kelembagaan)) return null;

  const bopKey = findKeyByNorm(kelembagaan, "bop");
  const perizinanKey = findKeyByNorm(kelembagaan, "perizinan");
  const kurikulumKey = findKeyByNorm(kelembagaan, "kurikulum");

  const bopObj = bopKey ? kelembagaan[bopKey] : null;
  const perizinanObj = perizinanKey ? kelembagaan[perizinanKey] : null;
  const kurikulumObj = kurikulumKey ? kelembagaan[kurikulumKey] : null;

  // 1) item umum (top-level, selain bop/perizinan/kurikulum)
  const baseObj = {};
  for (const [k, v] of Object.entries(kelembagaan)) {
    if (k === bopKey || k === perizinanKey || k === kurikulumKey) continue;
    baseObj[k] = v;
  }

  const baseOrder = [
    "alatRumahTangga",
    "pembinaan",
    "asesmen",
    "menyelenggarakanBelajar",
    "melaksanakanRekomendasi",
    "siapDievaluasi",
  ];
  const baseItems = makeItemsFromObject(baseObj, baseOrder).filter((it) => it.type === "row");

  const out = [];

  // base rows
  for (const it of baseItems) {
    out.push(
      <div className={styles.dataRow} key={`base_${it.key}`}>
        <span>
          {it.label}: {it.value}
        </span>
      </div>
    );
  }

  // 2) BOP group
  const bopItems = makeItemsFromObject(bopObj, ["pengelola", "tenagaPeningkatan"]).filter((it) => it.type === "row");
  if (bopItems.length) {
    out.push(
      <div className={styles.subsection} key="kelem_bop_group">
        <h3 className={styles.subsectionTitle}>BOP</h3>
        {bopItems.map((it) => (
          <div className={styles.dataRow} key={`bop_${it.key}`}>
            <span>
              {it.label}: {it.value}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // 3) Perizinan & Kurikulum group
  const izinItems = makeItemsFromObject(perizinanObj, ["pengendalian", "kelayakan"]).filter((it) => it.type === "row");
  const kurItems = makeItemsFromObject(kurikulumObj, ["silabus", "kompetensiDasar"]).filter((it) => it.type === "row");

  const pkItems = [...izinItems, ...kurItems];
  if (pkItems.length) {
    out.push(
      <div className={styles.subsection} key="kelem_pk_group">
        <h3 className={styles.subsectionTitle}>Perizinan & Kurikulum</h3>
        {izinItems.map((it) => (
          <div className={styles.dataRow} key={`izin_${it.key}`}>
            <span>
              {it.label}: {it.value}
            </span>
          </div>
        ))}
        {kurItems.map((it) => (
          <div className={styles.dataRow} key={`kur_${it.key}`}>
            <span>
              {it.label}: {it.value}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return out.length ? out : null;
};

function buildStudentRowsFromMeta(metaSiswa) {
  if (!isObj(metaSiswa)) return [];

  // PKBM paket?
  const paketKeys = Object.keys(metaSiswa).filter((k) => /^paket[a-z0-9]+$/i.test(k) && isObj(metaSiswa[k]));
  if (paketKeys.length) {
    const out = [];
    for (const pk of paketKeys) {
      const pkt = metaSiswa[pk];
      for (const [kelasKey, val] of Object.entries(pkt)) {
        if (!/^kelas[0-9]+$/i.test(kelasKey)) continue;
        const l = num(val?.l, 0);
        const p = num(val?.p, 0);
        out.push({
          key: `${pk}_${kelasKey}`,
          label: `${prettyLabel(pk)} ${prettyLabel(kelasKey)}`.replace(
            /^Paket([A-Z0-9]+) Kelas(\d+)/i,
            "Paket $1 Kelas $2"
          ),
          l,
          p,
        });
      }
    }
    return out;
  }

  // SD/SMP/PAUD flat
  return Object.entries(metaSiswa)
    .filter(([, v]) => isObj(v))
    .map(([k, v]) => ({
      key: k,
      label: prettyLabel(k)
        .replace(/^Kelas(\d+)/i, "Kelas $1")
        .replace(/^Kb$/i, "KB")
        .replace(/^Tk$/i, "TK")
        .replace(/^Sps Tpa$/i, "SPS/TPA")
        .replace(/^Sps_tpa$/i, "SPS/TPA"),
      l: num(v.l, 0),
      p: num(v.p, 0),
    }));
}

function buildStudentRowsFromClassesTable(classesMap) {
  if (!isObj(classesMap)) return [];

  const groups = {};
  for (const [gradeKey, cnt] of Object.entries(classesMap)) {
    const k = String(gradeKey || "");
    const c = num(cnt, 0);

    const m = k.match(/^(.*)_(L|P)$/i);
    if (!m) continue;

    const base = m[1];
    const gender = m[2].toUpperCase();

    groups[base] = groups[base] || { l: 0, p: 0 };
    if (gender === "L") groups[base].l += c;
    if (gender === "P") groups[base].p += c;
  }

  return Object.entries(groups).map(([base, v]) => {
    let label = prettyLabel(base);
    label = label
      .replace(/^Kelas(\d+)/i, "Kelas $1")
      .replace(/^Kb$/i, "KB")
      .replace(/^Tk$/i, "TK")
      .replace(/^Sps Tpa$/i, "SPS/TPA");

    label = label.replace(/^Paket([A-Z0-9]+) Kelas(\d+)/i, "Paket $1 Kelas $2");

    return { key: base, label, l: num(v.l, 0), p: num(v.p, 0) };
  });
}

function buildRombelRows(metaRombel) {
  if (!isObj(metaRombel)) return [];

  const paketKeys = Object.keys(metaRombel).filter((k) => /^paket[a-z0-9]+$/i.test(k) && isObj(metaRombel[k]));
  if (paketKeys.length) {
    const out = [];
    for (const pk of paketKeys) {
      const pkt = metaRombel[pk];
      for (const [kelasKey, v] of Object.entries(pkt)) {
        if (kelasKey === "total") continue;
        const n = num(v, NaN);
        if (!Number.isFinite(n)) continue;

        let label = `${prettyLabel(pk)} ${prettyLabel(kelasKey)}`;
        label = label.replace(/^Paket([A-Z0-9]+) Kelas(\d+)/i, "Paket $1 Kelas $2");
        label = label.replace(/^Kelas(\d+)/i, "Kelas $1");

        out.push({ key: `${pk}.${kelasKey}`, label, value: n });
      }
    }
    return out;
  }

  return Object.entries(metaRombel)
    .filter(([k]) => k !== "total")
    .map(([k, v]) => ({
      key: k,
      label: prettyLabel(k)
        .replace(/^Kelas(\d+)/i, "Kelas $1")
        .replace(/^Kb$/i, "KB")
        .replace(/^Tk$/i, "TK")
        .replace(/^Sps Tpa$/i, "SPS/TPA"),
      value: num(v, 0),
    }));
}

const SchoolDetailPaud = ({ schoolData }) => {
  const handleLocationClick = () => {
    const coords =
      schoolData?.coordinates ??
      (() => {
        const lat = Number(schoolData?.lat ?? schoolData?._raw?.lat ?? schoolData?.latitude);
        const lng = Number(schoolData?.lng ?? schoolData?._raw?.lng ?? schoolData?.longitude);
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

      // swap kalau kebalik
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

  // =========================================================
  // Sumber data sesuai inputan (Supabase meta)
  // =========================================================
  const META = schoolData?.meta || {};
  const PR = META?.prasarana || {};
  const KELEM = META?.kelembagaan;

  // IDENTITAS
  const jenjang = schoolData?.jenjang || META?.jenjang || schoolData?.level || "PAUD";
  const statusSekolah = schoolData?.status || schoolData?.status_sekolah;

  const nama = getData(schoolData, ["name"], "Nama Sekolah Tidak Tersedia");
  const npsn = getData(schoolData, ["npsn"], "-");
  const address = getData(schoolData, ["address"], "-");

  const desa = schoolData?.desa ?? schoolData?.village_name ?? META?.desa ?? "-";
  const kecamatan = schoolData?.kecamatan ?? schoolData?.kecamatan_name ?? META?.kecamatan ?? "-";

  // =========================================================
  // SISWA
  // =========================================================
  const siswaRowsMeta = buildStudentRowsFromMeta(META?.siswa);
  const siswaRowsFallback = buildStudentRowsFromClassesTable(schoolData?.classes);
  const siswaRows = siswaRowsMeta.length ? siswaRowsMeta : siswaRowsFallback;

  const siswaL = num(schoolData?.st_male, 0);
  const siswaP = num(schoolData?.st_female, 0);
  const totalFromLP = siswaL + siswaP;

  const totalFromRows = siswaRows.reduce((a, r) => a + num(r.l, 0) + num(r.p, 0), 0);
  const totalSiswa =
    totalFromRows > 0 ? totalFromRows : totalFromLP > 0 ? totalFromLP : num(schoolData?.student_count, 0);

  // ABK
  const abkRows = buildStudentRowsFromMeta(META?.siswaAbk);
  const totalAbkL = abkRows.reduce((a, r) => a + num(r.l, 0), 0);
  const totalAbkP = abkRows.reduce((a, r) => a + num(r.p, 0), 0);
  const showAbk = hasAnyNumber(totalAbkL, totalAbkP);

  // ROMBEL
  const rombelObj = isObj(schoolData?.rombel) ? schoolData.rombel : isObj(META?.rombel) ? META.rombel : {};
  const rombelRows = buildRombelRows(rombelObj);
  const totalRombel = num(rombelObj?.total, rombelRows.reduce((a, r) => a + num(r.value, 0), 0)) || 0;
  const showRombel = hasKeys(rombelObj) || rombelRows.length > 0;

  // =========================================================
  // KONDISI PRASARANA  (INI AKAN DITARUH PALING ATAS)
  // =========================================================
  const classrooms = isObj(PR?.classrooms)
    ? PR.classrooms
    : isObj(schoolData?.class_condition)
    ? schoolData.class_condition
    : null;

  const rusakBerat = num(classrooms?.heavy_damage ?? classrooms?.classrooms_heavy_damage ?? classrooms?.classrooms_heavy, 0);
  const rusakSedang = num(
    classrooms?.moderate_damage ?? classrooms?.classrooms_moderate_damage ?? classrooms?.classrooms_moderate,
    0
  );
  const kurangRkb = num(classrooms?.kurangRkb ?? classrooms?.lacking_rkb, 0);

  const rehabKegiatan = num(getData(META, ["kegiatanFisik", "rehabRuangKelas"], 0), 0);
  const pembangunanKegiatan = num(getData(META, ["kegiatanFisik", "pembangunanRKB"], 0), 0);

  const showRKB =
    hasKeys(classrooms) || hasAnyNumber(rusakBerat, rusakSedang, kurangRkb, rehabKegiatan, pembangunanKegiatan);

  const maxRoomValue = Math.max(rusakBerat, rusakSedang, kurangRkb, rehabKegiatan, pembangunanKegiatan, 1);

  const calculateHeight = (value) => {
    const v = Number(value) || 0;
    if (v === 0) return "calc(0% + 20px)";
    return `calc(${(v / maxRoomValue) * 100}% + 20px)`;
  };

  // Data fisik (ukuran + gedung)
  const ukuran = isObj(PR?.ukuran) ? PR.ukuran : {};
  const luasTanah = ukuran?.tanah;
  const luasBangunan = ukuran?.bangunan;
  const luasHalaman = ukuran?.halaman;
  const jumlahGedung = num(getData(PR, ["gedung", "jumlah"], 0), 0);

  const showTanahGedung = hasKeys(ukuran) || hasAnyNumber(luasTanah, luasBangunan, luasHalaman, jumlahGedung);

  // Toilet
  const stToilet = normalizeToilet(PR?.students_toilet);
  const tcToilet = normalizeToilet(PR?.teachers_toilet);

  const stSum = sumOverall(stToilet);
  const tcSum = sumOverall(tcToilet);

  const toiletTotal = num(stSum.total_all, 0) + num(tcSum.total_all, 0);
  const toiletGood = num(stSum.good, 0) + num(tcSum.good, 0);
  const toiletMod = num(stSum.moderate_damage, 0) + num(tcSum.moderate_damage, 0);
  const toiletHeavy = num(stSum.heavy_damage, 0) + num(tcSum.heavy_damage, 0);

  const showToilet =
    hasKeys(PR?.students_toilet) || hasKeys(PR?.teachers_toilet) || hasAnyNumber(toiletTotal, toiletGood, toiletMod, toiletHeavy);

  // RGKS / UKS
  const rgksRaw = PR?.rgks;
  const showRgks = hasKeys(rgksRaw);
  const rgks = normalizeRoom(rgksRaw);

  const uksRaw = PR?.uks_room;
  const showUks = hasKeys(uksRaw);
  const uks = normalizeRoom(uksRaw);

  // Playground / Area bermain
  const playgroundArea =
    getData(PR, ["playground_area"], undefined) ??
    getData(PR, ["playground", "area"], undefined) ??
    getData(PR, ["area_bermain"], undefined);
  const showPlayground = playgroundArea != null;

  // APE
  const ape = PR?.ape;
  const apeLuarAvailable = getData(ape, ["luar", "available"], undefined) ?? getData(ape, ["luar", "tersedia"], undefined);
  const apeLuarCondition = getData(ape, ["luar", "condition"], undefined) ?? getData(ape, ["luar", "kondisi"], undefined);

  const apeDalamAvailable = getData(ape, ["dalam", "available"], undefined) ?? getData(ape, ["dalam", "tersedia"], undefined);
  const apeDalamCondition = getData(ape, ["dalam", "condition"], undefined) ?? getData(ape, ["dalam", "kondisi"], undefined);

  const showApe = apeLuarAvailable != null || apeLuarCondition != null || apeDalamAvailable != null || apeDalamCondition != null;

  // Mebeulair
  const meb = isObj(PR?.mebeulair) ? PR.mebeulair : null;
  const meja = num(getData(meb, ["tables", "total"], undefined), 0);
  const kursi = num(getData(meb, ["chairs", "total"], undefined), 0);
  const komputer = num(getData(meb, ["computer"], undefined), 0);
  const showMebeulair = hasKeys(meb) || hasAnyNumber(meja, kursi, komputer);

  const showPrasarana = showRKB || showTanahGedung || showToilet || showRgks || showUks || showPlayground || showApe || showMebeulair;

  // =========================================================
  // GURU
  // =========================================================
  const guruObj = isObj(schoolData?.guru) ? schoolData.guru : isObj(META?.guru) ? META.guru : null;
  const jumlahGuru = num(getData(guruObj, ["jumlahGuru"], 0), 0);
  const kekuranganGuru = num(getData(guruObj, ["kekuranganGuru"], 0), 0);
  const showGuru = hasKeys(guruObj) || hasAnyNumber(jumlahGuru, kekuranganGuru);

  // Kelembagaan (format sesuai contoh)
  const kelembagaanRows = renderKelembagaanRows(KELEM);
  const showKelembagaan = Array.isArray(kelembagaanRows) && kelembagaanRows.length > 0;

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
            <span className={styles.label}>Jumlah Siswa (Total)</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{totalSiswa}</span>
          </div>
        </div>

        <button onClick={handleLocationClick} className={styles.locationButton}>
          📍 Lihat Lokasi di Google Maps
        </button>
      </div>

      {/* =========================================================
          ✅ II. KONDISI PRASARANA (DIPINDAH JADI PALING ATAS)
         ========================================================= */}
      {showPrasarana && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>II. Kondisi Prasarana</h2>

          {/* 1) Ruang Kelas & Intervensi */}
          {showRKB && (
            <div className={styles.card}>
              <h3 className={styles.subsectionTitle}>Ruang Kelas & Intervensi (RKB)</h3>
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
                    <div className={`${styles.bar} ${styles.barOrange}`} style={{ height: calculateHeight(pembangunanKegiatan) }}>
                      <span className={styles.barLabel}>{pembangunanKegiatan}</span>
                    </div>
                    <span className={styles.barText}>Pembangunan RKB</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2) Data Fisik */}
          {showTanahGedung && (
            <div className={styles.card}>
              <h3 className={styles.subsectionTitle}>Data Fisik Bangunan Sekolah</h3>
              {luasTanah != null && (
                <div className={styles.dataRow}>
                  <span>Luas Tanah: {luasTanah} m²</span>
                </div>
              )}
              {luasBangunan != null && (
                <div className={styles.dataRow}>
                  <span>Luas Bangunan: {luasBangunan} m²</span>
                </div>
              )}
              {luasHalaman != null && (
                <div className={styles.dataRow}>
                  <span>Luas Halaman: {luasHalaman} m²</span>
                </div>
              )}
              {hasAnyNumber(jumlahGedung) && (
                <div className={styles.dataRow}>
                  <span>Jumlah Gedung: {jumlahGedung}</span>
                </div>
              )}
            </div>
          )}

          {/* 3) Toilet */}
          {showToilet && (
            <div className={styles.card}>
              <h3 className={styles.subsectionTitle}>Toilet (Ringkasan)</h3>
              <div className={styles.dataRow}>
                <span>Jumlah Toilet (Total): {toiletTotal}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Kondisi Baik: {toiletGood}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Sedang: {toiletMod}</span>
              </div>
              <div className={styles.dataRow}>
                <span>Rusak Berat: {toiletHeavy}</span>
              </div>
            </div>
          )}

          {/* 4) Ruang Penunjang & Area Bermain */}
          {(showRgks || showUks || showPlayground) && (
            <div className={styles.card}>
              <h3 className={styles.subsectionTitle}>Ruang Penunjang & Area Bermain</h3>

              {showRgks && (
                <div className={styles.subsection}>
                  <h4 className={styles.subsectionTitle}>RGKS</h4>
                  <div className={styles.dataRow}><span>Jumlah RGKS (Total): {rgks.total_all}</span></div>
                  <div className={styles.dataRow}><span>Kondisi Baik: {rgks.good}</span></div>
                  <div className={styles.dataRow}><span>Rusak Sedang: {rgks.moderate_damage}</span></div>
                  <div className={styles.dataRow}><span>Rusak Berat: {rgks.heavy_damage}</span></div>
                </div>
              )}

              {showUks && (
                <div className={styles.subsection}>
                  <h4 className={styles.subsectionTitle}>UKS</h4>
                  <div className={styles.dataRow}><span>Jumlah Ruang UKS (Total): {uks.total_all}</span></div>
                  <div className={styles.dataRow}><span>Kondisi Baik: {uks.good}</span></div>
                  <div className={styles.dataRow}><span>Rusak Sedang: {uks.moderate_damage}</span></div>
                  <div className={styles.dataRow}><span>Rusak Berat: {uks.heavy_damage}</span></div>
                </div>
              )}

              {showPlayground && (
                <div className={styles.subsection}>
                  <h4 className={styles.subsectionTitle}>Area Bermain</h4>
                  <div className={styles.dataRow}>
                    <span>Lahan/Area Bermain: {playgroundArea}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5) APE */}
          {showApe && (
            <div className={styles.card}>
              <h3 className={styles.subsectionTitle}>Alat Permainan Edukatif (APE)</h3>

              {(apeLuarAvailable != null || apeLuarCondition != null) && (
                <div className={styles.subsection}>
                  <h4 className={styles.subsectionTitle}>APE Luar</h4>
                  {apeLuarAvailable != null && (
                    <div className={styles.dataRow}><span>APE Luar: {String(apeLuarAvailable)}</span></div>
                  )}
                  {apeLuarCondition != null && (
                    <div className={styles.dataRow}><span>Kondisi APE Luar: {String(apeLuarCondition)}</span></div>
                  )}
                </div>
              )}

              {(apeDalamAvailable != null || apeDalamCondition != null) && (
                <div className={styles.subsection}>
                  <h4 className={styles.subsectionTitle}>APE Dalam</h4>
                  {apeDalamAvailable != null && (
                    <div className={styles.dataRow}><span>APE Dalam: {String(apeDalamAvailable)}</span></div>
                  )}
                  {apeDalamCondition != null && (
                    <div className={styles.dataRow}><span>Kondisi APE Dalam: {String(apeDalamCondition)}</span></div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 6) Mebeulair */}
          {showMebeulair && (
            <div className={styles.card}>
              <h3 className={styles.subsectionTitle}>Mebeulair & Peralatan Teknologi</h3>
              <div className={styles.dataRow}><span>Jumlah Meja: {meja}</span></div>
              <div className={styles.dataRow}><span>Jumlah Kursi: {kursi}</span></div>
              <div className={styles.dataRow}><span>Jumlah Komputer/Laptop: {komputer}</span></div>
            </div>
          )}
        </div>
      )}

      {/* ===================== III. DATA SISWA ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>III. Data Siswa</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Siswa Reguler</h3>

            <div className={styles.dataRow}>
              <span>Jumlah Siswa (Total): {totalSiswa}</span>
            </div>

            {siswaRows.length ? (
              <div className={styles.subsection}>
                <h3 className={styles.subsectionTitle}>Rincian per Kelas/Tipe</h3>
                {siswaRows.map((r) => (
                  <React.Fragment key={r.key}>
                    <div className={styles.dataRow}>
                      <span>{r.label} Laki-laki: {r.l}</span>
                    </div>
                    <div className={styles.dataRow}>
                      <span>{r.label} Perempuan: {r.p}</span>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <>
                <div className={styles.dataRow}><span>Jumlah Siswa Laki-Laki: {siswaL}</span></div>
                <div className={styles.dataRow}><span>Jumlah Siswa Perempuan: {siswaP}</span></div>
              </>
            )}
          </div>

          {showAbk && (
            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Siswa Berkebutuhan Khusus (ABK)</h3>
              <div className={styles.dataRow}><span>ABK Laki-Laki (Total): {totalAbkL}</span></div>
              <div className={styles.dataRow}><span>ABK Perempuan (Total): {totalAbkP}</span></div>

              {abkRows.length ? (
                <div className={styles.subsection}>
                  <h3 className={styles.subsectionTitle}>Rincian ABK per Kelas/Tipe</h3>
                  {abkRows.map((r) => (
                    <React.Fragment key={r.key}>
                      <div className={styles.dataRow}><span>{r.label} ABK Laki-laki: {r.l}</span></div>
                      <div className={styles.dataRow}><span>{r.label} ABK Perempuan: {r.p}</span></div>
                    </React.Fragment>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* ===================== IV. ROMBEL ===================== */}
      {showRombel && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>IV. Rombongan Belajar (Rombel)</h2>
          <div className={styles.card}>
            {rombelRows.map((r) => (
              <div className={styles.dataRow} key={r.key}>
                <span>Jumlah Rombel ({r.label}): {r.value}</span>
              </div>
            ))}
            <div className={styles.dataRow}>
              <span>Jumlah Rombel (Total): {totalRombel}</span>
            </div>
          </div>
        </div>
      )}

      {/* ===================== XII. KELEMBAGAAN ===================== */}
      {showKelembagaan && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>XII. Kelembagaan</h2>
          <div className={styles.card}>{kelembagaanRows}</div>
        </div>
      )}

      {/* ===================== VI. DATA GURU ===================== */}
      {showGuru && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>VI. Data Guru</h2>
          <div className={styles.card}>
            <div className={styles.dataRow}><span>Jumlah Guru: {jumlahGuru}</span></div>
            <div className={styles.dataRow}><span>Kekurangan Guru: {kekuranganGuru}</span></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolDetailPaud;
