// src/pages/Map/Map.jsx (ERROR & PERFORMA SUDAH DIPERBAIKI)

import React, { useEffect, useState, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import MarkerClusterGroup from "react-leaflet-cluster";
import styles from './Map.module.css';
import { Filter, Hash, MapPin, ArrowLeft } from 'lucide-react';

// **PERBAIKAN KUNCI PERFORMA**
// Custom Hook untuk Debouncing dengan dependensi yang stabil untuk mencegah infinite loop
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => { clearTimeout(handler); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(value), delay]); // Menggunakan JSON.stringify untuk membandingkan isi objek, bukan referensinya
    return debouncedValue;
}

// Komponen Helper untuk menangani zoom otomatis & notifikasi
const MapController = ({ filters, areaCenters, schools }) => {
    const map = useMap();
    useEffect(() => {
        const { jenjang, kecamatan, desa } = filters;
        if (jenjang !== 'all' && kecamatan !== 'all' && desa !== 'all') {
            const desaKey = `${desa}-${kecamatan}`;
            if (areaCenters.desa[desaKey]) {
                map.flyTo(areaCenters.desa[desaKey], 15, { duration: 1.5 });
            } else if (areaCenters.kecamatan[kecamatan]) {
                map.flyTo(areaCenters.kecamatan[kecamatan], 13, { duration: 1.5 });
            }
            const hasData = schools.some(s => s.jenjang === jenjang && s.kecamatan === kecamatan && s.village === desa);
            if (!hasData) {
                setTimeout(() => {
                    alert(`Tidak ada data sekolah untuk Jenjang ${jenjang} di Desa ${desa}, Kecamatan ${kecamatan}.`);
                }, 1600);
            }
        }
    }, [filters, areaCenters, schools, map]);
    return null;
};

// Fix default Leaflet icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ========== CONSTANTS ==========
const GARUT_CENTER = [-7.2279, 107.9087];
const API_ENDPOINTS = {
  paud: "https://peta-sekolah.vercel.app/paud/data/paud.json",
  sd: "https://peta-sekolah.vercel.app/sd/data/sd_new.json",
  smp: "https://peta-sekolah.vercel.app/smp/data/smp.json",
  pkbm: "https://peta-sekolah.vercel.app/pkbm/data/pkbm.json",
  kecamatan: "https://peta-sekolah.vercel.app/data/kecamatan.geojson",
  desa: "https://peta-sekolah.vercel.app/data/desa.geojson"
};
const FACILITY_COLORS = {
  "Rusak Berat": "#ef4444",
  "Rusak Sedang": "#f97316",
  "Kekurangan RKB": "#eab308",
  "Baik/Rehabilitasi": "#22c55e",
  "default": "#6b7280"
};

// ========== UTILITY & ANALYSIS FUNCTIONS ==========
const isValidCoordinate = (lat, lng) => !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
const analyzeFacilityCondition = (school) => {
    const classCondition = school.class_condition || {};
    if (Number(classCondition.classrooms_heavy_damage) > 0) return "Rusak Berat";
    if (Number(classCondition.lacking_rkb) > 0) return "Kekurangan RKB";
    if (Number(classCondition.classrooms_moderate_damage) > 0) return "Rusak Sedang";
    if (Number(classCondition.classrooms_good) > 0) return "Baik/Rehabilitasi";
    return "default";
};

// ========== ICON CREATION ==========
const createSchoolIcon = (color) => new L.DivIcon({
    html: `<div class="${styles.schoolIconMarker}" style="background-color: ${color};"></div>`,
    iconSize: [20, 30], iconAnchor: [10, 30], popupAnchor: [0, -32], className: styles.schoolIconContainer
});
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
const iconCache = { school: {} };
const getIconForSchool = (school) => {
  const color = FACILITY_COLORS[analyzeFacilityCondition(school)] || FACILITY_COLORS.default;
  if (!iconCache.school[color]) iconCache.school[color] = createSchoolIcon(color);
  return iconCache.school[color];
};

// ========== DATA FORMATTER ==========
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

// ========== POPUP COMPONENTS (KODE LENGKAP) ==========
const SummaryPopup = React.memo(({ title, stats }) => (
    <div className={styles.popupCard}>
        <div className={styles.popupHeader}>
            <h3 className={styles.popupTitle}>{title}</h3>
            {stats.kecamatanName && <p className={styles.popupSubtitle}>Kec. {stats.kecamatanName}</p>}
        </div>
        <div className={styles.popupBody}>
            <div className={styles.summaryTotal}>
                <span>Total Sekolah</span>
                <strong>{stats.total}</strong>
            </div>
            <div className={styles.conditionList}>
                {stats.rusakBerat > 0 && <div className={styles.conditionItem}><span className={styles.conditionCircle} style={{ background: FACILITY_COLORS['Rusak Berat'] }}></span>Rusak Berat: <strong>{stats.rusakBerat}</strong></div>}
                {stats.kekuranganRKB > 0 && <div className={styles.conditionItem}><span className={styles.conditionCircle} style={{ background: FACILITY_COLORS['Kekurangan RKB'] }}></span>Kurang RKB: <strong>{stats.kekuranganRKB}</strong></div>}
                {stats.rusakSedang > 0 && <div className={styles.conditionItem}><span className={styles.conditionCircle} style={{ background: FACILITY_COLORS['Rusak Sedang'] }}></span>Rusak Sedang: <strong>{stats.rusakSedang}</strong></div>}
                {stats.baik > 0 && <div className={styles.conditionItem}><span className={styles.conditionCircle} style={{ background: FACILITY_COLORS['Baik/Rehabilitasi'] }}></span>Baik/Rehab: <strong>{stats.baik}</strong></div>}
            </div>
        </div>
    </div>
));
const SchoolPopup = React.memo(({ school }) => (
    <div className={styles.popupCard}>
        <div className={styles.popupHeader}>
            <h3 className={styles.popupTitle}>{school.nama}</h3>
            <span className={`${styles.jenjangBadge} ${styles[school.jenjang.toLowerCase()]}`}>{school.jenjang}</span>
        </div>
        <div className={styles.popupBody}>
            <div className={styles.infoRow}><Hash size={14} /><span>NPSN: {school.npsn || '-'}</span></div>
            <div className={styles.infoRow}><MapPin size={14} /><span>{school.village}, {school.kecamatan}</span></div>
        </div>
    </div>
));

// ========== MAIN MAP COMPONENT ==========
const Map = () => {
    const [allSchools, setAllSchools] = useState([]);
    const [geoData, setGeoData] = useState({ kecamatan: null, desa: null });
    const [areaCenters, setAreaCenters] = useState({ kecamatan: {}, desa: {} });
    const [loading, setLoading] = useState(true);
    const [jenjangFilter, setJenjangFilter] = useState('all');
    const [kecamatanFilter, setKecamatanFilter] = useState('all');
    const [desaFilter, setDesaFilter] = useState('all');
    const [facilityFilter, setFacilityFilter] = useState('all');
    const debouncedFilters = useDebounce({ jenjang: jenjangFilter, kecamatan: kecamatanFilter, desa: desaFilter, facility: facilityFilter }, 300);
    const [viewMode, setViewMode] = useState('kecamatan_summary');
    const [displayData, setDisplayData] = useState({});

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const endpoints = [ { url: API_ENDPOINTS.paud, type: "PAUD" }, { url: API_ENDPOINTS.sd, type: "SD" }, { url: API_ENDPOINTS.smp, type: "SMP" }, { url: API_ENDPOINTS.pkbm, type: "PKBM" } ];
                const responses = await Promise.all(endpoints.map(ep => fetch(ep.url).then(res => res.json())));
                const allSchoolsData = endpoints.flatMap((ep, index) => formatSchoolData(responses[index], ep.type));
                setAllSchools(allSchoolsData);
                const [kecRes, desaRes] = await Promise.all([ fetch(API_ENDPOINTS.kecamatan).then(r => r.json()), fetch(API_ENDPOINTS.desa).then(r => r.json()) ]);
                setGeoData({ kecamatan: kecRes, desa: desaRes });
                const centers = { kecamatan: {}, desa: {} };
                kecRes.features.forEach(feature => { const name = feature.properties?.district; if (name) centers.kecamatan[name] = L.geoJSON(feature).getBounds().getCenter(); });
                desaRes.features.forEach(feature => { const desaName = feature.properties?.village; const kecName = feature.properties?.district; if (desaName && kecName) { const key = `${desaName}-${kecName}`; centers.desa[key] = L.geoJSON(feature).getBounds().getCenter(); } });
                setAreaCenters(centers);
            } catch (error) { console.error("Error loading map data:", error); } 
            finally { setLoading(false); }
        };
        loadData();
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
            let schoolsToProcess = allSchools;
            if (jenjang !== 'all') { schoolsToProcess = schoolsToProcess.filter(s => s.jenjang === jenjang); }
            if (kecamatan !== 'all') { schoolsToProcess = schoolsToProcess.filter(s => s.kecamatan === kecamatan); }
            const schoolsWithCondition = schoolsToProcess.filter(s => analyzeFacilityCondition(s) === facility);
            const relevantDesaKeys = new Set(schoolsWithCondition.map(s => `${s.village}-${s.kecamatan}`));
            const stats = {};
            schoolsToProcess.forEach(school => {
                const key = `${school.village}-${school.kecamatan}`;
                if (relevantDesaKeys.has(key)) {
                    if (!stats[key]) { stats[key] = { total: 0, rusakBerat: 0, rusakSedang: 0, baik: 0, kekuranganRKB: 0, default: 0, desaName: school.village, kecamatanName: school.kecamatan }; }
                    stats[key].total++;
                    const condition = analyzeFacilityCondition(school);
                    if (condition === "Rusak Berat") stats[key].rusakBerat++; else if (condition === "Kekurangan RKB") stats[key].kekuranganRKB++; else if (condition === "Rusak Sedang") stats[key].rusakSedang++; else if (condition === "Baik/Rehabilitasi") stats[key].baik++; else stats[key].default++;
                }
            });
            setDisplayData({ stats });
            return;
        }
        setViewMode('kecamatan_summary');
        let schoolsToProcess = allSchools;
        if (jenjang !== 'all') schoolsToProcess = schoolsToProcess.filter(s => s.jenjang === jenjang);
        if (kecamatan !== 'all') schoolsToProcess = schoolsToProcess.filter(s => s.kecamatan === kecamatan);
        const stats = {};
        schoolsToProcess.forEach(school => {
            const key = school.kecamatan;
            if (!stats[key]) { stats[key] = { total: 0, rusakBerat: 0, rusakSedang: 0, baik: 0, kekuranganRKB: 0, default: 0 }; }
            stats[key].total++;
            const condition = analyzeFacilityCondition(school);
            if (condition === "Rusak Berat") stats[key].rusakBerat++; else if (condition === "Kekurangan RKB") stats[key].kekuranganRKB++; else if (condition === "Rusak Sedang") stats[key].rusakSedang++; else if (condition === "Baik/Rehabilitasi") stats[key].baik++; else stats[key].default++;
        });
        setDisplayData({ stats });
    }, [allSchools, debouncedFilters]);
    
    const renderedMarkers = useMemo(() => {
        if (viewMode === 'school_detail' && displayData.schools) {
            return ( <MarkerClusterGroup chunkedLoading>{displayData.schools.map((school, index) => ( <Marker key={school.npsn || index} position={[school.lintang, school.bujur]} icon={getIconForSchool(school)}><Popup><SchoolPopup school={school} /></Popup></Marker> ))}</MarkerClusterGroup> );
        }
        if (viewMode === 'desa_summary' && displayData.stats) {
            return Object.entries(displayData.stats).map(([key, stats]) => {
                const center = areaCenters.desa[key];
                if (!center) return null;
                const iconColor = FACILITY_COLORS[facilityFilter] || null;
                return ( <Marker key={`desa-${key}`} position={center} icon={createSummaryIcon(stats, iconColor)}><Popup><SummaryPopup title={`Desa ${stats.desaName}`} stats={stats} /></Popup></Marker> );
            });
        }
        if (viewMode === 'kecamatan_summary' && displayData.stats) {
            return Object.entries(displayData.stats).map(([key, stats]) => {
                const center = areaCenters.kecamatan[key];
                if (!center) return null;
                return ( <Marker key={`kec-${key}`} position={center} icon={createSummaryIcon(stats)}><Popup><SummaryPopup title={`Kecamatan ${key}`} stats={stats} /></Popup></Marker> );
            });
        }
        return null;
    }, [viewMode, displayData, areaCenters, facilityFilter]);
    
    const uniqueKecamatan = useMemo(() => [...new Set(allSchools.map(s => s.kecamatan))].sort(), [allSchools]);
    const uniqueDesa = useMemo(() => kecamatanFilter !== 'all' 
        ? [...new Set(allSchools.filter(s => s.kecamatan === kecamatanFilter).map(s => s.village))].sort()
        : [], [allSchools, kecamatanFilter]);

    if (loading) return <div className={styles.loadingOverlay}><div className={styles.spinner}></div><h2 className={styles.loadingTitle}>Memuat Data Peta...</h2></div>;

    return (
        <div className={styles.mapPageContainer}>
            <div className={styles.filterCard}>
                <div className={styles.filterHeader}><Filter size={20} /><h3>Filter Peta</h3></div>
                <div className={styles.filterContainer}>
                    <div className={styles.filterGroup}><label>Jenjang</label><select value={jenjangFilter} onChange={e => setJenjangFilter(e.target.value)}><option value="all">Semua Jenjang</option><option value="PAUD">PAUD</option><option value="SD">SD</option><option value="SMP">SMP</option><option value="PKBM">PKBM</option></select></div>
                    <div className={styles.filterGroup}><label>Kecamatan</label><select value={kecamatanFilter} onChange={e => {setKecamatanFilter(e.target.value); setDesaFilter('all');}}><option value="all">Semua Kecamatan</option>{uniqueKecamatan.map(k => <option key={k} value={k}>{k}</option>)}</select></div>
                    <div className={styles.filterGroup}><label>Desa</label><select value={desaFilter} onChange={e => setDesaFilter(e.target.value)} disabled={kecamatanFilter === 'all'}><option value="all">Semua Desa</option>{uniqueDesa.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                    <div className={styles.filterGroup}><label>Kondisi Fasilitas</label><select value={facilityFilter} onChange={e => setFacilityFilter(e.target.value)}><option value="all">Tampilkan Ringkasan Kecamatan</option><option value="Baik/Rehabilitasi">Baik / Rehabilitasi</option><option value="Rusak Sedang">Rusak Sedang</option><option value="Kekurangan RKB">Kekurangan RKB</option><option value="Rusak Berat">Rusak Berat</option></select></div>
                </div>
            </div>
            <div className={styles.mapWrapper}>
                <MapContainer center={GARUT_CENTER} zoom={10} style={{ height: "100%", width: "100%" }}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'/>
                    <GeoJSON data={geoData.kecamatan} style={{ color: "#94a3b8", weight: 1, fillOpacity: 0.05 }} />
                    <MapController filters={debouncedFilters} areaCenters={areaCenters} schools={allSchools} />
                    {renderedMarkers}
                </MapContainer>
            </div>
        </div>
    );
};

export default Map;