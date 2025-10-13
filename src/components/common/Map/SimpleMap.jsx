// src/components/common/Map/SimpleMap.jsx
import React from "react"; // <--- TAMBAHKAN BARIS INI
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import styles from "./SimpleMap.module.css";
import {
  applyFilters,
  makeKecamatanNumberIcon,
  getLatLng,
  shortLevel,
  kecKey,
  uniqueBy,
} from "./mapUtils";

const GARUT_CENTER = [-7.214, 107.903];
const GARUT_ZOOM = 10;

export default function SimpleMap({
  schools = [],
  initialCenter = GARUT_CENTER,
  initialZoom = GARUT_ZOOM,
  filters = {},           // { jenjang, kecamatan, desa, kondisi }
  statsOverride,          // { kecamatanCount, sekolahCount } utk header
}) {
  const mapRef = useRef(null);

  // de-dupe extra guard (by NPSN → fallback)
  const schoolsUnique = useMemo(() => uniqueBy(schools, (s) => {
    const npsn = (s?.npsn || s?.NPSN || "").toString().trim();
    if (npsn) return `NPSN:${npsn}`;
    const name = (s?.namaSekolah || s?.name || "").toString().trim().toUpperCase();
    const desa = (s?.desa || s?.village || "").toString().trim().toUpperCase();
    const kec  = kecKey(s?.kecamatan || "");
    return `${name}::${desa}::${kec}`;
  }), [schools]);

  const filtered = useMemo(() => applyFilters(schoolsUnique, filters), [schoolsUnique, filters]);

  // rekap sederhana per kecamatan (buat titik angka)
  const kecRekap = useMemo(() => {
    const group = new Map();
    for (const s of filtered) {
      const kk = kecKey(s?.kecamatan);
      if (!group.has(kk)) group.set(kk, { k: kk, total: 0, any: null });
      const g = group.get(kk);
      g.total += 1;
      g.any = g.any || s;
    }
    return Array.from(group.values()).map((g) => {
      const ll = getLatLng(g.any);
      return {
        kecKey: g.k,
        total: g.total,
        center: ll || GARUT_CENTER,
        displayName: g.any?.kecamatan || g.k,
      };
    });
  }, [filtered]);

  const badgeKecamatan = statsOverride?.kecamatanCount ?? kecRekap.length;
  const badgeSekolah = statsOverride?.sekolahCount ?? filtered.length;

  return (
    <div className={styles.mapRoot}>
      {/* Header mini + badge angka */}
      <div className={styles.filterBar}>
        <div className={styles.countBadge}>
          {badgeKecamatan} kecamatan • {badgeSekolah} sekolah
        </div>
      </div>

      <MapContainer ref={mapRef} center={initialCenter} zoom={initialZoom} className={styles.map}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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

        {/* (opsional) titik sekolah individual — aktifkan jika perlu
        {filtered.map((s, i) => {
          const ll = getLatLng(s); if (!ll) return null;
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
