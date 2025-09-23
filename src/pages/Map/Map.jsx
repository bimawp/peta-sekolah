// src/pages/Map/Map.jsx

import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import styles from './Map.module.css';
import './MapMarkers.css';
import 'leaflet/dist/leaflet.css';

import FilterPanel from './FilterPanel';
import Popups from './Popups';
import useMapData from '../../hooks/useMapData';

// Perbaikan untuk ikon default Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const createCustomIcon = (school) => {
  return L.divIcon({
    className: 'custom-school-icon-container',
    html: `<div class="custom-school-icon" title="${school.name}">${school.type.toUpperCase()}</div>`,
  });
};

// Komponen untuk mengontrol peta secara dinamis
const MapController = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
};


const Map = () => {
  const [filters, setFilters] = useState({
    jenjang: 'semua',
    kecamatan: 'semua',
    desa: 'semua',
  });
  const [mapState, setMapState] = useState({
      center: [-7.2278, 107.9087],
      zoom: 10
  });
  const [viewMode, setViewMode] = useState('kecamatan'); // 'kecamatan' atau 'desa'
  const [selectedKecamatan, setSelectedKecamatan] = useState(null);

  const { allSchools, kecamatanGeoJSON, desaGeoJSON, loading, error } = useMapData(filters);

  const kecamatanList = useMemo(() => {
    if (!kecamatanGeoJSON) return [];
    const districts = kecamatanGeoJSON.features.map(f => f.properties.district);
    return ['semua', ...new Set(districts)].sort();
  }, [kecamatanGeoJSON]);

  const desaList = useMemo(() => {
    if (!desaGeoJSON || filters.kecamatan === 'semua') return ['semua'];
    const filtered = desaGeoJSON.features
      .filter(f => f.properties.district === filters.kecamatan)
      .map(f => f.properties.DESA);
    return ['semua', ...new Set(filtered)].sort();
  }, [desaGeoJSON, filters.kecamatan]);
  
  const handleFilterChange = (newFilters) => {
      setFilters(newFilters);
      if (newFilters.kecamatan !== 'semua' && newFilters.kecamatan !== selectedKecamatan) {
          const feature = kecamatanGeoJSON?.features.find(f => f.properties.district === newFilters.kecamatan);
          if (feature) {
              setSelectedKecamatan(feature.properties.district);
              setViewMode('desa');
              setMapState({
                  center: [feature.properties.center_lat, feature.properties.center_lon],
                  zoom: 12
              });
          }
      } else if (newFilters.kecamatan === 'semua') {
          backToKecamatanView();
      }
  };


  const onEachKecamatan = (feature, layer) => {
    const kecamatanName = feature.properties.district;
    layer.on({
      click: (event) => {
        const props = event.target.feature.properties;
        setSelectedKecamatan(props.district);
        setFilters(prev => ({ ...prev, kecamatan: props.district, desa: 'semua' }));
        setViewMode('desa');
        if (props.center_lat && props.center_lon) {
          setMapState({ center: [props.center_lat, props.center_lon], zoom: 12 });
        }
      },
    });
    layer.bindTooltip(kecamatanName, {
      permanent: true,
      direction: 'center',
      className: 'kecamatan-label',
    });
  };

  const onEachDesa = (feature, layer) => {
    layer.bindTooltip(feature.properties.DESA, {
      permanent: true,
      direction: 'center',
      className: 'desa-label',
    });
  };

  const backToKecamatanView = () => {
    setViewMode('kecamatan');
    setSelectedKecamatan(null);
    setFilters({ jenjang: 'semua', kecamatan: 'semua', desa: 'semua' });
    setMapState({ center: [-7.2278, 107.9087], zoom: 10 });
  };
  
  // Menentukan data GeoJSON yang akan ditampilkan berdasarkan viewMode
  const visibleDesaGeoJSON = useMemo(() => {
      if (viewMode !== 'desa' || !desaGeoJSON || !selectedKecamatan) return null;
      return {
          ...desaGeoJSON,
          features: desaGeoJSON.features.filter(f => f.properties.district === selectedKecamatan)
      };
  }, [viewMode, desaGeoJSON, selectedKecamatan]);


  return (
    <div className={styles.mapPageContainer}>
      <FilterPanel
        filters={filters}
        setFilters={handleFilterChange}
        kecamatanList={kecamatanList}
        desaList={desaList}
        onBack={backToKecamatanView}
        canGoBack={viewMode !== 'kecamatan'}
        loading={loading}
      />
      <div className={styles.mapContainer}>
        {error && <div className={styles.errorOverlay}>Gagal memuat data: {error}</div>}
        <MapContainer center={mapState.center} zoom={mapState.zoom} className={styles.map} scrollWheelZoom={true}>
          <MapController center={mapState.center} zoom={mapState.zoom} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {viewMode === 'kecamatan' && kecamatanGeoJSON && (
            <GeoJSON data={kecamatanGeoJSON} onEachFeature={onEachKecamatan} />
          )}

          {visibleDesaGeoJSON && (
            <GeoJSON data={visibleDesaGeoJSON} onEachFeature={onEachDesa} />
          )}
          
          {viewMode === 'desa' && (
             <MarkerClusterGroup>
                {allSchools.map((school) => (
                  <Marker
                    key={school.id} // Gunakan ID unik jika ada, ini lebih baik dari index
                    position={school.coordinates}
                    icon={createCustomIcon(school)}
                  >
                    <Popup>
                      <Popups school={school} />
                    </Popup>
                  </Marker>
                ))}
              </MarkerClusterGroup>
          )}

        </MapContainer>
      </div>
    </div>
  );
};

export default Map;