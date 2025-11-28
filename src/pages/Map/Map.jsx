// src/pages/Map/Map.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import SimpleMap from "@/components/common/Map/SimpleMap.jsx";
import styles from "./Map.module.css";
import { kecKey, getLatLngSafe, uniqueBy } from "@/components/common/Map/mapUtils";
import { httpJSON } from "@/utils/http";
import { onIdle } from "@/services/utils/idle";
import { useWorkerJSON } from "@/services/utils/useWorkerJSON";

const DEFAULT_CENTER = [-7.214, 107.903];
const DEFAULT_ZOOM = 11;

const norm = (x) =>
  String(x ?? "")
    .normalize("NFKD")
    .replace(/\s+/g, " ")
    .trim();

const keyify = (x) => norm(x).toUpperCase().replace(/[^A-Z0-9]/g, "");

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

// ===== helper untuk flatten detail jenjang (array atau object terkelompok) =====
const toEntries = (v) => {
  if (Array.isArray(v)) return [["__ARRAY__", v]];
  if (v && typeof v === "object") return Object.entries(v);
  return [];
};
function flattenJenjang(raw, jenjang, d2k) {
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
        kecamatan = d2k?.get(key) || "";
      }

      out.push({
        ...s,
        jenjang,
        npsn: String(s?.npsn || s?.NPSN || "").trim(),
        namaSekolah: s?.namaSekolah || s?.name || "",
        desa: norm(villageRaw),
        kecamatan,
        lat: Number.isFinite(Number(s?.lat ?? s?.Latitude ?? s?.latitude)) ? Number(s?.lat ?? s?.Latitude ?? s?.latitude) : null,
        lng: Number.isFinite(Number(s?.lng ?? s?.Longitude ?? s?.longitude)) ? Number(s?.lng ?? s?.Longitude ?? s?.longitude) : null,
      });
    }
  }
  return out;
}

export default function MapPage() {
  // Ringkasan (awal cepat)
  const [summarySchools, setSummarySchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // GeoJSON via worker
  const { loading: kecLoading, data: kecamatanGeo, error: kecErr } =
    useWorkerJSON({ url: "/data/kecamatan.geojson" });
  const { loading: desaLoading, data: desaGeo, error: desaErr } =
    useWorkerJSON({ url: "/data/desa.geojson" });

  // Master dari geojson
  const [kecamatanMaster, setKecamatanMaster] = useState([]);
  const [desaToKec, setDesaToKec] = useState(new Map());
  const [kecToDesa, setKecToDesa] = useState(new Map());

  // Filter
  const [selectedJenjang, setSelectedJenjang] = useState("Semua Jenjang");
  const [selectedKecamatan, setSelectedKecamatan] = useState("Semua Kecamatan");
  const [selectedDesa, setSelectedDesa] = useState("Semua Desa");

  // Zoom state (dari SimpleMap)
  const [isZoomHigh, setIsZoomHigh] = useState(false);

  // Detail per-jenjang on-demand
  const [detailPAUD, setDetailPAUD] = useState(null);
  const [detailSD,   setDetailSD]   = useState(null);
  const [detailSMP,  setDetailSMP]  = useState(null);
  const [detailPKBM, setDetailPKBM] = useState(null);

  // Load ringkasan
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await httpJSON("/data/merged/schools.json", { ttl: 60 * 60 * 24 * 14 });
        const data = res?.data || res;
        if (!alive) return;
        const out = Array.isArray(data) ? data.map((s) => ({
          ...s,
          npsn: String(s?.npsn || s?.NPSN || "").trim(),
          namaSekolah: s?.namaSekolah || s?.name || "",
          kecamatan: norm(s?.kecamatan || s?.district || s?.Kecamatan || ""),
          desa: norm(s?.desa || s?.village || s?.kelurahan || ""),
          lat: Number.isFinite(Number(s?.lat ?? s?.latitude)) ? Number(s?.lat ?? s?.latitude) : null,
          lng: Number.isFinite(Number(s?.lng ?? s?.longitude)) ? Number(s?.lng ?? s?.longitude) : null,
          jenjang: String(s?.jenjang || s?.level || "").toUpperCase() || "LAINNYA",
        })) : [];
        setSummarySchools(out);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Master dari geojson
  useEffect(() => {
    if (!kecamatanGeo || !desaGeo) return;
    const masterList = extractKecamatanNames(kecamatanGeo);
    const { desaToKec: d2k, kecToDesa: k2d } = buildDesaKecMasters(desaGeo);
    setKecamatanMaster(masterList);
    setDesaToKec(d2k);
    setKecToDesa(k2d);
  }, [kecamatanGeo, desaGeo]);

  // Idle prefetch file besar
  useEffect(() => {
    onIdle(() => {
      httpJSON("/data/kecamatan.geojson", { ttl: 60 * 60 * 24 * 30, timeout: 0 }).catch(() => {});
      httpJSON("/data/desa.geojson",      { ttl: 60 * 60 * 24 * 30, timeout: 0 }).catch(() => {});
    });
  }, []);

  // Kapan perlu detail? jika zoom tinggi ATAU jenjang spesifik
  const needDetailPAUD = isZoomHigh || selectedJenjang === "PAUD";
  const needDetailSD   = isZoomHigh || selectedJenjang === "SD";
  const needDetailSMP  = isZoomHigh || selectedJenjang === "SMP";
  const needDetailPKBM = isZoomHigh || selectedJenjang === "PKBM";

  // Fetch detail on-demand (sekali, cache via httpJSON TTL)
  useEffect(() => { if (!needDetailPAUD || detailPAUD || !desaToKec) return;
    (async () => { const r = await httpJSON("/data/paud.json"); const v = r?.data || r;
      setDetailPAUD(flattenJenjang(v, "PAUD", desaToKec)); })().catch(()=>{});
  }, [needDetailPAUD, detailPAUD, desaToKec]);

  useEffect(() => { if (!needDetailSD || detailSD || !desaToKec) return;
    (async () => { const r = await httpJSON("/data/sd_new.json"); const v = r?.data || r;
      setDetailSD(flattenJenjang(v, "SD", desaToKec)); })().catch(()=>{});
  }, [needDetailSD, detailSD, desaToKec]);

  useEffect(() => { if (!needDetailSMP || detailSMP || !desaToKec) return;
    (async () => { const r = await httpJSON("/data/smp.json"); const v = r?.data || r;
      setDetailSMP(flattenJenjang(v, "SMP", desaToKec)); })().catch(()=>{});
  }, [needDetailSMP, detailSMP, desaToKec]);

  useEffect(() => { if (!needDetailPKBM || detailPKBM || !desaToKec) return;
    (async () => { const r = await httpJSON("/data/pkbm.json"); const v = r?.data || r;
      setDetailPKBM(flattenJenjang(v, "PKBM", desaToKec)); })().catch(()=>{});
  }, [needDetailPKBM, detailPKBM, desaToKec]);

  // Compose data efektif: summary + (replace jenjang dengan detail jika tersedia & diperlukan)
  const effectiveSchools = useMemo(() => {
    let base = summarySchools;
    const replace = (jenjang, detail) => {
      if (!detail) return;
      // buang yang jenjang itu dari ringkasan, lalu gabung detail
      base = base.filter((s) => String(s?.jenjang).toUpperCase() !== jenjang).concat(detail);
    };
    if (needDetailPAUD && detailPAUD) replace("PAUD", detailPAUD);
    if (needDetailSD   && detailSD)   replace("SD",   detailSD);
    if (needDetailSMP  && detailSMP)  replace("SMP",  detailSMP);
    if (needDetailPKBM && detailPKBM) replace("PKBM", detailPKBM);

    // dedup by NPSN (atau fallback key)
    return uniqueBy(base, (s) => s?.npsn || `${s?.namaSekolah}::${s?.desa}::${kecKey(s?.kecamatan)}`);
  }, [
    summarySchools,
    needDetailPAUD, needDetailSD, needDetailSMP, needDetailPKBM,
    detailPAUD, detailSD, detailSMP, detailPKBM
  ]);

  // Filter untuk peta dari effectiveSchools
  const filteredSchools = useMemo(() => {
    let arr = effectiveSchools;
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
    return uniqueBy(valid, (s) => s?.npsn || `${s?.namaSekolah}::${s?.desa}::${kecKey(s?.kecamatan)}`);
  }, [effectiveSchools, selectedJenjang, selectedKecamatan, selectedDesa]);

  const kecamatanOptions = useMemo(() => {
    const list = Array.from(new Set(kecamatanMaster.map(norm))).sort((a, b) => a.localeCompare(b, "id"));
    return ["Semua Kecamatan", ...list];
  }, [kecamatanMaster]);

  const desaOptions = useMemo(() => {
    if (selectedKecamatan === "Semua Kecamatan") return ["Semua Desa"];
    const set = kecToDesa.get(norm(selectedKecamatan)) || new Set();
    const list = Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
    return ["Semua Desa", ...list];
  }, [selectedKecamatan, kecToDesa]);

  useEffect(() => {
    if (!desaOptions.includes(selectedDesa)) setSelectedDesa("Semua Desa");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKecamatan, desaOptions]);

  const handleReset = useCallback(() => {
    setSelectedJenjang("Semua Jenjang");
    setSelectedKecamatan("Semua Kecamatan");
    setSelectedDesa("Semua Desa");
  }, []);

  const geoError = kecErr || desaErr;

  if (loading || kecLoading || desaLoading) {
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

  if (err || geoError) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.card}>
          <div className={styles.error}>
            ⚠️ {(err || geoError)}{" "}
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
          Tampilan awal cepat (ringkasan). Saat zoom masuk / pilih jenjang, data detail per-jenjang dimuat otomatis.
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
            <select value={selectedKecamatan} onChange={(e) => setSelectedKecamatan(e.target.value)}>
              {kecamatanOptions.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Desa/Kelurahan</label>
            <select value={selectedDesa} onChange={(e) => setSelectedDesa(e.target.value)}>
              {desaOptions.map((d) => <option key={d} value={d}>{d}</option>)}
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
              kecamatanCount: selectedKecamatan === "Semua Kecamatan" ? kecamatanMaster.length : 1,
              sekolahCount: filteredSchools.length,
            }}
            kecamatanGeo={kecamatanGeo}
            desaGeo={desaGeo}
            filters={{ jenjang: selectedJenjang, kecamatan: selectedKecamatan, desa: selectedDesa }}
            onZoomChange={(z) => setIsZoomHigh(z >= 12)} // [NEW]
          />
        </div>
      </section>
    </div>
  );
}
