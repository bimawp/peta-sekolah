// src/pages/Map/Map.jsx (OPTIMAL & FINAL)
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import MarkerClusterGroup from "react-leaflet-cluster";
import styles from './Map.module.css';

// Import dari file-file baru yang telah kita buat
import { useDebounce } from '../../hooks/useDebounce';
import { GARUT_CENTER, API_ENDPOINTS, FACILITY_COLORS } from '../../config/mapConstants';
import MapController from './MapController';
import { SummaryPopup, SchoolPopup } from './Popups';
import FilterPanel from './FilterPanel';

// Impor ini memperbaiki masalah ikon default di Create React App
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css';
import 'leaflet-defaulticon-compatibility';

// ========== UTILITY FUNCTIONS ==========
const isValidCoordinate = (lat, lng) => !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

const analyzeFacilityCondition = (school) => {
    const classCondition = school.class_condition || {};
    if (Number(classCondition.classrooms_heavy_damage) > 0) return "Rusak Berat";
    if (Number(classCondition.lacking_rkb) > 0) return "Kekurangan RKB";
    if (Number(classCondition.classrooms_moderate_damage) > 0) return "Rusak Sedang";
    if (Number(classCondition.classrooms_good) > 0) return "Baik/Rehabilitasi";
    return "default";
};

const formatSchoolData = (rawData, jenjang) => {
  return Object.entries(rawData).flatMap(([kecamatan, schools]) =>
    Array.isArray(schools) ? schools.map(school => {
        const lat = parseFloat(school.coordinates?.[0]);
        const lng = parseFloat(school.coordinates?.[1]);
        if (isValidCoordinate(lat, lng)) {
            return { ...school, nama: school.name || 'Unknown', kecamatan, jenjang, lintang: lat, bujur: lng, village: school.village || 'N/A' };
        }
        return null;
    }).filter(Boolean) : []
  );
};

// ========== ICON CREATION FUNCTIONS ==========
const createSummaryIcon = (stats, colorOverride = null) => {
    const { total, rusakBerat, rusakSedang, baik, kekuranganRKB } = stats;
    let dominantColor = colorOverride || FACILITY_COLORS.default;
    if (!colorOverride) {
        if (rusakBerat > 0) dominantColor = FACILITY_COLORS["Rusak Berat"];
        else if (kekuranganRKB > 0) dominantColor = FACILITY_COLORS["Kekurangan RKB"];
        else if (rusakSedang > 0) dominantColor = FACILITY_COLORS["Rusak Sedang"];
        else if (baik > 0) dominantColor = FACILITY_COLORS["Baik/Rehabilitasi"];
    }
    return new L.DivIcon({
        html: `<div class="${styles.summaryIconMarker}" style="background-color: ${dominantColor};"><span>${total}</span></div>`,
        iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20], className: styles.summaryIconContainer
    });
};

const getIconForSchool = (school) => {
    const condition = analyzeFacilityCondition(school);
    const color = FACILITY_COLORS[condition] || FACILITY_COLORS.default;
    return new L.DivIcon({
        html: `<div class="${styles.schoolIconMarker}" style="background-color: ${color};"></div>`,
        iconSize: [20, 30], iconAnchor: [10, 30], popupAnchor: [0, -32], className: styles.schoolIconContainer
    });
};

// ========== MAIN MAP COMPONENT ==========
const MapPage = () => {
    const [allSchools, setAllSchools] = useState([]);
    const [geoData, setGeoData] = useState({ kecamatan: null, desa: null });
    const [areaCenters, setAreaCenters] = useState({ kecamatan: {}, desa: {} });
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ jenjang: 'all', kecamatan: 'all', desa: 'all', facility: 'all' });
    const debouncedFilters = useDebounce(filters, 400);
    const [viewMode, setViewMode] = useState('kecamatan_summary');
    const [displayData, setDisplayData] = useState({});

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            try {
                const [paud, sd, smp, pkbm, kecGeo, desaGeo] = await Promise.all([
                    fetch(API_ENDPOINTS.paud).then(res => res.json()),
                    fetch(API_ENDPOINTS.sd).then(res => res.json()),
                    fetch(API_ENDPOINTS.smp).then(res => res.json()),
                    fetch(API_ENDPOINTS.pkbm).then(res => res.json()),
                    fetch(API_ENDPOINTS.kecamatan).then(res => res.json()),
                    fetch(API_ENDPOINTS.desa).then(res => res.json())
                ]);

                const schoolsData = [
                    ...formatSchoolData(paud, "PAUD"),
                    ...formatSchoolData(sd, "SD"),
                    ...formatSchoolData(smp, "SMP"),
                    ...formatSchoolData(pkbm, "PKBM")
                ];
                setAllSchools(schoolsData);
                setGeoData({ kecamatan: kecGeo, desa: desaGeo });

                const centers = { kecamatan: {}, desa: {} };
                kecGeo.features.forEach(f => { if(f.properties?.district) centers.kecamatan[f.properties.district] = L.geoJSON(f).getBounds().getCenter(); });
                desaGeo.features.forEach(f => { if(f.properties?.village && f.properties?.district) centers.desa[`${f.properties.village}-${f.properties.district}`] = L.geoJSON(f).getBounds().getCenter(); });
                setAreaCenters(centers);

            } catch (error) {
                console.error("Gagal memuat data peta:", error);
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        const { jenjang, kecamatan, desa, facility } = debouncedFilters;

        if (jenjang !== 'all' && kecamatan !== 'all' && desa !== 'all') {
            setViewMode('school_detail');
            const filtered = allSchools.filter(s => s.jenjang === jenjang && s.kecamatan === kecamatan && s.village === desa);
            setDisplayData({ schools: filtered });
            return;
        }

        if (facility !== 'all') {
            setViewMode('desa_summary');
            let filteredSchools = allSchools.filter(s => (jenjang === 'all' || s.jenjang === jenjang) && (kecamatan === 'all' || s.kecamatan === kecamatan));
            const schoolsWithCondition = filteredSchools.filter(s => analyzeFacilityCondition(s) === facility);
            const relevantDesaKeys = new Set(schoolsWithCondition.map(s => `${s.village}-${s.kecamatan}`));
            
            const stats = {};
            filteredSchools.forEach(school => {
                const key = `${school.village}-${school.kecamatan}`;
                if (relevantDesaKeys.has(key)) {
                    if (!stats[key]) stats[key] = { total: 0, rusakBerat: 0, rusakSedang: 0, baik: 0, kekuranganRKB: 0, desaName: school.village, kecamatanName: school.kecamatan };
                    stats[key].total++;
                    const condition = analyzeFacilityCondition(school);
                    if (condition === "Rusak Berat") stats[key].rusakBerat++;
                    else if (condition === "Kekurangan RKB") stats[key].kekuranganRKB++;
                    else if (condition === "Rusak Sedang") stats[key].rusakSedang++;
                    else if (condition === "Baik/Rehabilitasi") stats[key].baik++;
                }
            });
            setDisplayData({ stats });
            return;
        }

        setViewMode('kecamatan_summary');
        let filteredSchools = allSchools.filter(s => (jenjang === 'all' || s.jenjang === jenjang) && (kecamatan === 'all' || s.kecamatan === kecamatan));
        
        const stats = {};
        filteredSchools.forEach(school => {
            const key = school.kecamatan;
            if (!stats[key]) stats[key] = { total: 0, rusakBerat: 0, rusakSedang: 0, baik: 0, kekuranganRKB: 0 };
            stats[key].total++;
            const condition = analyzeFacilityCondition(school);
            if (condition === "Rusak Berat") stats[key].rusakBerat++;
            else if (condition === "Kekurangan RKB") stats[key].kekuranganRKB++;
            else if (condition === "Rusak Sedang") stats[key].rusakSedang++;
            else if (condition === "Baik/Rehabilitasi") stats[key].baik++;
        });
        setDisplayData({ stats });

    }, [allSchools, debouncedFilters]);
    
    const renderedMarkers = useMemo(() => {
        if (viewMode === 'school_detail' && displayData.schools) {
            return (
                <MarkerClusterGroup chunkedLoading>
                    {displayData.schools.map((school) => (
                        <Marker key={school.npsn} position={[school.lintang, school.bujur]} icon={getIconForSchool(school)}>
                            <Popup><SchoolPopup school={school} /></Popup>
                        </Marker>
                    ))}
                </MarkerClusterGroup>
            );
        }
        if (displayData.stats) {
            return Object.entries(displayData.stats).map(([key, stats]) => {
                const center = viewMode === 'desa_summary' ? areaCenters.desa[`${stats.desaName}-${stats.kecamatanName}`] : areaCenters.kecamatan[key];
                if (!center) return null;
                const iconColor = viewMode === 'desa_summary' ? FACILITY_COLORS[filters.facility] : null;
                const title = viewMode === 'desa_summary' ? `Desa ${stats.desaName}` : `Kecamatan ${key}`;
                return (
                    <Marker key={key} position={center} icon={createSummaryIcon(stats, iconColor)}>
                        <Popup><SummaryPopup title={title} stats={stats} /></Popup>
                    </Marker>
                );
            });
        }
        return null;
    }, [viewMode, displayData, areaCenters, filters.facility]);
    
    const handleFilterChange = useCallback((filterName, value) => {
        setFilters(prev => {
            const newFilters = { ...prev, [filterName]: value };
            if (filterName === 'kecamatan') {
                newFilters.desa = 'all';
            }
            return newFilters;
        });
    }, []);

    if (loading) return (
        <div className={styles.loadingOverlay}>
            <div className={styles.spinner}></div>
            <h2 className={styles.loadingTitle}>Memuat Data Peta...</h2>
        </div>
    );

    return (
        <div className={styles.mapPageContainer}>
            <FilterPanel 
                filters={filters}
                onFilterChange={handleFilterChange}
                allSchools={allSchools}
            />
            <div className={styles.mapWrapper}>
                <MapContainer center={GARUT_CENTER} zoom={10} style={{ height: "100%", width: "100%" }}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'/>
                    {geoData.kecamatan && <GeoJSON data={geoData.kecamatan} style={{ color: "#94a3b8", weight: 1, fillOpacity: 0.05 }} />}
                    <MapController filters={debouncedFilters} areaCenters={areaCenters} schools={allSchools} />
                    {renderedMarkers}
                </MapContainer>
            </div>
        </div>
    );
};

export default MapPage;