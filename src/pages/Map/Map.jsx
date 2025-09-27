import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MarkerClusterGroup from 'react-leaflet-cluster';
import useSchoolData from '../../hooks/useSchoolData';
import FilterPanel from './FilterPanel'; // <-- IMPORT FILTER PANEL
import styles from './Map.module.css';

// Fix ikon Leaflet default
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const MapPage = () => {
    const { schools, geoData, loading, error, stats } = useSchoolData();
    const [map, setMap] = useState(null);

    // State untuk mengelola filter
    const [filters, setFilters] = useState({
        jenjang: 'Semua Jenjang',
        kecamatan: 'Semua Kecamatan',
        desa: 'Semua Desa',
    });

    // Memoize data yang difilter agar tidak dihitung ulang setiap render
    const filteredSchools = useMemo(() => {
        return schools
            .filter(school => school.hasValidLocation) // Hanya tampilkan yang punya lokasi valid
            .filter(school => {
                if (filters.jenjang !== 'Semua Jenjang' && school.jenjang !== filters.jenjang) return false;
                if (filters.kecamatan !== 'Semua Kecamatan' && school.kecamatan !== filters.kecamatan) return false;
                if (filters.desa !== 'Semua Desa' && school.desa !== filters.desa) return false;
                return true;
            });
    }, [schools, filters]);

    if (loading) {
        return <div className={styles.loadingContainer}>Memuat data peta...</div>;
    }

    if (error) {
        return <div className={styles.errorContainer}>Gagal memuat data: {error}</div>;
    }

    return (
        <div className={styles.mapPageLayout}>
            {/* Tampilkan FilterPanel di sini */}
            <FilterPanel 
                schools={schools} 
                filters={filters} 
                setFilters={setFilters} 
            />
            <div className={styles.mapContainer}>
                <MapContainer 
                    center={[-7.21, 107.91]} 
                    zoom={10} 
                    style={{ height: '100%', width: '100%' }}
                    whenCreated={setMap}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />

                    {/* Tampilkan GeoJSON Kecamatan jika ada */}
                    {geoData.kecamatan && (
                        <GeoJSON 
                            data={geoData.kecamatan} 
                            style={{ color: '#4A90E2', weight: 1, fillOpacity: 0.1 }} 
                        />
                    )}

                    <MarkerClusterGroup>
                        {filteredSchools.map((school) => (
                            <Marker
                                key={school.npsn}
                                position={[school.latitude, school.longitude]}
                            >
                                <Popup>
                                    <b>{school.nama_sekolah}</b><br />
                                    NPSN: {school.npsn}<br />
                                    Jenjang: {school.jenjang}<br />
                                    Kecamatan: {school.kecamatan}
                                </Popup>
                            </Marker>
                        ))}
                    </MarkerClusterGroup>
                </MapContainer>
            </div>
        </div>
    );
};

export default MapPage;