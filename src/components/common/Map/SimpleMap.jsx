import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import styles from "./SimpleMap.module.css";
import {
  applyFilters,
  makeKecamatanNumberIcon,
  getLatLngSafe,
  kecKey,
  uniqueBy,
  GARUT_LEAFLET_BOUNDS,
} from "./mapUtils";

const GARUT_CENTER = [-7.214, 107.903];
const GARUT_ZOOM = 10;
const SCHOOL_MARKER_ZOOM = 12;

function colorForKey(key) {
  const palette = [
    "#1e40af","#7c3aed","#d946ef","#f59e0b","#10b981","#06b6d4",
    "#3b82f6","#ec4899","#f97316","#0ea5e9","#eab308","#ef4444",
    "#14b8a6","#a855f7","#8b5cf6","#f43f5e","#06b6d4","#84cc16",
    "#6366f1","#fb923c","#ec4899","#10b981","#f97316","#3b82f6"
  ];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}
const colorForJenjang = (j) => {
  const s = (j || "").toString().toUpperCase();
  if (s.includes("PAUD")) return "#f59e0b";
  if (s === "SD")        return "#3b82f6";
  if (s === "SMP")       return "#10b981";
  if (s.includes("PKBM"))return "#ef4444";
  return "#6366f1";
};

// HELPER BARU: Untuk menentukan kondisi prioritas sekolah
// Fungsi ini akan mencari data kondisi dari berbagai format yang mungkin ada di data 'schools'
const getSchoolCondition = (s) => {
  // 1. Cek dari data yang sudah diproses (jika ada, misal: dari SchoolDetailPage)
  const ccProcessed = s?.kondisiKelas;
  if (ccProcessed) {
    if (Number(ccProcessed.rusakBerat || 0) > 0) return 'berat';
    if (Number(ccProcessed.rusakSedang || 0) > 0) return 'sedang';
    if (Number(s?.kurangRKB || 0) > 0) return 'rkb'; // kurangRKB sering di top-level
    if (Number(ccProcessed.baik || 0) > 0) return 'baik';
  }
  
  // 2. Fallback: Cek dari data mentah (jika 'kondisiKelas' tidak ada)
  const ccRaw = s?.class_condition;
  if (ccRaw) {
    const berat_raw = parseInt(ccRaw.classrooms_heavy_damage || ccRaw.heavy_damage) || 0;
    if (berat_raw > 0) return 'berat';
    const sedang_raw = parseInt(ccRaw.classrooms_moderate_damage || ccRaw.moderate_damage) || 0;
    if (sedang_raw > 0) return 'sedang';
    const rkb_raw = parseInt(ccRaw.lacking_rkb) || 0;
    if (rkb_raw > 0) return 'rkb';
    const baik_raw = parseInt(ccRaw.classrooms_good || ccRaw.good) || 0;
    if (baik_raw > 0) return 'baik';
  }
  
  // 3. Default jika tidak ada data kondisi
  return 'baik'; // Asumsikan baik jika tidak ada data kerusakan/RKB
};


export default function SimpleMap({
  schools = [],
  initialCenter = GARUT_CENTER,
  initialZoom = GARUT_ZOOM,
  filters = {},
  statsOverride,
  kecamatanGeo,
  desaGeo,
  onZoomChange, // [NEW] opsional: callback(z) → Map.jsx bisa tau kapan z >= 12
}) {
  const mapRef = useRef(null);
  const fitTimer = useRef(null);

  const kabLayerRef = useRef(null);
  const kecLayerRef = useRef(null);
  const labelLayerRef = useRef(null);
  const schoolLayerRef = useRef(null);

  const [zoom, setZoom] = useState(initialZoom);
  const showSchoolDots = zoom >= SCHOOL_MARKER_ZOOM;

  const schoolsUnique = useMemo(
    () =>
      uniqueBy(schools, (s) => {
        if (!s) return null;
        const npsn = (s?.npsn || s?.NPSN || "").toString().trim();
        if (npsn && npsn !== "undefined" && npsn !== "null") return "NPSN:" + npsn;
        const name = (s?.namaSekolah || s?.name || "").toString().trim().toUpperCase();
        const desa = (s?.desa || s?.village || "").toString().trim().toUpperCase();
        const kk  = kecKey(s?.kecamatan || "");
        return name + "::" + desa + "::" + kk;
      }),
    [schools]
  );

  const filtered = useMemo(() => applyFilters(schoolsUnique, filters), [schoolsUnique, filters]);

  // MODIFIKASI: `kecRekap` kini juga menghitung rincian kondisi
  const kecRekap = useMemo(() => {
    const group = new Map();
    for (const s of filtered) {
      const kk = kecKey(s?.kecamatan);
      if (!kk) continue;

      // Inisialisasi grup jika belum ada
      if (!group.has(kk)) {
        group.set(kk, { 
          k: kk, 
          displayName: s?.kecamatan || kk, 
          total: 0, 
          coords: [],
          rusakBerat: 0,
          rusakSedang: 0,
          kurangRKB: 0,
          baik: 0
        });
      }
      
      const g = group.get(kk);
      g.total += 1;
      
      const ll = getLatLngSafe(s);
      if (ll) g.coords.push(ll);
      
      // Tambahkan perhitungan kondisi menggunakan helper baru
      const condition = getSchoolCondition(s);
      if (condition === 'berat') g.rusakBerat += 1;
      else if (condition === 'sedang') g.rusakSedang += 1;
      else if (condition === 'rkb') g.kurangRKB += 1;
      else g.baik += 1;
    }
    
    return Array.from(group.values()).map((g) => {
      let center = [-7.214, 107.903];
      if (g.coords.length) {
        const sum = g.coords.reduce((acc, cur) => [acc[0] + cur[0], acc[1] + cur[1]], [0, 0]);
        center = [sum[0] / g.coords.length, sum[1] / g.coords.length];
      }
      // Kembalikan data yang sudah di-group, termasuk rincian kondisi
      return { 
        kecKey: g.k, 
        displayName: g.displayName, 
        total: g.total, 
        center,
        rusakBerat: g.rusakBerat,
        rusakSedang: g.rusakSedang,
        kurangRKB: g.kurangRKB,
        baik: g.baik
      };
    });
  }, [filtered]); // `filtered` sudah benar sebagai dependensi

  const badgeKecamatan =
    statsOverride?.kecamatanCount != null ? statsOverride.kecamatanCount : kecRekap.length;
  const badgeSekolah =
    statsOverride?.sekolahCount != null ? statsOverride.sekolahCount : filtered.length;

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!kabLayerRef.current) kabLayerRef.current = L.layerGroup().addTo(map);
    else kabLayerRef.current.clearLayers();
    if (!kecLayerRef.current) kecLayerRef.current = L.layerGroup().addTo(map);
    else kecLayerRef.current.clearLayers();
    if (!labelLayerRef.current) labelLayerRef.current = L.layerGroup().addTo(map);
    else labelLayerRef.current.clearLayers();

    const drawKecamatanFromLocal = (geo) => {
      try {
        const feats = Array.isArray(geo?.features) ? geo.features : [];
        for (const f of feats) {
          const p = f?.properties || {};
          const rawName =
            p.name || p.Name || p.kecamatan || p.Kecamatan || p.NAMKEC || p.NAMKec || p.NAMOBJ || "";
          const kk = kecKey(rawName);
          const gj = L.geoJSON(f, {
            style: {
              fillColor: colorForKey(kk),
              fillOpacity: 0.85,
              color: "#ffffff",
              weight: 2.5,
              opacity: 0.9,
            },
            interactive: false,
          });
          gj.addTo(kecLayerRef.current);
          const c = gj.getBounds().getCenter();
          L.marker(c, {
            interactive: false,
            icon: L.divIcon({ className: styles.kecLabel, html: `<div>${rawName}</div>` }),
            zIndexOffset: 800,
          }).addTo(labelLayerRef.current);
        }
      } catch {}
    };

    if (kecamatanGeo && Array.isArray(kecamatanGeo?.features)) {
      drawKecamatanFromLocal(kecamatanGeo);
      return () => {
        kabLayerRef.current?.clearLayers();
        kecLayerRef.current?.clearLayers();
        labelLayerRef.current?.clearLayers();
      };
    }
  }, [kecamatanGeo]);

  // Titik sekolah (canvas) pada zoom tinggi — (kode sama seperti versi sebelumnya)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!schoolLayerRef.current) {
      schoolLayerRef.current = L.layerGroup(undefined, { pane: "overlayPane" }).addTo(map);
    } else {
      schoolLayerRef.current.clearLayers();
    }
    if (!showSchoolDots) return;

    const pts = [];
    for (const s of filtered) {
      const ll = getLatLngSafe(s);
      if (!ll) continue;
      pts.push({ ll, j: s?.jenjang, name: s?.namaSekolah || s?.name || "", k: s?.kecamatan || "" });
    }
    for (const p of pts) {
      const c = L.circleMarker(p.ll, {
        radius: 4.5,
        fillColor: colorForJenjang(p.j),
        color: "#ffffff",
        weight: 0.7,
        fillOpacity: 0.95,
        pane: "overlayPane",
      });
      c.addTo(schoolLayerRef.current);
      c.bindPopup(
        `<div class="${styles.popup}">
           <div class="${styles.popupTitle}">${p.name}</div>
           <div class="${styles.popupCounts}">${p.k}</div>
         </div>`
      );
    }
    return () => schoolLayerRef.current?.clearLayers();
  }, [filtered, showSchoolDots]);

  // [NEW] expose perubahan zoom ke parent
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handleZoom = () => {
      const z = map.getZoom();
      setZoom(z);
      if (typeof onZoomChange === "function") onZoomChange(z);
    };
    map.on("zoomend", handleZoom);
    // sync awal
    const z0 = map.getZoom();
    setZoom(z0);
    if (typeof onZoomChange === "function") onZoomChange(z0);
    return () => map.off("zoomend", handleZoom);
  }, [onZoomChange]);

  // Style untuk baris breakdown di popup
  const popupRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    borderBottom: '1px solid #eee',
    padding: '3px 0',
  };

  return (
    <div className={styles.mapRoot}>
      <div className={styles.filterBar}>
        <div className={styles.countBadge}>
          {statsOverride?.kecamatanCount ?? kecRekap.length} kecamatan • {statsOverride?.sekolahCount ?? filtered.length} sekolah
        </div>
      </div>

      <MapContainer
        ref={mapRef}
        // KEMBALIKAN center dan zoom untuk tampilan awal
        center={initialCenter}
        zoom={initialZoom}
        className={styles.map}
        // HAPUS prop bounds, kita akan gunakan whenCreated
        // bounds={GARUT_LEAFLET_BOUNDS}
        whenCreated={(m) => { 
          mapRef.current = m; 
          // PERBAIKAN: Paksa peta fokus ke Garut saat pertama kali dibuat
          if (GARUT_LEAFLET_BOUNDS) {
            m.fitBounds(GARUT_LEAFLET_BOUNDS, { padding: [10, 10] });
          }
        }}
        preferCanvas
        inertia={false}
        updateWhenZooming={false}
        updateWhenIdle
        keepBuffer={2}
        scrollWheelZoom={false}
        zoomControl={false}
        maxBounds={GARUT_LEAFLET_BOUNDS} // maxBounds tetap ada, bagus untuk "mengunci"
        maxBoundsViscosity={0.95}
        attributionControl={false}
      >
        {/* PERBAIKAN: Pindahkan tombol zoom ke 'topright' */}
        <ZoomControl position="topright" />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" detectRetina />
        {!showSchoolDots && kecRekap.map((kec) => {
          const icon = makeKecamatanNumberIcon(kec.total, "", styles);
          // Tambahkan 'total' untuk menghindari pembagian dengan nol
          const total = kec.total || 1; 
          return (
            <Marker key={kec.kecKey} position={kec.center} icon={icon}>
              <Popup>
                {/* MODIFIKASI: Tampilan Popup Baru */}
                <div className={styles.popup}>
                  <div className={styles.popupTitle}>{kec.displayName}</div>
                  <div className={styles.popupCounts}>
                    <strong>Total: {kec.total} sekolah</strong>
                  </div>
                  
                  {/* Rincian Kondisi */}
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#333' }}>
                    
                    {/* Rusak Berat */}
                    <div style={popupRowStyle}>
                      <span style={{ color: '#DC2626' }}>Rusak Berat:</span>
                      <strong style={{ color: '#DC2626' }}>
                        {kec.rusakBerat} 
                        <span style={{ color: '#666', fontWeight: 'normal' }}> ({((kec.rusakBerat / total) * 100).toFixed(0)}%)</span>
                      </strong>
                    </div>

                    {/* Rusak Sedang */}
                    <div style={popupRowStyle}>
                      <span style={{ color: '#F59E0B' }}>Rusak Sedang:</span>
                      <strong style={{ color: '#F59E0B' }}>
                        {kec.rusakSedang}
                        <span style={{ color: '#666', fontWeight: 'normal' }}> ({((kec.rusakSedang / total) * 100).toFixed(0)}%)</span>
                      </strong>
                    </div>
                    
                    {/* Kurang RKB */}
                    <div style={popupRowStyle}>
                      <span style={{ color: '#0EA5E9' }}>Kurang RKB:</span>
                      <strong style={{ color: '#0EA5E9' }}>
                        {kec.kurangRKB}
                        <span style={{ color: '#666', fontWeight: 'normal' }}> ({((kec.kurangRKB / total) * 100).toFixed(0)}%)</span>
                      </strong>
                    </div>
                    
                    {/* Baik */}
                    <div style={{ ...popupRowStyle, borderBottom: 'none' }}>
                      <span style={{ color: '#1E7F4F' }}>Baik:</span>
                      <strong style={{ color: '#1E7F4F' }}>
                        {kec.baik}
                        <span style={{ color: '#666', fontWeight: 'normal' }}> ({((kec.baik / total) * 100).toFixed(0)}%)</span>
                      </strong>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}