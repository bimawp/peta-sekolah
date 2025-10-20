// src/components/common/Map/SimpleMap.jsx
import React from "react"; // <--- WAJIB ADA
import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import styles from "./SimpleMap.module.css";
import {
  applyFilters,
  makeKecamatanNumberIcon,
  getLatLngSafe,
  shortLevel,
  kecKey,
  uniqueBy,
  GARUT_BOUNDS
} from "./mapUtils";

const GARUT_CENTER = [-7.214, 107.903]; // [lat, lng]
const GARUT_ZOOM = 10;

export default function SimpleMap({
  schools = [],
  initialCenter = GARUT_CENTER,
  initialZoom = GARUT_ZOOM,
  filters = {},           // { jenjang, kecamatan, desa, kondisi }
  statsOverride,          // { kecamatanCount, sekolahCount } utk header
}) {
  const mapRef = useRef(null);
  const fitTimer = useRef(null);

  // de-dupe extra guard (by NPSN → fallback) — handle null/undefined lebih ketat
  const schoolsUnique = useMemo(() =>
    uniqueBy(schools, (s) => {
      if (!s) return null;
      const npsn = (s?.npsn || s?.NPSN || "").toString().trim();
      if (npsn && npsn !== "undefined" && npsn !== "null") return `NPSN:${npsn}`;
      const name = (s?.namaSekolah || s?.name || "").toString().trim().toUpperCase();
      const desa = (s?.desa || s?.village || "").toString().trim().toUpperCase();
      const kec  = kecKey(s?.kecamatan || "");
      return `${name}::${desa}::${kec}`;
    }), [schools]
  );

  // terapkan filter (sekaligus menolak koordinat di luar Garut)
  const filtered = useMemo(() => {
    const result = applyFilters(schoolsUnique, filters);
    console.log(`[SimpleMap] schoolsUnique: ${schoolsUnique.length}, filtered: ${result.length}, difference: ${schoolsUnique.length - result.length}`);
    return result;
  }, [schoolsUnique, filters]);

  // rekap sederhana per kecamatan (buat titik angka) — pakai koordinat AMAN
  const kecRekap = useMemo(() => {
    const group = new Map();
    for (const s of filtered) {
      const kk = kecKey(s?.kecamatan);
      if (!group.has(kk)) group.set(kk, { k: kk, total: 0, any: null, coords: [] });
      const g = group.get(kk);
      g.total += 1;
      g.any = g.any || s;

      const ll = getLatLngSafe(s);
      if (ll) g.coords.push(ll); // [lat,lng] valid dalam Garut
    }

    return Array.from(group.values()).map((g) => {
      // pusat = centroid rata-rata koordinat valid; kalau tak ada, fallback center Garut
      let center = GARUT_CENTER;
      if (g.coords.length) {
        const [sumLat, sumLng] = g.coords.reduce(
          (acc, cur) => [acc[0] + cur[0], acc[1] + cur[1]],
          [0, 0]
        );
        center = [sumLat / g.coords.length, sumLng / g.coords.length];
      }
      return {
        kecKey: g.k,
        total: g.total,
        center,
        displayName: g.any?.kecamatan || g.k,
      };
    });
  }, [filtered]);

  const badgeKecamatan = statsOverride?.kecamatanCount ?? kecRekap.length;
  const badgeSekolah   = statsOverride?.sekolahCount   ?? filtered.length;

  // auto-fit (debounced) pakai titik rekap yang valid
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const doFit = () => {
      const pts = kecRekap.map(k => k.center).filter(Boolean);

      if (!pts.length) {
        map.setView(L.latLng(GARUT_CENTER[0], GARUT_CENTER[1]), initialZoom, { animate: true });
        return;
      }
      if (pts.length === 1) {
        map.setView(L.latLng(pts[0][0], pts[0][1]), Math.max(initialZoom, 12), { animate: true });
        return;
      }
      const bounds = L.latLngBounds(pts.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds.pad(0.15), { animate: true });
    };

    clearTimeout(fitTimer.current);
    fitTimer.current = setTimeout(doFit, 180); // debounce 180ms
    return () => clearTimeout(fitTimer.current);
  }, [kecRekap, initialZoom]);

  return (
    <div className={styles.mapRoot}>
      {/* Header mini + badge angka */}
      <div className={styles.filterBar}>
        <div className={styles.countBadge}>
          {badgeKecamatan} kecamatan • {badgeSekolah} sekolah
        </div>
      </div>

      <MapContainer
        ref={mapRef}
        center={GARUT_CENTER}
        zoom={initialZoom}
        className={styles.map}
        whenCreated={(m) => (mapRef.current = m)}
        // Flag performa aman (tanpa ubah UX)
        preferCanvas
        updateWhenZooming={false}
        updateWhenIdle
        keepBuffer={2}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          detectRetina
        />

        {/* Titik agregat per kecamatan (angka bulat) */}
        {kecRekap.map((kec) => {
          const icon = makeKecamatanNumberIcon(kec.total, "", styles);
          return (
            <Marker key={kec.kecKey} position={kec.center} icon={icon}>
              <Popup>
                <div className={styles.popup}>
                  <div className={styles.popupTitle}>{kec.displayName}</div>
                  <div className={styles.popupCounts}>{kec.total} sekolah</div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* (opsional) titik sekolah individual — aktifkan jika diperlukan */}
        {/*
        {filtered.map((s, i) => {
          const ll = getLatLngSafe(s);
          if (!ll) return null;
          return (
            <Marker key={s.id || s.npsn || i} position={ll}>
              <Popup>
                <div style={{ minWidth: 220 }}>
                  <strong>{s.namaSekolah || s.name || "Sekolah"}</strong>
                  <div>Jenjang: {shortLevel(s.jenjang)}</div>
                  <div>Kecamatan: {s.kecamatan || "-"}</div>
                  <div>Desa: {s.desa || s.village || "-"}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}
        */}
      </MapContainer>
    </div>
  );
}