import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { fetchSchoolsByRegion } from '../../store/slices/schoolSlice.js';
// UBAH PATH IMPORT DI BAWAH INI
import { getIcon } from '../../services/utils/mapUtils.js'; // <-- DIUBAH ke path yang benar
import styles from './Map.module.css';

const Map = () => {
  // ... (sisa kode tidak perlu diubah)
  const dispatch = useDispatch();
  const { 
    filteredData: schools,
    status, 
    error 
  } = useSelector((state) => state.schools) || { 
    filteredData: [], 
    status: 'idle', 
    error: null 
  };

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchSchoolsByRegion('GARUT'));
    }
  }, [status, dispatch]);

  if (status === 'loading' || status === 'idle') {
    return <div className={styles.loading}>Memuat data sekolah...</div>;
  }

  if (status === 'failed') {
    return <div className={styles.error}>Error: {error}</div>;
  }
  
  const garutPosition = [-7.2278, 107.9087];

  return (
    <div className={styles.mapPage}>
      <div className={styles.mapWrapper}>
        <MapContainer center={garutPosition} zoom={11} className={styles.mapContainer}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {schools.map((school) => (
            school.latitude && school.longitude && (
              <Marker
                key={school.id}
                position={[school.latitude, school.longitude]}
                icon={getIcon(school.condition)}
              >
                <Popup>
                  <b>{school.name}</b><br />
                  {school.address}<br />
                  Jenjang: {school.level}
                </Popup>
              </Marker>
            )
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default Map;