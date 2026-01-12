// src/components/schools/SchoolDetail/Pkbm/SchoolDetailPkbm.jsx
import React from "react";
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

/* =========================================================
   ✅ KELEMBAGAAN: label + value (rapih, manusiawi)
   Target tampilan:
   - baris umum (Alat Rumah Tangga, Pembinaan, Asesmen, dst.)
   - heading "BOP" lalu sub-baris
   - heading "Perizinan & Kurikulum" lalu sub-baris
   ========================================================= */
const normKey = (k) => String(k ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

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
    .replace(/([a-z])([A-Z])/g, "$1 $2")
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
  if (!s) return null;

  const upper = s.toUpperCase();
  const YES = new Set(["YA", "Y", "YES", "TRUE", "1"]);
  const NO = new Set(["TIDAK", "TDK", "NO", "FALSE", "0"]);
  const NOTYET = new Set(["BELUM", "BLM"]);

  if (YES.has(upper)) return "Ya";
  if (NO.has(upper)) return "Tidak";
  if (NOTYET.has(upper)) return "Belum";

  if (upper === "BAIK") return "Baik";
  if (upper === "RUSAK") return "Rusak";
  if (upper === "RUSAK SEDANG" || upper === "RUSAK_SEDANG") return "Rusak Sedang";
  if (upper === "RUSAK BERAT" || upper === "RUSAK_BERAT") return "Rusak Berat";

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

const renderKelembagaanBlocks = (kelembagaan) => {
  if (!isObj(kelembagaan)) return null;

  const bopKey = findKeyByNorm(kelembagaan, "bop");
  const perizinanKey = findKeyByNorm(kelembagaan, "perizinan");
  const kurikulumKey = findKeyByNorm(kelembagaan, "kurikulum");

  const bopObj = bopKey ? kelembagaan[bopKey] : null;
  const perizinanObj = perizinanKey ? kelembagaan[perizinanKey] : null;
  const kurikulumObj = kurikulumKey ? kelembagaan[kurikulumKey] : null;

  // base (top-level) selain group objects
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

  const orderedBaseKeys = [];
  for (const wanted of baseOrder) {
    const realK = findKeyByNorm(baseObj, wanted);
    if (realK) orderedBaseKeys.push(realK);
  }

  // tambahkan base key lain (primitif) yang belum masuk
  const already = new Set(orderedBaseKeys.map((k) => normKey(k)));
  for (const k of Object.keys(baseObj)) {
    if (already.has(normKey(k))) continue;
    orderedBaseKeys.push(k);
  }

  const out = [];

  // 1) base rows
  for (const k of orderedBaseKeys) {
    const v = baseObj[k];
    if (v === null || v === undefined || v === "") continue;

    // kalau object di base: flatten 1 level sebagai heading + rows (opsional)
    if (isObj(v)) {
      const innerEntries = Object.entries(v)
        .filter(([, vv]) => vv !== null && vv !== undefined && vv !== "")
        .map(([ik, iv]) => ({ ik, iv }));

      if (innerEntries.length) {
        out.push(
          <div className={styles.subsection} key={`kelem_base_obj_${k}`}>
            <h3 className={styles.subsectionTitle}>{prettyLabel(k)}</h3>
            {innerEntries.map(({ ik, iv }) => {
              const pv = prettyValue(iv);
              if (pv == null) return null;
              return (
                <div className={styles.dataRow} key={`kelem_${k}_${ik}`}>
                  <span>
                    {prettyLabel(ik)}: {pv}
                  </span>
                </div>
              );
            })}
          </div>
        );
      }
      continue;
    }

    const pv = prettyValue(v);
    if (pv == null) continue;

    out.push(
      <div className={styles.dataRow} key={`kelem_base_${k}`}>
        <span>
          {prettyLabel(k)}: {pv}
        </span>
      </div>
    );
  }

  // 2) BOP group
  const bopRows = [];
  if (isObj(bopObj)) {
    const pengelolaKey = findKeyByNorm(bopObj, "pengelola");
    const tenagaKey = findKeyByNorm(bopObj, "tenagaPeningkatan");

    if (pengelolaKey) {
      const pv = prettyValue(bopObj[pengelolaKey]);
      if (pv != null) bopRows.push({ k: pengelolaKey, v: pv });
    }
    if (tenagaKey) {
      const pv = prettyValue(bopObj[tenagaKey]);
      if (pv != null) bopRows.push({ k: tenagaKey, v: pv });
    }

    // fallback: tampilkan field bop lainnya (jika ada)
    for (const [k, v] of Object.entries(bopObj)) {
      if (normKey(k) === normKey(pengelolaKey) || normKey(k) === normKey(tenagaKey)) continue;
      const pv = isObj(v) ? null : prettyValue(v);
      if (pv != null) bopRows.push({ k, v: pv });
    }
  }

  if (bopRows.length) {
    out.push(
      <div className={styles.subsection} key="kelem_bop_group">
        <h3 className={styles.subsectionTitle}>BOP</h3>
        {bopRows.map((r) => (
          <div className={styles.dataRow} key={`bop_${r.k}`}>
            <span>
              {prettyLabel(r.k)}: {r.v}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // 3) Perizinan & Kurikulum group
  const izinRows = [];
  if (isObj(perizinanObj)) {
    const pengKey = findKeyByNorm(perizinanObj, "pengendalian");
    const kelKey = findKeyByNorm(perizinanObj, "kelayakan");

    if (pengKey) {
      const pv = prettyValue(perizinanObj[pengKey]);
      if (pv != null) izinRows.push({ k: pengKey, v: pv });
    }
    if (kelKey) {
      const pv = prettyValue(perizinanObj[kelKey]);
      if (pv != null) izinRows.push({ k: kelKey, v: pv });
    }

    for (const [k, v] of Object.entries(perizinanObj)) {
      if (normKey(k) === normKey(pengKey) || normKey(k) === normKey(kelKey)) continue;
      const pv = isObj(v) ? null : prettyValue(v);
      if (pv != null) izinRows.push({ k, v: pv });
    }
  }

  const kurRows = [];
  if (isObj(kurikulumObj)) {
    const silKey = findKeyByNorm(kurikulumObj, "silabus");
    const kdKey = findKeyByNorm(kurikulumObj, "kompetensiDasar");

    if (silKey) {
      const pv = prettyValue(kurikulumObj[silKey]);
      if (pv != null) kurRows.push({ k: silKey, v: pv });
    }
    if (kdKey) {
      const pv = prettyValue(kurikulumObj[kdKey]);
      if (pv != null) kurRows.push({ k: kdKey, v: pv });
    }

    for (const [k, v] of Object.entries(kurikulumObj)) {
      if (normKey(k) === normKey(silKey) || normKey(k) === normKey(kdKey)) continue;
      const pv = isObj(v) ? null : prettyValue(v);
      if (pv != null) kurRows.push({ k, v: pv });
    }
  }

  if (izinRows.length || kurRows.length) {
    out.push(
      <div className={styles.subsection} key="kelem_perizinan_kurikulum_group">
        <h3 className={styles.subsectionTitle}>Perizinan & Kurikulum</h3>

        {izinRows.map((r) => (
          <div className={styles.dataRow} key={`izin_${r.k}`}>
            <span>
              {prettyLabel(r.k)}: {r.v}
            </span>
          </div>
        ))}

        {kurRows.map((r) => (
          <div className={styles.dataRow} key={`kur_${r.k}`}>
            <span>
              {prettyLabel(r.k)}: {r.v}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return out.length ? out : null;
};

const normalizeRoom = (src) => {
  const o = isObj(src) ? src : {};
  const good = num(o.good, 0);
  const moderate = num(o.moderate_damage, 0);
  const heavy = num(o.heavy_damage, 0);
  const totalAll = num(o.total_all ?? o.total, good + moderate + heavy);
  const totalMh = num(o.total_mh, moderate + heavy);
  return {
    good,
    moderate_damage: moderate,
    heavy_damage: heavy,
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
  const moderate_damage =
    num(t?.male?.moderate_damage, 0) + num(t?.female?.moderate_damage, 0);
  const heavy_damage =
    num(t?.male?.heavy_damage, 0) + num(t?.female?.heavy_damage, 0);
  return { total_all, good, moderate_damage, heavy_damage };
};

/* ============================
   PKBM: siswa dari meta input
   meta.siswa.paketA.kelas1.{l,p}
   meta.siswaAbk.paketA.kelas1.{l,p}
   ============================ */
function sumLpDeep(obj) {
  if (!isObj(obj)) return { l: 0, p: 0 };
  let L = 0;
  let P = 0;

  for (const [, v] of Object.entries(obj)) {
    if (!isObj(v)) continue;

    const l = v?.l;
    const p = v?.p;
    const hasLeaf =
      (l != null || p != null) &&
      (typeof l !== "object" && typeof p !== "object");

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

      rows.push({
        label: `${labelPrefix}${paketLabelFixed} ${kelasLabel} Laki-laki`,
        value: l,
      });
      rows.push({
        label: `${labelPrefix}${paketLabelFixed} ${kelasLabel} Perempuan`,
        value: p,
      });
    }
  }

  return rows;
}

/* ============================
   PKBM: rombel dari meta input
   meta.rombel.paketA.kelas1 = n
   ============================ */
function sumRombelPkbm(rombelObj) {
  if (!isObj(rombelObj)) return 0;
  let total = 0;
  for (const [, paketVal] of Object.entries(rombelObj)) {
    if (!isObj(paketVal)) continue;
    for (const [, v] of Object.entries(paketVal)) {
      total += num(v, 0);
    }
  }
  return total;
}

function buildRombelPkbmRows(rombelObj) {
  const rows = [];
  if (!isObj(rombelObj)) return rows;

  for (const [paketKey, paketVal] of Object.entries(rombelObj)) {
    if (!isObj(paketVal)) continue;

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

      rows.push({
        label: `${paketLabelFixed} ${kelasLabel}`,
        value: num(v, 0),
      });
    }
  }

  return rows;
}

const SchoolDetailPkbm = ({ schoolData }) => {
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

      if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
        [lat, lng] = [lng, lat];
      }

      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
    }
    alert("Data koordinat lokasi untuk sekolah ini tidak tersedia atau tidak valid.");
  };

  if (!schoolData) {
    return (
      <div className={styles.container}>
        <p>Memuat data...</p>
      </div>
    );
  }

  const META = isObj(schoolData?.meta) ? schoolData.meta : {};
  const PR = isObj(META?.prasarana) ? META.prasarana : {};
  const KELEM = isObj(META?.kelembagaan) ? META.kelembagaan : {};

  // IDENTITAS
  const jenjang = schoolData?.jenjang || schoolData?.level || META?.jenjang || "PKBM";
  const statusSekolah =
    schoolData?.status || schoolData?.status_sekolah || schoolData?.statusSekolah;

  const nama = getData(schoolData, ["name"], "Nama PKBM Tidak Tersedia");
  const npsn = getData(schoolData, ["npsn"], "-");
  const address = getData(schoolData, ["address"], META?.alamat ?? "-");

  const desa =
    schoolData?.desa ??
    schoolData?.village_name ??
    getData(schoolData, ["village"], undefined) ??
    META?.desa ??
    "-";

  const kecamatan = schoolData?.kecamatan ?? META?.kecamatan ?? "-";

  // SISWA: PRIORITAS meta.siswa
  const siswaMeta = isObj(META?.siswa) ? META.siswa : null;
  const abkMeta = isObj(META?.siswaAbk) ? META.siswaAbk : null;

  const sumMeta = sumLpDeep(siswaMeta);
  const sumMetaAbk = sumLpDeep(abkMeta);

  const siswaL_db = num(schoolData?.st_male, 0);
  const siswaP_db = num(schoolData?.st_female, 0);

  const siswaL = sumMeta.l > 0 ? sumMeta.l : siswaL_db;
  const siswaP = sumMeta.p > 0 ? sumMeta.p : siswaP_db;
  const totalFromLP = siswaL + siswaP;
  const totalSiswa = totalFromLP > 0 ? totalFromLP : num(schoolData?.student_count, 0);

  const abkL = sumMetaAbk.l;
  const abkP = sumMetaAbk.p;
  const showAbk = hasAnyNumber(abkL, abkP);

  const rincianSiswaRows = buildPkbmRincianRows(siswaMeta, "");
  const showRincianSiswa = rincianSiswaRows.length > 0;

  const rincianAbkRows = buildPkbmRincianRows(abkMeta, "ABK ");
  const showRincianAbk = rincianAbkRows.length > 0 && showAbk;

  // PRASARANA (dipindah jadi bagian awal setelah Identitas)
  const classrooms = isObj(PR?.classrooms)
    ? PR.classrooms
    : isObj(schoolData?.class_condition)
    ? schoolData.class_condition
    : null;

  const rusakBerat = num(
    classrooms?.heavy_damage ??
      classrooms?.classrooms_heavy_damage ??
      classrooms?.classrooms_heavy,
    0
  );
  const rusakSedang = num(
    classrooms?.moderate_damage ??
      classrooms?.classrooms_moderate_damage ??
      classrooms?.classrooms_moderate,
    0
  );
  const kurangRkb = num(classrooms?.kurangRkb ?? classrooms?.lacking_rkb, 0);

  const rehabKegiatan = num(getData(META, ["kegiatanFisik", "rehabRuangKelas"], 0), 0);
  const pembangunanKegiatan = num(getData(META, ["kegiatanFisik", "pembangunanRKB"], 0), 0);

  const showRKB =
    hasKeys(classrooms) ||
    hasAnyNumber(rusakBerat, rusakSedang, kurangRkb, rehabKegiatan, pembangunanKegiatan);

  const maxRoomValue = Math.max(rusakBerat, rusakSedang, kurangRkb, rehabKegiatan, pembangunanKegiatan, 1);
  const calculateHeight = (value) => {
    const v = Number(value) || 0;
    if (v === 0) return "calc(0% + 20px)";
    return `calc(${(v / maxRoomValue) * 100}% + 20px)`;
  };

  const ukuran = isObj(PR?.ukuran) ? PR.ukuran : {};
  const luasTanah = getData(ukuran, ["tanah"], undefined);
  const luasBangunan = getData(ukuran, ["bangunan"], undefined);
  const luasHalaman = getData(ukuran, ["halaman"], undefined);
  const jumlahGedung = getData(PR, ["gedung", "jumlah"], undefined);

  const showUkuranGedung =
    luasTanah != null || luasBangunan != null || luasHalaman != null || jumlahGedung != null;

  const stToilet = normalizeToilet(PR?.students_toilet);
  const tcToilet = normalizeToilet(PR?.teachers_toilet);

  const stSum = sumOverall(stToilet);
  const tcSum = sumOverall(tcToilet);

  const toiletTotal = num(stSum.total_all, 0) + num(tcSum.total_all, 0);
  const toiletGood = num(stSum.good, 0) + num(tcSum.good, 0);
  const toiletMod = num(stSum.moderate_damage, 0) + num(tcSum.moderate_damage, 0);
  const toiletHeavy = num(stSum.heavy_damage, 0) + num(tcSum.heavy_damage, 0);

  const showToilet =
    hasKeys(PR?.students_toilet) ||
    hasKeys(PR?.teachers_toilet) ||
    hasAnyNumber(toiletTotal, toiletGood, toiletMod, toiletHeavy);

  const rgksRaw = PR?.rgks;
  const showRgks = hasKeys(rgksRaw);
  const rgks = normalizeRoom(rgksRaw);

  const uksRaw = PR?.uks_room;
  const showUks = hasKeys(uksRaw);
  const uks = normalizeRoom(uksRaw);

  const showRuangPenunjang = showRgks || showUks;

  const meb = isObj(PR?.mebeulair) ? PR.mebeulair : null;
  const fc = isObj(schoolData?.furniture_computer) ? schoolData.furniture_computer : null;

  const meja = num(getData(meb, ["tables", "total"], undefined), num(getData(fc, ["tables"], 0), 0));
  const kursi = num(getData(meb, ["chairs", "total"], undefined), num(getData(fc, ["chairs"], 0), 0));
  const papanTulis = num(getData(PR, ["papan_tulis"], undefined), num(getData(fc, ["boards"], 0), 0));
  const komputer = num(getData(meb, ["computer"], undefined), num(getData(fc, ["computer"], 0), 0));

  const showMebeulair =
    hasKeys(meb) || hasKeys(fc) || hasAnyNumber(meja, kursi, papanTulis, komputer);

  const showPrasarana =
    showRKB || showUkuranGedung || showToilet || showRuangPenunjang || showMebeulair;

  // ROMBEL PKBM
  const rombelObj = isObj(META?.rombel) ? META.rombel : null;
  const rombelRows = buildRombelPkbmRows(rombelObj);
  const totalRombel = sumRombelPkbm(rombelObj);
  const showRombel = rombelRows.length > 0 || totalRombel > 0;

  // KELEMBAGAAN (format sesuai contoh)
  const kelembagaanBlocks = renderKelembagaanBlocks(KELEM);
  const showKelembagaan = Array.isArray(kelembagaanBlocks) && kelembagaanBlocks.length > 0;

  // GURU (input form)
  const guruMeta = isObj(META?.guru) ? META.guru : null;
  const jumlahGuru = num(getData(guruMeta, ["jumlahGuru"], undefined), 0);
  const kekuranganGuru = num(getData(guruMeta, ["kekuranganGuru"], undefined), 0);
  const showGuru = hasKeys(guruMeta) || hasAnyNumber(jumlahGuru, kekuranganGuru);

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
        </div>

        <button onClick={handleLocationClick} className={styles.locationButton}>
          📍 Lihat Lokasi di Google Maps
        </button>
      </div>

      {/* ===================== II. KONDISI PRASARANA (DIPINDAH KE ATAS) ===================== */}
      {showPrasarana && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>II. Kondisi Prasarana</h2>

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

          {showUkuranGedung && (
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
              {jumlahGedung != null && (
                <div className={styles.dataRow}>
                  <span>Jumlah Gedung: {jumlahGedung}</span>
                </div>
              )}
            </div>
          )}

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

          {showRuangPenunjang && (
            <div className={styles.card}>
              <h3 className={styles.subsectionTitle}>Ruang Penunjang</h3>

              {showRgks && (
                <div className={styles.subsection}>
                  <h4 className={styles.subsectionTitle}>RGKS</h4>
                  <div className={styles.dataRow}>
                    <span>Jumlah RGKS (Total): {rgks.total_all}</span>
                  </div>
                  <div className={styles.dataRow}>
                    <span>Kondisi Baik: {rgks.good}</span>
                  </div>
                  <div className={styles.dataRow}>
                    <span>Rusak Sedang: {rgks.moderate_damage}</span>
                  </div>
                  <div className={styles.dataRow}>
                    <span>Rusak Berat: {rgks.heavy_damage}</span>
                  </div>
                </div>
              )}

              {showUks && (
                <div className={styles.subsection}>
                  <h4 className={styles.subsectionTitle}>UKS</h4>
                  <div className={styles.dataRow}>
                    <span>Jumlah Ruang UKS (Total): {uks.total_all}</span>
                  </div>
                  <div className={styles.dataRow}>
                    <span>Kondisi Baik: {uks.good}</span>
                  </div>
                  <div className={styles.dataRow}>
                    <span>Rusak Sedang: {uks.moderate_damage}</span>
                  </div>
                  <div className={styles.dataRow}>
                    <span>Rusak Berat: {uks.heavy_damage}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {showMebeulair && (
            <div className={styles.card}>
              <h3 className={styles.subsectionTitle}>Mebeulair & Peralatan Teknologi</h3>
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
                <span>Jumlah Komputer/Laptop: {komputer}</span>
              </div>
            </div>
          )}
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

            {showRincianSiswa && (
              <div className={styles.subsection}>
                <h4 className={styles.subsectionTitle}>Rincian per Paket/Kelas</h4>
                {rincianSiswaRows.map((r) => (
                  <div className={styles.dataRow} key={r.label}>
                    <span>
                      {r.label}: {r.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {showAbk && (
            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Peserta Didik Berkebutuhan Khusus</h3>
              <div className={styles.dataRow}>
                <span>ABK Laki-Laki (Total): {abkL}</span>
              </div>
              <div className={styles.dataRow}>
                <span>ABK Perempuan (Total): {abkP}</span>
              </div>

              {showRincianAbk && (
                <div className={styles.subsection}>
                  <h4 className={styles.subsectionTitle}>Rincian ABK per Paket/Kelas</h4>
                  {rincianAbkRows.map((r) => (
                    <div className={styles.dataRow} key={r.label}>
                      <span>
                        {r.label}: {r.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
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
      )}

      {/* ===================== XII. KELEMBAGAAN ===================== */}
      {showKelembagaan && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>XII. Kelembagaan</h2>
          <div className={styles.card}>{kelembagaanBlocks}</div>
        </div>
      )}

      {/* ===================== VI. DATA GURU ===================== */}
      {showGuru && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>VI. Data Guru</h2>
          <div className={styles.card}>
            <div className={styles.dataRow}>
              <span>Jumlah Guru: {jumlahGuru}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Kekurangan Guru: {kekuranganGuru}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * PENTING:
 * Harus ada default export untuk React.lazy(() => import(...))
 */
export default SchoolDetailPkbm;
