// src/pages/Map/Map.jsx

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';

// [PERBAIKAN WAJIB 1]: Impor CSS Leaflet agar peta tidak rusak.
import 'leaflet/dist/leaflet.css';

// [PERBAIKAN WAJIB 2]: Impor utilitas untuk memperbaiki ikon marker yang hilang.
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
import useGeoData from '../../hooks/useGeoData';

const Map = () => {
  const dispatch = useDispatch();

  const filteredSchools = useSelector(selectFilteredSchools);
  const allSchools = useSelector(selectAllSchools);
  const status = useSelector(selectSchoolsStatus);
  const filters = useSelector((state) => state.filter);
  const error = useSelector((state) => state.schools.error);

  // [PERBAIKAN 3]: Gunakan hook untuk memuat data GeoJSON kecamatan dan desa.
  const { geoData, loading: geoDataLoading, error: geoDataError } = useGeoData();

  // [PERBAIKAN 4]: State baru untuk data batas wilayah Garut.
  const [garutBoundary, setGarutBoundary] = useState(null);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchAllSchools());
    }

    // Fungsi untuk memuat data batas wilayah Garut.
    const fetchGarutBoundary = async () => {
        try {
            const response = await fetch('/data/garut-boundary.geojson'); // Path ke file baru
            if (!response.ok) {
                throw new Error('Gagal memuat batas wilayah Garut');
            }
            const data = await response.json();
            setGarutBoundary(data);
        } catch (error) {
            console.error(error);
        }
    };

    fetchGarutBoundary();
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
    if ((status === 'loading' && allSchools.length === 0) || geoDataLoading) {
      return <SuspenseLoader />;
    }

    if (status === 'failed') {
      return <ErrorMessage message={error || 'Gagal memuat data sekolah.'} />;
    }

    if (geoDataError) {
        return <ErrorMessage message={geoDataError} />;
    }

    return (
      <MapContainer center={center} zoom={zoom} className={styles.map}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {/* [PERBAIKAN 5]: Tampilkan batas wilayah Garut di peta */}
        {garutBoundary && (
            <GeoJSON
                data={garutBoundary}
                style={() => ({
                    color: '#FF0000', // Warna garis merah
                    weight: 2,
                    fillOpacity: 0.1
                })}
            />
        )}
        <MapController schools={filteredSchools} geoData={geoData} />
      </MapContainer>
    );
  };

  return (
    <div className={styles.mapPage}>
      <FilterPanel
        schools={Array.isArray(allSchools) ? allSchools : []}
        geoData={geoData} // <-- Kirim geoData ke FilterPanel
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