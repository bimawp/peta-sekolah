// src/pages/Map/MapController.jsx

import React, { useEffect, useMemo } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom'; // <-- Impor useNavigate
import L from 'leaflet';
import styles from './Popups.module.css';

// Fungsi untuk membuat ikon kustom
const createCustomIcon = (jenjang) => {
  let iconUrl;
  switch (jenjang) {
    case 'SD':
      iconUrl = '/assets/marker-icon-sd.png'; // Ganti dengan path ikon Anda jika ada
      break;
    case 'SMP':
      iconUrl = '/assets/marker-icon-smp.png';
      break;
    default:
      iconUrl = '/assets/marker-icon.png';
  }
  return new L.Icon({
    iconUrl: iconUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: '/assets/marker-shadow.png',
    shadowSize: [41, 41]
  });
};

const MapController = ({ schools, geoData }) => {
  const map = useMap();
  const navigate = useNavigate(); // <-- Gunakan hook useNavigate

  const schoolMarkers = useMemo(() => {
    if (!Array.isArray(schools)) return null;

    return schools.map(school => {
      if (!school.latitude || !school.longitude) return null;

      // [PERBAIKAN]: Fungsi tombol detail
      const handleDetailClick = () => {
        if (school.npsn) {
          navigate(`/detail-sekolah/${school.npsn}`); // <-- Arahkan ke URL yang benar
        } else {
          alert('NPSN tidak tersedia untuk sekolah ini.');
        }
      };

      return (
        <Marker
          key={school.npsn}
          position={[school.latitude, school.longitude]}
          icon={createCustomIcon(school.level)}
        >
          <Popup>
            <div className={styles.popupContainer}>
              <h4 className={styles.popupTitle}>{school.name}</h4>
              <p className={styles.popupInfo}>
                <strong>NPSN:</strong> {school.npsn || '-'} <br />
                <strong>Jenjang:</strong> {school.level || '-'} <br />
                <strong>Kecamatan:</strong> {school.kecamatan || '-'}
              </p>
              <button onClick={handleDetailClick} className={styles.detailButton}>
                Lihat Detail
              </button>
            </div>
          </Popup>
        </Marker>
      );
    }).filter(Boolean);
  }, [schools, navigate]);

  useEffect(() => {
    if (schools && schools.length > 0) {
        const validCoords = schools
            .filter(s => s.latitude && s.longitude)
            .map(s => [s.latitude, s.longitude]);
      
        if (validCoords.length > 0) {
            const bounds = L.latLngBounds(validCoords);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }
  }, [schools, map]);

  return <>{schoolMarkers}</>;
};

export default MapController;