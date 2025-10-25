// src/pages/Map/Map.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import SimpleMap from "@/components/common/Map/SimpleMap.jsx";
import styles from "./Map.module.css";
import { kecKey, getLatLngSafe, uniqueBy } from "@/components/common/Map/mapUtils";
import { httpJSON } from "@/utils/http";

const DEFAULT_CENTER = [-7.214, 107.903];
const DEFAULT_ZOOM = 11;

// Normalisasi ringan
const norm = (x) =>
  String(x ?? "")
    .normalize("NFKD")
    .replace(/\s+/g, " ")
    .trim();

// Kunci agresif untuk matching string
const keyify = (x) => norm(x).toUpperCase().replace(/[^A-Z0-9]/g, "");

/* ===================== Geo helpers ===================== */
// Ambil nama kecamatan dari GeoJSON (jadi sumber dropdown kecamatan)
function extractKecamatanNames(geojson) {
  const gj = geojson && geojson.type ? geojson : null;
  if (!gj || !Array.isArray(gj.features)) return [];
  const props = ["district", "District", "kecamatan", "Kecamatan", "NAMKEC", "NAMKec", "name", "Name", "NAMOBJ"];
  const set = new Set();
  for (const f of gj.features) {
    const p = f?.properties || {};
    let v = "";
    for (const k of props) if (p[k]) { v = p[k]; break; }
    if (v) set.add(norm(v));
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
}

// Bangun master DESA→KECAMATAN dan KECAMATAN→Set<DESA> dari desa.geojson
function buildDesaKecMasters(geojson) {
  const gj = geojson && geojson.type ? geojson : null;
  const desaToKec = new Map();
  const kecToDesa = new Map();
  if (!gj || !Array.isArray(gj.features)) return { desaToKec, kecToDesa };

  const desaKeys = ["village", "Village", "DESA", "desa", "NAMA_DESA", "NAMOBJ", "name", "Name", "KELURAHAN", "kelurahan"];
  const kecKeys  = ["district", "District", "kecamatan", "Kecamatan", "NAMA_KEC", "NAMKEC", "NAMKec", "KECAMATAN"];

  for (const f of gj.features) {
    const p = f?.properties || {};
    let desa = "";
    let kec  = "";
    for (const k of desaKeys) if (p[k]) { desa = p[k]; break; }
    for (const k of kecKeys)  if (p[k]) { kec  = p[k]; break; }
    if (!desa || !kec) continue;

    const desaKey = keyify(desa);
    const kecName = norm(kec);
    desaToKec.set(desaKey, kecName);

    if (!kecToDesa.has(kecName)) kecToDesa.set(kecName, new Set());
    kecToDesa.get(kecName).add(norm(desa));
  }
  return { desaToKec, kecToDesa };
}

/* ===================== Page ===================== */
export default function MapPage() {
  // Data
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // GeoJSON untuk overlay batas
  const [kecamatanGeo, setKecamatanGeo] = useState(null);
  const [desaGeo, setDesaGeo] = useState(null);

  // Master dari geojson
  const [kecamatanMaster, setKecamatanMaster] = useState([]); // sumber dropdown kecamatan (target 42)
  const [desaToKec, setDesaToKec] = useState(new Map());       // desa(key) -> kecamatan
  const [kecToDesa, setKecToDesa] = useState(new Map());       // kecamatan -> Set<desa>

  // Filter
  const [selectedJenjang, setSelectedJenjang] = useState("Semua Jenjang");
  const [selectedKecamatan, setSelectedKecamatan] = useState("Semua Kecamatan");
  const [selectedDesa, setSelectedDesa] = useState("Semua Desa");

  // Load master geojson + data sekolah
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // 1) Master: kecamatan & desa (pakai httpJSON) — WAJIB unwrap .data
        const [kecRes, desaRes] = await Promise.all([
          httpJSON("/data/kecamatan.geojson", { ttl: 60*60*24*30 }),
          httpJSON("/data/desa.geojson",      { ttl: 60*60*24*30 })
        ]);
        const kecGeo  = kecRes?.data || kecRes;
        const desaGeo_ = desaRes?.data || desaRes;

        const masterList = extractKecamatanNames(kecGeo);
        const { desaToKec: d2k, kecToDesa: k2d } = buildDesaKecMasters(desaGeo_);

        if (!alive) return;
        setKecamatanMaster(masterList);
        setDesaToKec(d2k);
        setKecToDesa(k2d);
        setKecamatanGeo(kecGeo);
        setDesaGeo(desaGeo_);

        // 2) Data sekolah (4 jenjang) — unwrap .data
        const [paudRes, sdRes, smpRes, pkbmRes] = await Promise.all([
          httpJSON("/data/paud.json"),
          httpJSON("/data/sd_new.json"),
          httpJSON("/data/smp.json"),
          httpJSON("/data/pkbm.json")
        ]);
        const paud = paudRes?.data || paudRes;
        const sd   = sdRes?.data   || sdRes;
        const smp  = smpRes?.data  || smpRes;
        const pkbm = pkbmRes?.data || pkbmRes;

        // Flatten berkelompok { "Kec. X": [rows...] } → array rows
        const toEntries = (v) => {
          if (Array.isArray(v)) return [["__ARRAY__", v]];
          if (v && typeof v === "object") return Object.entries(v);
          return [];
        };

        const flatten = (raw, jenjang) => {
          const out = [];
          for (const [maybeKey, arr] of toEntries(raw)) {
            const rows = Array.isArray(arr) ? arr : [];
            for (const s of rows) {
              const villageRaw =
                s?.village ?? s?.desa ?? s?.kelurahan ?? (maybeKey !== "__ARRAY__" ? maybeKey : "");
              const kecRaw =
                s?.kecamatan || s?.district || s?.Kecamatan || s?.DISTRICT || "";

              let kecamatan = norm(kecRaw);
              if (!kecamatan && villageRaw) {
                const key = keyify(villageRaw);
                kecamatan = d2k.get(key) || "";
              }

              out.push({
                ...s,
                jenjang,
                npsn: String(s?.npsn || s?.NPSN || "").trim(),
                namaSekolah: s?.namaSekolah || s?.name || "",
                desa: norm(villageRaw),
                kecamatan, // hasil mapping
                lat: Number.isFinite(Number(s?.lat ?? s?.Latitude ?? s?.latitude)) ? Number(s?.lat ?? s?.Latitude ?? s?.latitude) : null,
                lng: Number.isFinite(Number(s?.lng ?? s?.Longitude ?? s?.longitude)) ? Number(s?.lng ?? s?.Longitude ?? s?.longitude) : null,
              });
            }
          }
          return out;
        };

        const all = [
          ...flatten(paud, "PAUD"),
          ...flatten(sd,   "SD"),
          ...flatten(smp,  "SMP"),
          ...flatten(pkbm, "PKBM"),
        ];

        if (!alive) return;
        setSchools(all);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // OPTIONS: Kecamatan (selalu dari master)
  const kecamatanOptions = useMemo(() => {
    const list = Array.from(new Set(kecamatanMaster.map(norm))).sort((a, b) => a.localeCompare(b, "id"));
    return ["Semua Kecamatan", ...list];
  }, [kecamatanMaster]);

  // OPTIONS: Desa mengikuti kecamatan terpilih (dari master)
  const desaOptions = useMemo(() => {
    if (selectedKecamatan === "Semua Kecamatan") return ["Semua Desa"];
    const set = kecToDesa.get(norm(selectedKecamatan)) || new Set();
    const list = Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
    return ["Semua Desa", ...list];
  }, [selectedKecamatan, kecToDesa]);

  // Reset desa kalau kecamatan berubah
  useEffect(() => {
    if (!desaOptions.includes(selectedDesa)) setSelectedDesa("Semua Desa");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKecamatan, desaOptions]);

  // Filter data untuk peta
  const filteredSchools = useMemo(() => {
    let arr = schools;

    if (selectedJenjang !== "Semua Jenjang") {
      arr = arr.filter((s) => String(s?.jenjang).toUpperCase() === selectedJenjang);
    }
    if (selectedKecamatan !== "Semua Kecamatan") {
      arr = arr.filter((s) => norm(s?.kecamatan) === norm(selectedKecamatan));
    }
    if (selectedDesa !== "Semua Desa") {
      arr = arr.filter((s) => norm(s?.desa) === norm(selectedDesa));
    }

    const valid = arr.filter((s) => !!getLatLngSafe(s));
    return uniqueBy(
      valid,
      (s) => s?.npsn || `${s?.namaSekolah}::${s?.desa}::${kecKey(s?.kecamatan)}`
    );
  }, [schools, selectedJenjang, selectedKecamatan, selectedDesa]);

  // Badge angka di peta (jumlah kecamatan tampil) — dari master
  const badgeKecamatanForMap =
    selectedKecamatan === "Semua Kecamatan" ? kecamatanMaster.length : 1;

  const handleReset = useCallback(() => {
    setSelectedJenjang("Semua Jenjang");
    setSelectedKecamatan("Semua Kecamatan");
    setSelectedDesa("Semua Desa");
  }, []);

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.card}>
          <div className={styles.loading}>
            <div className={styles.spinner} /> Memuat peta & data…
          </div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.card}>
          <div className={styles.error}>
            ⚠️ {err}{" "}
            <button className={styles.resetBtn} onClick={() => window.location.reload()}>
              Muat ulang
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <header className={styles.pageHeader}>
        <h1>Peta Sekolah</h1>
        <p className={styles.sub}>
          Opsi <b>Kecamatan</b> & <b>Desa</b> berasal dari <code>kecamatan.geojson</code> dan <code>desa.geojson</code>. Sekolah dipetakan <i>village → district</i>.
        </p>
        <div className={styles.meta}>
          Master kecamatan terbaca: <b>{kecamatanMaster.length}</b> (target 42)
        </div>
      </header>

      <section className={styles.card}>
        <div className={styles.filtersRow}>
          <div className={styles.filterGroup}>
            <label>Jenjang</label>
            <select value={selectedJenjang} onChange={(e) => setSelectedJenjang(e.target.value)}>
              <option>Semua Jenjang</option>
              <option value="PAUD">PAUD</option>
              <option value="SD">SD</option>
              <option value="SMP">SMP</option>
              <option value="PKBM">PKBM</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Kecamatan</label>
            <select
              value={selectedKecamatan}
              onChange={(e) => setSelectedKecamatan(e.target.value)}
            >
              {kecamatanOptions.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Desa/Kelurahan</label>
            <select value={selectedDesa} onChange={(e) => setSelectedDesa(e.target.value)}>
              {desaOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <button className={styles.resetBtn} onClick={handleReset}>Reset</button>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.mapWrap}>
          <SimpleMap
            schools={filteredSchools}
            initialCenter={DEFAULT_CENTER}
            initialZoom={DEFAULT_ZOOM}
            statsOverride={{
              kecamatanCount: badgeKecamatanForMap,
              sekolahCount: filteredSchools.length,
            }}
            // kirim geojson untuk gambar garis putih
            kecamatanGeo={kecamatanGeo}
            desaGeo={desaGeo}
            // kirim juga filter agar layer highlight tepat
            filters={{
              jenjang: selectedJenjang,
              kecamatan: selectedKecamatan,
              desa: selectedDesa,
            }}
          />
        </div>
      </section>
    </div>
  );
}
