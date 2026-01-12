// src/pages/Map/MapController.jsx
import React, { useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import styles from "./Popups.module.css";

const createCustomIcon = (jenjang) => {
  let iconUrl = "/assets/marker-icon.png";
  const j = (jenjang || "").toString().toUpperCase();
  if (j === "SD") iconUrl = "/assets/marker-icon-sd.png";
  if (j === "SMP") iconUrl = "/assets/marker-icon-smp.png";

  return new L.Icon({
    iconUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: "/assets/marker-shadow.png",
    shadowSize: [41, 41],
  });
};

export default function MapController({ schools = [] }) {
  const navigate = useNavigate();

  const markers = useMemo(() => {
    if (!Array.isArray(schools)) return [];

    return schools
      .map((school) => {
        const lat = Number(school.lat ?? school.latitude ?? school.LAT ?? NaN);
        const lng = Number(school.lng ?? school.longitude ?? school.LNG ?? NaN);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        const displayName = school.namaSekolah || school.name || school.school_name || "-";
        const displayJenjang = school.jenjang || school.level || "-";
        const displayKecamatan = school.kecamatan || school.subdistrict || school.district || "-";
        const npsn = (school.npsn || "").toString().trim();

        return (
          <Marker
            key={npsn || `${lat}-${lng}`}
            position={[lat, lng]}
            icon={createCustomIcon(displayJenjang)}
          >
            <Popup>
              <div className={styles.popupContainer}>
                <h4 className={styles.popupTitle}>{displayName}</h4>
                <p className={styles.popupInfo}>
                  <strong>NPSN:</strong> {npsn || "-"}
                  <br />
                  <strong>Jenjang:</strong> {displayJenjang}
                  <br />
                  <strong>Kecamatan:</strong> {displayKecamatan}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (!npsn) return;
                    navigate(`/detail-sekolah/${encodeURIComponent(npsn)}`);
                  }}
                  className={styles.detailButton}
                >
                  Lihat Detail
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })
      .filter(Boolean);
  }, [schools, navigate]);

  return <>{markers}</>;
}
