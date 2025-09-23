// src/pages/Map/Map.jsx

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import styles from './Map.module.css';
import './MapMarkers.css';
import 'leaflet/dist/leaflet.css';

import FilterPanel from './FilterPanel';
import Popups from './Popups';
import useMapData from '../../hooks/useMapData';

// Ikon kustom untuk klaster kecamatan di tampilan awal
const createKecamatanClusterIcon = (kecamatan) => L.divIcon({
  className: 'kecamatan-cluster-icon',
  html: `<div class="cluster-content"><div class="cluster-count">${kecamatan.schoolCount}</div><div class="cluster-name">${kecamatan.name}</div></div>`
});

// Ikon kustom untuk sekolah individual
const createSchoolIcon = (school) => L.divIcon({
    className: 'custom-school-icon-container',
    html: `<div class="custom-school-icon" title="${school.name}">${school.type.toUpperCase()}</div>`
});

// Komponen untuk mengontrol peta (zoom/pan) secara dinamis
const MapController = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        if (center) map.flyTo(center, zoom, { animate: true, duration: 1.2 });
    }, [center, zoom, map]);
    return null;
};

// Komponen Peta Inti
const MapContent = ({ schools, kecamatanData, desaGeoJSON }) => {
  const [filters, setFilters] = useState({ jenjang: 'semua', kecamatan: 'Semua Kecamatan', desa: 'Semua Desa' });
  const [mapView, setMapView] = useState({ center: [-7.2278, 107.9087], zoom: 10 });
  const [viewMode, setViewMode] = useState('kabupaten'); // 'kabupaten' atau 'kecamatan'
  const [selectedKecamatan, setSelectedKecamatan] = useState(null);

  const kecamatanList = useMemo(() => ['Semua Kecamatan', ...kecamatanData.map(k => k.name)].sort(), [kecamatanData]);
  const desaList = useMemo(() => {
    if (!selectedKecamatan || !desaGeoJSON) return [];
    const filtered = desaGeoJSON.features
      .filter(f => f.properties.district === selectedKecamatan) // Cocokkan dengan 'district' (UPPERCASE)
      .map(f => f.properties.DESA);
    return ['Semua Desa', ...new Set(filtered)].sort();
  }, [desaGeoJSON, selectedKecamatan]);

  const zoomToKecamatan = useCallback((kecamatan) => {
    setViewMode('kecamatan');
    setSelectedKecamatan(kecamatan.name);
    setFilters(prev => ({ ...prev, kecamatan: kecamatan.name, desa: 'Semua Desa' }));
    setMapView({ center: kecamatan.center, zoom: 13 });
  }, []);

  const backToKabupatenView = () => {
    setViewMode('kabupaten');
    setSelectedKecamatan(null);
    setFilters({ jenjang: 'semua', kecamatan: 'Semua Kecamatan', desa: 'Semua Desa' });
    setMapView({ center: [-7.2278, 107.9087], zoom: 10 });
  };

  const filteredSchools = useMemo(() => {
    if (viewMode !== 'kecamatan' || !selectedKecamatan) return [];
    return schools.filter(school => {
      const { jenjang, kecamatan, desa } = filters;
      // Gunakan .toUpperCase() untuk mencocokkan dengan selectedKecamatan (dari geojson)
      if (kecamatan !== 'Semua Kecamatan' && school.kecamatan.toUpperCase() !== kecamatan) return false;
      if (jenjang !== 'semua' && school.type.toLowerCase() !== jenjang) return false;
      if (desa !== 'Semua Desa' && school.village !== desa) return false;
      return true;
    });
  }, [filters, schools, viewMode, selectedKecamatan]);
  
  const visibleDesaLayer = useMemo(() => {
    if (viewMode !== 'kecamatan' || !selectedKecamatan) return null;
    return {
      type: "FeatureCollection",
      features: desaGeoJSON.features.filter(f => f.properties.district === selectedKecamatan)
    };
  }, [viewMode, desaGeoJSON, selectedKecamatan]);

  return (
    <>
      <FilterPanel
        filters={filters}
        setFilters={setFilters}
        kecamatanList={kecamatanList}
        desaList={desaList}
        onBack={backToKabupatenView}
        canGoBack={viewMode !== 'kabupaten'}
        onKecamatanChange={(kecName) => {
          if (kecName === 'Semua Kecamatan') {
            backToKabupatenView();
          } else {
            const kec = kecamatanData.find(k => k.name === kecName);
            if(kec) zoomToKecamatan(kec);
          }
        }}
      />
      <MapContainer center={mapView.center} zoom={mapView.zoom} className={styles.map} scrollWheelZoom={true}>
        <MapController center={mapView.center} zoom={mapView.zoom} />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
        
        {viewMode === 'kabupaten' && kecamatanData.map(kec => (
          <Marker
            key={kec.name}
            position={kec.center}
            icon={createKecamatanClusterIcon(kec)}
            eventHandlers={{ click: () => zoomToKecamatan(kec) }}
          />
        ))}
        
        {visibleDesaLayer && <GeoJSON data={visibleDesaLayer} style={{ weight: 1.5, color: '#ff6b6b' }} />}
        {viewMode === 'kecamatan' && (
          <MarkerClusterGroup>
            {filteredSchools.map(school => (
              <Marker key={school.id} position={school.coordinates} icon={createSchoolIcon(school)}>
                <Popup><Popups school={school} /></Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        )}
      </MapContainer>
    </>
  );
};

// Komponen Wrapper Utama untuk Loading & Error
const Map = () => {
  const { schools, kecamatanData, desaGeoJSON, loading, error } = useMapData();

  if (loading) return <div className={styles.mapPageContainer}><div className={styles.loadingOverlay}>Menyiapkan Data Peta...</div></div>;
  if (error) return <div className={styles.mapPageContainer}><div className={styles.errorOverlay}>Gagal Memuat Data: {error}</div></div>;
  if (!kecamatanData) return <div className={styles.mapPageContainer}><div className={styles.errorOverlay}>Data Kecamatan Tidak Ditemukan.</div></div>;

  return (
    <div className={styles.mapPageContainer}>
      <MapContent schools={schools} kecamatanData={kecamatanData} desaGeoJSON={desaGeoJSON} />
    </div>
  );
};

export default Map;