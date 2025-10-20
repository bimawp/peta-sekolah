// src/components/map/MapWithFilters.jsx
import React, { useMemo, useState } from "react";
import InlineMapFilters, { filterMarkers } from "./InlineMapFilters";
import SimpleMap from "../common/Map/SimpleMap"; // sesuaikan path jika beda

export default function MapWithFilters({
  schools,        // array data sekolah yang saat ini kamu kirim ke SimpleMap
  geoData,
  initialCenter,
  initialZoom,
}) {
  const [mapFilters, setMapFilters] = useState({
    kecamatan: "Semua Kecamatan",
    desa: "Semua Desa",
    jenjang: "Semua Jenjang",
    kondisi: "Semua Kondisi",
  });

  const filtered = useMemo(
    () => filterMarkers(Array.isArray(schools) ? schools : [], mapFilters),
    [schools, mapFilters]
  );

  return (
    <div style={{ position: "relative" }}>
      <InlineMapFilters
        data={schools}
        value={mapFilters}
        onChange={(patch) => setMapFilters((prev) => ({ ...prev, ...patch }))}
      />
      <SimpleMap
        schools={filtered}
        geoData={geoData}
        initialCenter={initialCenter}
        initialZoom={initialZoom}
      />
    </div>
  );
}
