// src/components/common/Map/SimpleMap.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import styles from "./SimpleMap.module.css";
import {
  applyFilters,
  buildKecamatanSummaryFromSchools,
  centroidOfPolygon,
  summarizeCondition,
  makeKecamatanNumberIcon,
  shortLevel,
  getLatLng,
  kecKey,
} from "./mapUtils.js";

/** Fallback pusat Garut */
const GARUT_CENTER = [-7.2278, 107.9087];
const GARUT_ZOOM = 11;

function InitialView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: false });
    setTimeout(() => map.invalidateSize(), 0);
  }, [center, zoom, map]);
  return null;
}

const boundaryStyle = { color: "#ef4444", weight: 2, opacity: 0.9, fill: false };
const kecLineStyle = { color: "#ef4444", weight: 1, opacity: 0.6, fill: false };

export default function SimpleMap({
  schools = [],
  initialCenter = GARUT_CENTER,
  initialZoom = GARUT_ZOOM,
  filters = {},
}) {
  const mapRef = useRef(null);

  /* ====== Ambil batas & kecamatan (dengan fallback) ====== */
  const [garutBoundary, setGarutBoundary] = useState(null);
  const [kecFeatures, setKecFeatures] = useState(null);
  const [kecDict, setKecDict] = useState({}); // { KEY: {display, center, bounds} }

  useEffect(() => {
    let alive = true;

    // Boundary (opsi /geo, fallback tidak fatal)
    (async () => {
      try {
        const r = await fetch("/geo/garut-boundary.geojson");
        if (r.ok) {
          const j = await r.json();
          if (alive) setGarutBoundary(j);
        }
      } catch {}
    })();

    // Kecamatan: coba /geo/garut-kecamatan.geojson, fallback /data/kecamatan.geojson
    (async () => {
      let j = null;
      try {
        const r1 = await fetch("/geo/garut-kecamatan.geojson");
        if (r1.ok) j = await r1.json();
      } catch {}
      if (!j) {
        try {
          const r2 = await fetch("/data/kecamatan.geojson");
          if (r2.ok) j = await r2.json();
        } catch {}
      }
      if (alive && j?.features) {
        setKecFeatures(j);
        const dict = {};
        for (const f of j.features) {
          const rawName = f.properties?.namobj || f.properties?.NAMOBJ || f.properties?.name || f.properties?.WADKC || f.properties?.wadkc || "";
          const key = kecKey(rawName);
          const center = centroidOfPolygon(f);
          const bounds = L.geoJSON(f).getBounds();
          dict[key] = { display: rawName || key, center, bounds };
        }
        setKecDict(dict);
      }
    })();

    return () => { alive = false; };
  }, []);

  /* ====== Filter Bar (dropdown + “(Semua …)”) ====== */
  const [uiJenjang, setUiJenjang] = useState(filters?.jenjang || "(Semua Jenjang)");
  const [uiKondisi, setUiKondisi] = useState(filters?.kondisi || "(Semua Kondisi)");
  const [uiKecamatan, setUiKecamatan] = useState(filters?.kecamatan || "(Semua Kecamatan)");
  const [uiDesa, setUiDesa] = useState(filters?.desa || "(Semua Desa)");

  const effectiveFilters = useMemo(() => ({
    jenjang: uiJenjang,
    kondisi: uiKondisi,
    kecamatan: uiKecamatan.startsWith("(Semua") ? "" : uiKecamatan,
    desa: uiDesa.startsWith("(Semua") ? "" : uiDesa,
  }), [uiJenjang, uiKondisi, uiKecamatan, uiDesa]);

  const kecamatanOptions = useMemo(() => {
    const list = Object.values(kecDict).map((o) => o.display);
    return ["(Semua Kecamatan)", ...list.sort()];
  }, [kecDict]);

  const desaOptions = useMemo(() => {
    if (uiKecamatan.startsWith("(Semua")) return ["(Semua Desa)"];
    const kk = kecKey(uiKecamatan);
    const set = new Set();
    for (const s of schools) {
      if (kk && kecKey(s?.kecamatan) !== kk) continue;
      if (s?.desa) set.add(s.desa);
    }
    return ["(Semua Desa)", ...Array.from(set).sort()];
  }, [schools, uiKecamatan]);

  const resetFilters = () => {
    setUiJenjang("(Semua Jenjang)");
    setUiKondisi("(Semua Kondisi)");
    setUiKecamatan("(Semua Kecamatan)");
    setUiDesa("(Semua Desa)");
  };

  /* ====== Data terfilter ====== */
  const filtered = useMemo(() => applyFilters(schools, effectiveFilters), [schools, effectiveFilters]);
  const desaSelected = useMemo(() => !uiDesa.startsWith("(Semua"), [uiDesa]);

  /* ====== Rekap per-kecamatan ====== */
  const kecRekap = useMemo(() => {
    const fromSchool = buildKecamatanSummaryFromSchools(filtered);
    return fromSchool.map((k) => {
      const ref = kecDict[k.kecKey];
      if (!ref?.center) {
        const pts = k.items.map((s) => getLatLng(s)).filter((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]));
        if (pts.length) {
          const lat = pts.reduce((a, c) => a + c[0], 0) / pts.length;
          const lng = pts.reduce((a, c) => a + c[1], 0) / pts.length;
          return { ...k, center: [lat, lng], bounds: null };
        }
        return { ...k, center: null, bounds: null };
      }
      return { ...k, center: ref.center, bounds: ref.bounds, displayName: ref.display || k.displayName };
    }).filter((k) => Array.isArray(k.center));
  }, [filtered, kecDict]);

  /* ====== Sekolah per desa (ikon individual hanya saat 1 desa dipilih) ====== */
  const desaSchools = useMemo(() => {
    if (!desaSelected) return [];
    return filtered.map((s) => ({ s, ll: getLatLng(s) }))
                   .filter(({ ll }) => Array.isArray(ll))
                   .map(({ s, ll }) => ({ ...s, _ll: ll }));
  }, [filtered, desaSelected]);

  /* ====== View ====== */
  const view = useMemo(() => {
    if (desaSelected && desaSchools.length) {
      const lat = desaSchools.reduce((a, it) => a + it._ll[0], 0) / desaSchools.length;
      const lng = desaSchools.reduce((a, it) => a + it._ll[1], 0) / desaSchools.length;
      return { center: [lat, lng], zoom: 13 };
    }
    return { center: initialCenter || GARUT_CENTER, zoom: initialZoom || GARUT_ZOOM };
  }, [desaSelected, desaSchools, initialCenter, initialZoom]);

  return (
    <div className={styles.mapRoot}>
      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.control}>
          <label className={styles.label}>Jenjang</label>
          <select className={styles.select} value={uiJenjang} onChange={(e) => setUiJenjang(e.target.value)}>
            <option>(Semua Jenjang)</option><option>PAUD</option><option>SD</option><option>SMP</option><option>PKBM</option>
          </select>
        </div>
        <div className={styles.control}>
          <label className={styles.label}>Kondisi</label>
          <select className={styles.select} value={uiKondisi} onChange={(e) => setUiKondisi(e.target.value)}>
            <option>(Semua Kondisi)</option><option>Baik</option><option>Rusak Sedang</option><option>Rusak Berat</option><option>Kurang RKB</option>
          </select>
        </div>
        <div className={styles.control}>
          <label className={styles.label}>Kecamatan</label>
          <select className={styles.select} value={uiKecamatan} onChange={(e) => { setUiKecamatan(e.target.value); setUiDesa("(Semua Desa)"); }}>
            {kecamatanOptions.map((name) => (<option key={name}>{name}</option>))}
          </select>
        </div>
        <div className={styles.control}>
          <label className={styles.label}>Desa</label>
          <select className={styles.select} value={uiDesa} disabled={uiKecamatan.startsWith("(Semua")} onChange={(e) => setUiDesa(e.target.value)}>
            {desaOptions.map((d) => (<option key={d}>{d}</option>))}
          </select>
        </div>
        <div className={styles.actions}>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => {}}>Terapkan</button>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={resetFilters}>Reset</button>
        </div>
      </div>

      {/* MAP */}
      <MapContainer whenCreated={(m) => (mapRef.current = m)} className={styles.mapContainer} center={view.center} zoom={view.zoom} scrollWheelZoom>
        <InitialView center={view.center} zoom={view.zoom} />
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />

        {/* Outline Kabupaten Garut jika ada */}
        {garutBoundary && <GeoJSON data={garutBoundary} style={() => boundaryStyle} className={styles.garutBoundary}
          eventHandlers={{ add: () => setTimeout(() => mapRef.current?.invalidateSize(), 0) }} />}

        {/* Kalau boundary tidak ada, tampilkan garis kecamatan sebagai fallback */}
        {!garutBoundary && kecFeatures && <GeoJSON data={kecFeatures} style={() => kecLineStyle} />}

        {/* Mode 1: Rekap kecamatan (angka) */}
        {!desaSelected && kecRekap.map((kec) => {
          const sizeClass = kec.total >= 120 ? "kecNumLarge" : kec.total >= 60 ? "kecNumMedium" : "kecNumSmall";
          const icon = makeKecamatanNumberIcon(kec.total, sizeClass, styles);
          const kondisiSum = summarizeCondition(kec.items);
          return (
            <Marker key={kec.kecKey} position={kec.center} icon={icon}>
              <Popup>
                <div style={{ minWidth: 260 }}>
                  <div style={{ fontWeight: 900, fontSize: 14 }}>{kec.displayName}</div>
                  <div className={styles.popupSectionTitle}>Ringkasan Jenjang</div>
                  <table className={styles.popupTable}>
                    <thead><tr><th>Jenjang</th><th>Jumlah</th></tr></thead>
                    <tbody>
                      {["PAUD","SD","SMP","PKBM"].map((lvl) => (<tr key={lvl}><td>{lvl}</td><td>{kec.counts?.[lvl] ?? 0}</td></tr>))}
                      <tr><td><b>Total</b></td><td><b>{kec.total}</b></td></tr>
                    </tbody>
                  </table>
                  <div className={styles.popupSectionTitle}>Kondisi Bangunan</div>
                  <table className={styles.popupTable}>
                    <tbody>
                      {["Baik","Rusak Sedang","Rusak Berat","Kurang RKB"].map((k) => (<tr key={k}><td>{k}</td><td>{kondisiSum[k] ?? 0}</td></tr>))}
                    </tbody>
                  </table>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Mode 2: Detail sekolah (saat satu desa dipilih) */}
        {desaSelected && desaSchools.map((s, idx) => (
          <Marker key={`${s?.id || s?.npsn || idx}`} position={s._ll}>
            <Popup>
              <div style={{ minWidth: 220 }}>
                <strong>{s?.nama || s?.name || "Sekolah"}</strong>
                <div>Kecamatan: {s?.kecamatan || "-"}</div>
                <div>Desa: {s?.desa || s?.village || "-"}</div>
                <div>Jenjang: {shortLevel(s?.jenjang)}</div>
                <div>Kondisi: {s?.computed_condition || s?.kondisi || "-"}</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
