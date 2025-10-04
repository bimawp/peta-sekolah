// src/pages/Map/Map.jsx - VERSI PERBAIKAN LENGKAP

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MapContainer, TileLayer } from 'react-leaflet';

// [PERBAIKAN 1]: Impor file CSS Leaflet yang hilang.
// Ini akan memperbaiki masalah peta yang pecah-pecah.
import 'leaflet/dist/leaflet.css'; 

// [PERBAIKAN 2]: Impor file utilitas map untuk memperbaiki ikon.
// Baris ini akan menjalankan kode di mapUtils.js yang memperbaiki path ikon default Leaflet.
import '../../services/utils/mapUtils.js'; 

import { 
  fetchAllSchools, 
  selectFilteredSchools, 
  selectSchoolsStatus, 
  selectAllSchools 
} from '../../store/slices/schoolSlice';
import { setFilter, resetFilters } from '../../store/slices/filterSlice';
import styles from './Map.module.css';
import MapController from './MapController';
import FilterPanel from './FilterPanel';
import SuspenseLoader from '../../components/common/SuspenseLoader/SuspenseLoader';
import ErrorMessage from '../../components/common/ErrorMessage/ErrorMessage';
// [PERBAIKAN 3]: Impor hook untuk data geografi
import useGeoData from '../../hooks/useGeoData'; // <--- BARIS BARU

const Map = () => {
  const dispatch = useDispatch();
  
  // Mengambil data dari Redux Store (tidak ada perubahan di sini)
  const filteredSchools = useSelector(selectFilteredSchools);
  const allSchools = useSelector(selectAllSchools); 
  const status = useSelector(selectSchoolsStatus);
  const filters = useSelector((state) => state.filter);
  const error = useSelector((state) => state.schools.error);

  // [PERBAIKAN 4]: Panggil hook untuk memuat data geografi
  const { geoData, loading: geoDataLoading, error: geoDataError } = useGeoData(); // <--- BARIS BARU

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchAllSchools());
    }
  }, [status, dispatch]);

  const center = [-7.213, 107.900];
  const zoom = 11;

  const handleFilterChange = (filterType, value) => {
    dispatch(setFilter({ filterType, value }));
  };

  const handleResetFilters = () => {
    dispatch(resetFilters());
  };

  const renderContent = () => {
    // [PERBAIKAN 5]: Tambahkan pengecekan loading untuk geoData
    if ((status === 'loading' && allSchools.length === 0) || geoDataLoading) { // <--- MODIFIKASI: Tambahkan geoDataLoading
      return <SuspenseLoader />;
    }

    if (status === 'failed') {
      return <ErrorMessage message={error || 'Gagal memuat data sekolah.'} />;
    }
    
    // [PERBAIKAN 6]: Tambahkan pengecekan error untuk geoData
    if (geoDataError) { // <--- BARIS BARU
        return <ErrorMessage message={geoDataError} />;
    }

    return (
      <MapContainer center={center} zoom={zoom} className={styles.map}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapController schools={filteredSchools} />
      </MapContainer>
    );
  };

  return (
    <div className={styles.mapPage}>
      <FilterPanel 
        schools={Array.isArray(allSchools) ? allSchools : []}
        geoData={geoData} // <--- PERBAIKAN: Pass geoData ke FilterPanel
        filters={filters}
        setFilter={handleFilterChange}
        resetFilters={handleResetFilters}
      />
      <div className={styles.mapWrapper}>
        {renderContent()}
      </div>
    </div>
  );
};

export default Map;