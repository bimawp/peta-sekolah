// src/pages/Map/Map.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from "react-leaflet";
import * as L from 'leaflet';
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import MarkerClusterGroup from "react-leaflet-cluster";
import styles from './Map.module.css';

import { useDebounce } from '../../hooks/useDebounce';
import { GARUT_CENTER, API_ENDPOINTS, FACILITY_COLORS } from '../../config/mapConstants';
import MapController from './MapController';
import { SummaryPopup, SchoolPopup } from './Popups';
import FilterPanel from './FilterPanel';
import { analyzeFacilityCondition } from './mapUtils';

import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css';
import 'leaflet-defaulticon-compatibility';

// ========== FUNGSI UTILITAS & IKON (LENGKAP) ==========
const isValidCoordinate = (lat, lng) => !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

const formatSchoolData = (rawData, jenjang) => {
  return Object.entries(rawData).flatMap(([kecamatan, schools]) =>
    Array.isArray(schools) ? schools.map(school => {
        const lat = parseFloat(school.coordinates?.[0]);
        const lng = parseFloat(school.coordinates?.[1]);
        if (isValidCoordinate(lat, lng)) {
            return {
                ...school,
                nama: school.name || 'Unknown',
                kecamatan,
                jenjang,
                lintang: lat,
                bujur: lng,
                village: school.village || 'N/A',
                condition: analyzeFacilityCondition(school)
            };
        }
        return null;
    }).filter(Boolean) : []
  );
};

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
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -22],
        className: styles.summaryIconContainer
    });
};

const getIconForSchool = (school) => {
    const condition = analyzeFacilityCondition(school);
    const color = FACILITY_COLORS[condition] || FACILITY_COLORS.default;
    return new L.DivIcon({
        html: `<div class="${styles.schoolIconMarker}" style="background-color: ${color};"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -15],
        className: styles.schoolIconContainer
    });
};

// ========== KOMPONEN UTAMA ==========
const MapPage = () => {
    const [allSchools, setAllSchools] = useState([]);
    const [geoData, setGeoData] = useState({ kecamatan: null, desa: null });
    const [areaCenters, setAreaCenters] = useState({ kecamatan: {}, desa: {} });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        jenjang: 'all',
        kecamatan: 'all',
        desa: 'all',
        facility: 'all'
    });
    const debouncedFilters = useDebounce(filters, 300);
    const [filterOptions, setFilterOptions] = useState({ kecamatan: [], desa: {} });

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            setError(null);

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

                const kecamatanList = [...new Set(kecGeo.features.map(f => f.properties.district))].sort();
                const desaByKecamatan = {};
                desaGeo.features.forEach(f => {
                    const district = f.properties.district;
                    const village = f.properties.village;
                    if (district && village) {
                        if (!desaByKecamatan[district]) desaByKecamatan[district] = [];
                        desaByKecamatan[district].push(village);
                    }
                });
                Object.values(desaByKecamatan).forEach(v => v.sort());
                setFilterOptions({ kecamatan: kecamatanList, desa: desaByKecamatan });

                const centers = { kecamatan: {}, desa: {} };
                kecGeo.features.forEach(f => {
                    if (f.properties?.district && f.geometry) {
                        centers.kecamatan[f.properties.district] = L.geoJSON(f).getBounds().getCenter();
                    }
                });
                desaGeo.features.forEach(f => {
                    if (f.properties?.village && f.properties?.district && f.geometry) {
                        centers.desa[`${f.properties.village}-${f.properties.district}`] = L.geoJSON(f).getBounds().getCenter();
                    }
                });
                setAreaCenters(centers);

            } catch (err) {
                console.error("Error loading map data:", err);
                setError(`Gagal memuat data peta: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, []);

    const { viewMode, displayData, filteredSchools } = useMemo(() => {
        let filtered = allSchools;

        if (debouncedFilters.jenjang !== 'all') {
            filtered = filtered.filter(s => s.jenjang === debouncedFilters.jenjang);
        }
        if (debouncedFilters.kecamatan !== 'all') {
            filtered = filtered.filter(s => s.kecamatan === debouncedFilters.kecamatan);
        }
        if (debouncedFilters.desa !== 'all') {
            filtered = filtered.filter(s => s.village === debouncedFilters.desa);
        }
        if (debouncedFilters.facility !== 'all') {
            filtered = filtered.filter(s => analyzeFacilityCondition(s) === debouncedFilters.facility);
        }

        if (debouncedFilters.kecamatan !== 'all' && debouncedFilters.desa !== 'all') {
            return { viewMode: 'school_detail', displayData: { schools: filtered }, filteredSchools: filtered };
        }

        if (debouncedFilters.kecamatan !== 'all') {
            const stats = {};
            filtered.forEach(school => {
                const key = `${school.village}-${school.kecamatan}`;
                if (!stats[key]) {
                    stats[key] = {
                        total: 0, rusakBerat: 0, rusakSedang: 0, baik: 0, kekuranganRKB: 0,
                        desaName: school.village, kecamatanName: school.kecamatan
                    };
                }
                stats[key].total++;
                const condition = analyzeFacilityCondition(school);
                if (condition === "Rusak Berat") stats[key].rusakBerat++;
                else if (condition === "Kekurangan RKB") stats[key].kekuranganRKB++;
                else if (condition === "Rusak Sedang") stats[key].rusakSedang++;
                else if (condition === "Baik/Rehabilitasi") stats[key].baik++;
            });
            return { viewMode: 'desa_summary', displayData: { stats }, filteredSchools: filtered };
        }

        const stats = {};
        filtered.forEach(school => {
            const key = school.kecamatan;
            if (!stats[key]) {
                stats[key] = { total: 0, rusakBerat: 0, rusakSedang: 0, baik: 0, kekuranganRKB: 0 };
            }
            stats[key].total++;
            const condition = analyzeFacilityCondition(school);
            if (condition === "Rusak Berat") stats[key].rusakBerat++;
            else if (condition === "Kekurangan RKB") stats[key].kekuranganRKB++;
            else if (condition === "Rusak Sedang") stats[key].rusakSedang++;
            else if (condition === "Baik/Rehabilitasi") stats[key].baik++;
        });

        return { viewMode: 'kecamatan_summary', displayData: { stats }, filteredSchools: filtered };
    }, [allSchools, debouncedFilters]);

    const renderedMarkers = useMemo(() => {
        if (viewMode === 'school_detail' && displayData.schools) {
            return (
                <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
                    {displayData.schools.map(school => (
                        <Marker key={school.npsn} position={[school.lintang, school.bujur]} icon={getIconForSchool(school)}>
                            <Popup maxWidth={300}><SchoolPopup school={school} /></Popup>
                        </Marker>
                    ))}
                </MarkerClusterGroup>
            );
        }
        if (displayData.stats) {
            return Object.entries(displayData.stats).map(([key, stats]) => {
                const center = viewMode === 'desa_summary'
                    ? areaCenters.desa[`${stats.desaName}-${stats.kecamatanName}`]
                    : areaCenters.kecamatan[key];
                if (!center) return null;
                const iconColor = filters.facility !== 'all' ? FACILITY_COLORS[filters.facility] : null;
                const title = viewMode === 'desa_summary' ? `Desa ${stats.desaName}` : `Kecamatan ${key}`;
                return (
                    <Marker key={key} position={center} icon={createSummaryIcon(stats, iconColor)}>
                        <Popup maxWidth={300}><SummaryPopup title={title} stats={stats} /></Popup>
                    </Marker>
                );
            }).filter(Boolean);
        }
        return null;
    }, [viewMode, displayData, areaCenters, filters.facility]);

    const noDataFound = !loading && !error && Object.keys(displayData?.stats || {}).length === 0 && (!displayData?.schools || displayData.schools.length === 0);

    const handleFilterChange = useCallback((filterName, value) => {
        setFilters(prev => {
            const newFilters = { ...prev, [filterName]: value };
            if (filterName === 'kecamatan') newFilters.desa = 'all';
            return newFilters;
        });
    }, []);

    const handleResetFilters = useCallback(() => {
        setFilters({ jenjang: 'all', kecamatan: 'all', desa: 'all', facility: 'all' });
    }, []);

    if (loading) return <div className={styles.loadingOverlay}><div className={styles.spinner}></div><h2 className={styles.loadingTitle}>Memuat Data Peta Sekolah...</h2></div>;
    if (error) return <div className={styles.loadingOverlay}><h2 style={{ color: '#ef4444' }}>❌ Terjadi Kesalahan</h2><p>{error}</p><button onClick={() => window.location.reload()}>Coba Lagi</button></div>;

    return (
        <div className={styles.mapPageContainer}>
            <FilterPanel
                filters={filters}
                onFilterChange={handleFilterChange}
                onReset={handleResetFilters}
                options={filterOptions}
                schools={filteredSchools}
            />
            <div className={styles.mapWrapper}>
                <MapContainer center={GARUT_CENTER} zoom={10} style={{ height: "100%", width: "100%" }} zoomControl={true}>
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />
                    {geoData.kecamatan && <GeoJSON data={geoData.kecamatan} style={{ color: "#94a3b8", weight: 2, fillOpacity: 0.08, fillColor: "#e2e8f0" }} />}
                    <MapController filters={debouncedFilters} areaCenters={areaCenters} schools={filteredSchools} />
                    {renderedMarkers}
                </MapContainer>
                {noDataFound && <div className={styles.noDataMessage}><p>Tidak ada data yang cocok dengan filter Anda.</p></div>}
            </div>
        </div>
    );
};

export default MapPage;