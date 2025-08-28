import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import MarkerClusterGroup from "react-leaflet-cluster";
import styles from "./Map.module.css";

// Fix default Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ========== CONSTANTS ==========
const GARUT_BOUNDS = {
  minLat: -7.6,
  maxLat: -6.8,
  minLng: 107.4,
  maxLng: 108.2
};

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
  "Rusak Berat": "#dc3545",
  "Rusak Sedang": "#fd7e14",
  "Kekurangan RKB": "#ffc107",
  "Rehabilitasi": "#198754",
  "Pembangunan RKB": "#0d6efd",
  "default": "#6c757d"
};

const FACILITY_LABELS = {
  "Rusak Berat": "Rusak Berat",
  "Rusak Sedang": "Rusak Sedang", 
  "Kekurangan RKB": "Kekurangan RKB",
  "Rehabilitasi": "Baik / Rehabilitasi",
  "Pembangunan RKB": "Pembangunan RKB",
  "default": "Tidak Ada Data"
};

const PERFORMANCE_LIMITS = {
  maxVisibleMarkers: 500,
  initialDisplayLimit: 200,
  boundsUpdateDelay: 300
};

// ========== UTILITY FUNCTIONS ==========
const isWithinGarutBounds = (lat, lng) => {
  return lat >= GARUT_BOUNDS.minLat && 
         lat <= GARUT_BOUNDS.maxLat && 
         lng >= GARUT_BOUNDS.minLng && 
         lng <= GARUT_BOUNDS.maxLng;
};

const isValidCoordinate = (lat, lng) => {
  return !isNaN(lat) && !isNaN(lng) && 
         lat >= -90 && lat <= 90 && 
         lng >= -180 && lng <= 180 &&
         isWithinGarutBounds(lat, lng);
};

const reverseGeocode = async (lat, lng) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=id,en`
    );
    const data = await response.json();
    
    if (data?.address) {
      const address = data.address;
      return {
        fullAddress: data.display_name,
        road: address.road || address.street || '',
        village: address.village || address.suburb || address.hamlet || '',
        district: address.district || address.state_district || '',
        city: address.city || address.town || address.county || '',
        state: address.state || address.province || '',
        postcode: address.postcode || '',
        country: address.country || 'Indonesia'
      };
    }
    return null;
  } catch (error) {
    console.warn("Reverse geocoding failed:", error);
    return null;
  }
};

// ========== ICON CREATION ==========
const createFacilityIcon = (color, size = 'normal') => {
  // Responsive icon sizes
  const dimensions = size === 'small' ? { width: 20, height: 33 } : { width: 25, height: 41 };
  const circleRadius = size === 'small' ? 5 : 6;
  const innerRadius = size === 'small' ? 2.5 : 3;
  
  const svgIcon = `
    <svg width="${dimensions.width}" height="${dimensions.height}" viewBox="0 0 ${dimensions.width} ${dimensions.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow-${color.replace('#', '')}" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
        </filter>
      </defs>
      <path d="M${dimensions.width/2} 0C${dimensions.width*0.224} 0 0 ${dimensions.width*0.224} 0 ${dimensions.width/2}c0 ${dimensions.width*0.132} ${dimensions.width*0.052} ${dimensions.width*0.252} ${dimensions.width*0.136} ${dimensions.width*0.34}L${dimensions.width/2} ${dimensions.height}l${dimensions.width*0.364} -${dimensions.height*0.488}c${dimensions.width*0.084}-${dimensions.width*0.088} ${dimensions.width*0.136}-${dimensions.width*0.208} ${dimensions.width*0.136}-${dimensions.width*0.34}C${dimensions.width} ${dimensions.width*0.224} ${dimensions.width*0.776} 0 ${dimensions.width/2} 0z" 
            fill="${color}" 
            stroke="#ffffff" 
            stroke-width="2"
            filter="url(#shadow-${color.replace('#', '')})"
      />
      <circle cx="${dimensions.width/2}" cy="${dimensions.width/2}" r="${circleRadius}" fill="white" stroke="#333" stroke-width="1"/>
      <circle cx="${dimensions.width/2}" cy="${dimensions.width/2}" r="${innerRadius}" fill="${color}"/>
    </svg>
  `;
  
  return new L.DivIcon({
    html: svgIcon,
    iconSize: [dimensions.width, dimensions.height],
    iconAnchor: [dimensions.width/2, dimensions.height],
    popupAnchor: [1, -dimensions.height*0.83],
    className: 'custom-facility-icon'
  });
};

const createKecamatanIcon = (stats, size = 'normal') => {
  const { total, baik, rusakSedang, rusakBerat } = stats;
  const dimensions = size === 'small' ? 28 : 35;
  
  let dominantColor = FACILITY_COLORS.default;
  if (rusakBerat > 0) dominantColor = FACILITY_COLORS["Rusak Berat"];
  else if (rusakSedang > 0) dominantColor = FACILITY_COLORS["Rusak Sedang"];
  else if (baik > 0) dominantColor = FACILITY_COLORS["Rehabilitasi"];
  
  const svgIcon = `
    <svg width="${dimensions}" height="${dimensions}" viewBox="0 0 ${dimensions} ${dimensions}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow-kec-${total}" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.4)"/>
        </filter>
      </defs>
      <circle cx="${dimensions/2}" cy="${dimensions/2}" r="${dimensions/2-2}" 
              fill="${dominantColor}" 
              stroke="#fff" 
              stroke-width="2"
              filter="url(#shadow-kec-${total})"
      />
      <circle cx="${dimensions/2}" cy="${dimensions/2}" r="${dimensions/2-6}" 
              fill="rgba(255,255,255,0.95)" 
              stroke="#333" 
              stroke-width="1"
      />
      <text x="${dimensions/2}" y="${dimensions/2-2}" 
            text-anchor="middle" 
            font-size="${size === 'small' ? 7 : 8}" 
            font-weight="bold" 
            fill="#333"
      >${total}</text>
      <text x="${dimensions/2}" y="${dimensions/2+6}" 
            text-anchor="middle" 
            font-size="${size === 'small' ? 5 : 6}" 
            fill="#666"
      >sekolah</text>
    </svg>
  `;
  
  return new L.DivIcon({
    html: svgIcon,
    iconSize: [dimensions, dimensions],
    iconAnchor: [dimensions/2, dimensions/2],
    popupAnchor: [0, -dimensions/2],
    className: 'custom-kecamatan-icon'
  });
};

// Fixed default icon with proper CDN URLs
const defaultIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// ========== FACILITY HELPERS ==========
const getFacilityColor = (facility) => {
  if (!facility) return FACILITY_COLORS.default;
  
  if (typeof facility === 'object') {
    if (facility.rusakBerat > 0 || facility.rusak_berat > 0 || facility.heavily_damaged > 0) {
      return FACILITY_COLORS["Rusak Berat"];
    }
    if (facility.rusakSedang > 0 || facility.rusak_sedang > 0 || facility.slightly_damaged > 0) {
      return FACILITY_COLORS["Rusak Sedang"];
    }
    if (facility.baik > 0 || facility.good > 0 || facility.bagus > 0) {
      return FACILITY_COLORS["Rehabilitasi"];
    }
    return FACILITY_COLORS.default;
  }
  
  return FACILITY_COLORS[facility] || FACILITY_COLORS.default;
};

const getFacilityStatus = (facility) => {
  if (!facility) return "default";
  
  if (typeof facility === 'object') {
    if (facility.rusakBerat > 0 || facility.rusak_berat > 0 || facility.heavily_damaged > 0) {
      return "Rusak Berat";
    }
    if (facility.rusakSedang > 0 || facility.rusak_sedang > 0 || facility.slightly_damaged > 0) {
      return "Rusak Sedang";
    }
    if (facility.baik > 0 || facility.good > 0 || facility.bagus > 0) {
      return "Rehabilitasi";
    }
    return "default";
  }
  
  return facility in FACILITY_COLORS ? facility : "default";
};

const getFacilityText = (facility) => {
  if (typeof facility === 'object') {
    const baik = facility.baik || facility.good || facility.bagus || 0;
    const rusakSedang = facility.rusakSedang || facility.rusak_sedang || facility.slightly_damaged || 0;
    const rusakBerat = facility.rusakBerat || facility.rusak_berat || facility.heavily_damaged || 0;
    return `Baik: ${baik}, Rusak Sedang: ${rusakSedang}, Rusak Berat: ${rusakBerat}`;
  }
  return facility;
};

// Enhanced icon cache with responsive sizing
const iconCache = {};
const getIconForFacility = (facility, isMobile = false) => {
  const color = getFacilityColor(facility);
  const size = isMobile ? 'small' : 'normal';
  const cacheKey = `${color}-${size}`;
  
  if (!iconCache[cacheKey]) {
    iconCache[cacheKey] = createFacilityIcon(color, size);
  }
  
  return iconCache[cacheKey];
};

// ========== DATA FORMATTERS ==========
const formatLegacyData = (rawData, jenjang) => {
  const result = [];
  
  Object.entries(rawData).forEach(([kecamatan, schools]) => {
    schools.forEach((school) => {
      if (school.coordinates?.length === 2) {
        const lat = parseFloat(school.coordinates[0]);
        const lng = parseFloat(school.coordinates[1]);
        
        if (isValidCoordinate(lat, lng)) {
          result.push({
            nama: school.name,
            npsn: school.npsn,
            alamat: school.address,
            kecamatan,
            desa: school.desa || "",
            kabupaten: school.kabupaten || "Garut",
            lintang: lat,
            bujur: lng,
            jenjang,
            fasilitas: school.fasilitas || null,
          });
        }
      }
    });
  });
  
  return result;
};

const formatSchoolsData = (schoolsArray) => {
  return schoolsArray
    .map(school => {
      const lat = parseFloat(
        school.latitude || school.lat || school.lintang || school.koordinat?.lat || 0
      );
      const lng = parseFloat(
        school.longitude || school.lng || school.bujur || school.koordinat?.lng || 0
      );
      
      return {
        nama: school.namaSekolah || school.nama_sekolah || school.school_name || school.nama || 'Unknown',
        npsn: school.npsn || school.school_id || school.id || '',
        alamat: school.alamat || school.address || school.alamat_sekolah || '',
        kecamatan: school.kecamatan || school.kec || school.kecamatan_nama || school.subdistrict || '',
        desa: school.desa || school.kelurahan || school.desa_kelurahan || school.village || '',
        kabupaten: school.kabupaten || school.kab || school.kabupaten_nama || school.regency || 'Garut',
        lintang: lat,
        bujur: lng,
        jenjang: school.jenjang || school.tingkat_pendidikan || school.level || school.bentuk_pendidikan || 'Unknown',
        fasilitas: school.fasilitas || school.kondisiKelas || school.kondisi_ruang_kelas || null,
      };
    })
    .filter(school => isValidCoordinate(school.lintang, school.bujur));
};

// ========== RESPONSIVE HOOK ==========
const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsMobile(width <= 480);
      setIsTablet(width > 480 && width <= 768);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);
  
  return { isMobile, isTablet };
};

// ========== POPUP COMPONENTS ==========
const SchoolPopup = React.memo(({ school, getDetailedAddress, isMobile }) => {
  const [detailAddress, setDetailAddress] = useState(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  const needsGeocoding = !school.desa || !school.kecamatan || !school.kabupaten;
  const facilityStatus = getFacilityStatus(school.fasilitas);
  const facilityColor = getFacilityColor(school.fasilitas);

  useEffect(() => {
    if (needsGeocoding) {
      const loadAddress = async () => {
        setIsLoadingAddress(true);
        try {
          const address = await getDetailedAddress(school);
          setDetailAddress(address);
        } catch (error) {
          console.error("Error loading address:", error);
        } finally {
          setIsLoadingAddress(false);
        }
      };
      loadAddress();
    }
  }, [school, needsGeocoding, getDetailedAddress]);

  const popupStyles = {
    container: {
      minWidth: isMobile ? '200px' : '250px',
      maxWidth: isMobile ? '280px' : '350px',
      fontSize: isMobile ? '0.85em' : '1em'
    },
    title: {
      fontSize: isMobile ? '1em' : '1.1em',
      color: '#2c3e50',
      marginBottom: '8px'
    },
    section: {
      marginTop: isMobile ? '6px' : '8px',
      padding: isMobile ? '8px' : '10px',
      backgroundColor: '#f8f9fa',
      borderRadius: '6px',
      border: `2px solid ${facilityColor}`
    },
    indicator: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '6px'
    },
    circle: {
      display: 'inline-block',
      width: isMobile ? 16 : 20,
      height: isMobile ? 16 : 20,
      borderRadius: '50%',
      background: facilityColor,
      marginRight: '8px',
      border: '2px solid #fff',
      boxShadow: '0 0 0 1px #ccc'
    }
  };

  return (
    <div style={popupStyles.container}>
      <strong style={popupStyles.title}>
        {school.nama}
      </strong>
      
      <div style={{ marginTop: 8 }}>
        <strong>Jenjang:</strong> 
        <span style={{ color: '#3498db' }}> {school.jenjang}</span>
      </div>
      
      {school.alamat && (
        <div style={{ marginTop: 4 }}>
          <strong>Alamat:</strong> {school.alamat}
        </div>
      )}
      
      <div style={popupStyles.section}>
        <div style={popupStyles.indicator}>
          <span style={popupStyles.circle}></span>
          <strong style={{ color: facilityColor }}>
            {FACILITY_LABELS[facilityStatus]}
          </strong>
        </div>
        
        {school.fasilitas && (
          <div style={{ 
            fontSize: isMobile ? '0.8em' : '0.9em',
            color: '#555',
            backgroundColor: 'rgba(255,255,255,0.8)',
            padding: isMobile ? '4px' : '6px',
            borderRadius: '4px',
            marginTop: '4px'
          }}>
            <strong>Detail Kondisi:</strong><br/>
            {getFacilityText(school.fasilitas)}
          </div>
        )}
      </div>
      
      <div style={{ 
        marginTop: 8, 
        padding: isMobile ? '6px' : '8px',
        backgroundColor: '#f8f9fa', 
        borderRadius: '4px', 
        fontSize: isMobile ? '0.8em' : '0.9em'
      }}>
        <strong style={{ color: '#34495e' }}>Lokasi Administratif:</strong>
        
        {school.desa ? (
          <div><strong>Desa/Kelurahan:</strong> {school.desa}</div>
        ) : isLoadingAddress ? (
          <div><strong>Desa/Kelurahan:</strong> <em>Memuat...</em></div>
        ) : detailAddress?.village && (
          <div>
            <strong>Desa/Kelurahan:</strong> {detailAddress.village} 
            <span style={{ color: '#e67e22', fontSize: '0.8em' }}> (geocode)</span>
          </div>
        )}
        
        {school.kecamatan && (
          <div><strong>Kecamatan:</strong> {school.kecamatan}</div>
        )}
        
        {school.kabupaten && (
          <div><strong>Kab/Kota:</strong> {school.kabupaten}</div>
        )}
      </div>
      
      <div style={{ marginTop: 4, fontSize: isMobile ? '0.8em' : '0.9em', color: '#666' }}>
        {school.npsn && (
          <><strong>NPSN:</strong> {school.npsn}<br /></>
        )}
        <strong>Koordinat:</strong> {school.lintang.toFixed(6)}, {school.bujur.toFixed(6)}
      </div>
    </div>
  );
});

SchoolPopup.displayName = 'SchoolPopup';

const KecamatanPopup = React.memo(({ kecamatanName, stats, isMobile }) => {
  const percentages = useMemo(() => ({
    baik: ((stats.baik / stats.total) * 100).toFixed(1),
    rusakSedang: ((stats.rusakSedang / stats.total) * 100).toFixed(1),
    rusakBerat: ((stats.rusakBerat / stats.total) * 100).toFixed(1),
    noData: ((stats.noData / stats.total) * 100).toFixed(1)
  }), [stats]);

  const jenjangCounts = useMemo(() => {
    return stats.schools.reduce((acc, school) => {
      acc[school.jenjang] = (acc[school.jenjang] || 0) + 1;
      return acc;
    }, {});
  }, [stats.schools]);

  return (
    <div style={{ 
      minWidth: isMobile ? '200px' : '280px',
      maxWidth: isMobile ? '300px' : '350px',
      fontSize: isMobile ? '0.85em' : '1em'
    }}>
      <strong style={{ 
        fontSize: isMobile ? '1.1em' : '1.2em',
        color: '#2c3e50' 
      }}>
        Kecamatan {kecamatanName}
      </strong>
      
      <div style={{ 
        marginTop: 10, 
        padding: isMobile ? '6px' : '8px',
        backgroundColor: '#ecf0f1', 
        borderRadius: '4px' 
      }}>
        <strong>Total Sekolah: {stats.total}</strong>
      </div>
      
      <div style={{ marginTop: 8 }}>
        <strong style={{ color: '#34495e' }}>Kondisi Fasilitas:</strong>
      </div>
      
      <div style={{ marginTop: 4, fontSize: isMobile ? '0.8em' : '0.9em' }}>
        {[
          { key: 'baik', label: 'Kondisi Baik', color: '#198754' },
          { key: 'rusakSedang', label: 'Rusak Sedang', color: '#fd7e14' },
          { key: 'rusakBerat', label: 'Rusak Berat', color: '#dc3545' },
          { key: 'noData', label: 'Tanpa Data', color: '#6c757d' }
        ].map(({ key, label, color }) => (
          stats[key] > 0 && (
            <div key={key} style={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
              <span style={{
                display: 'inline-block',
                width: isMobile ? 10 : 12,
                height: isMobile ? 10 : 12,
                borderRadius: '50%',
                background: color,
                marginRight: '6px'
              }}></span>
              <span>{label}: <strong>{stats[key]}</strong> ({percentages[key]}%)</span>
            </div>
          )
        ))}
      </div>
      
      {!isMobile && (
        <div style={{ 
          marginTop: 8, 
          padding: 6,
          backgroundColor: '#f8f9fa', 
          borderRadius: '4px', 
          fontSize: '0.85em' 
        }}>
          <strong>Detail Jenjang:</strong>
          {Object.entries(jenjangCounts).map(([jenjang, count]) => (
            <div key={jenjang}>• {jenjang}: {count} sekolah</div>
          ))}
        </div>
      )}
    </div>
  );
});

KecamatanPopup.displayName = 'KecamatanPopup';

// ========== MAP COMPONENTS ==========
const SafeGeoJSON = React.memo(({ data, style }) => {
  const safeOnEachFeature = useCallback((feature, layer) => {
    try {
      if (feature.properties) {
        const name = feature.properties.name || 
                    feature.properties.district || 
                    feature.properties.village || 
                    'Unknown';
        layer.bindPopup(name);
      }
    } catch (e) {
      console.warn("GeoJSON feature error", e);
    }
  }, []);
  
  return (
    <GeoJSON 
      data={data} 
      style={style} 
      onEachFeature={safeOnEachFeature}
      key={JSON.stringify(data)}
    />
  );
});

SafeGeoJSON.displayName = 'SafeGeoJSON';

const Legend = React.memo(({ filteredCount, visibleCount, schools, isMobile }) => {
  const map = useMap();
  
  const facilityStats = useMemo(() => {
    const stats = {
      "Rusak Berat": 0,
      "Rusak Sedang": 0,
      "Kekurangan RKB": 0,
      "Rehabilitasi": 0,
      "Pembangunan RKB": 0,
      "default": 0
    };

    schools.forEach(school => {
      const status = getFacilityStatus(school.fasilitas);
      stats[status] = (stats[status] || 0) + 1;
    });

    return stats;
  }, [schools]);
  
  useEffect(() => {
    const legend = L.control({ position: "bottomright" });
    
    legend.onAdd = () => {
      const div = L.DomUtil.create("div", styles.legend);
      
      const facilityRows = Object.entries(facilityStats)
        .filter(([_, count]) => count > 0)
        .map(([status, count]) => {
          const color = FACILITY_COLORS[status];
          const label = FACILITY_LABELS[status];
          const percentage = ((count / filteredCount) * 100).toFixed(1);
          
          return `
            <div style="display: flex; align-items: center; margin: ${isMobile ? '1px' : '2px'} 0;">
              <span style="background:${color}; width:${isMobile ? '10px' : '12px'}; height:${isMobile ? '10px' : '12px'}; display:inline-block; margin-right:5px; border-radius:50%; border: 1px solid #ccc;"></span>
              <span style="font-size: ${isMobile ? '9px' : '11px'};">${isMobile ? label.substring(0, 15) + (label.length > 15 ? '...' : '') : label}: <strong>${count}</strong> (${percentage}%)</span>
            </div>
          `;
        }).join('');
      
      div.innerHTML = `
        <h4 style="font-size: ${isMobile ? '11px' : '14px'};">Keterangan</h4>
        <div style="margin-bottom: ${isMobile ? '4px' : '8px'};"><strong>Kondisi Fasilitas:</strong></div>
        ${facilityRows}
        ${!isMobile ? `
        <div style="margin-top:8px;"><strong>Marker Kecamatan:</strong></div>
        <div style="display: flex; align-items: center; margin-top: 4px;">
          <div style="width: 20px; height: 20px; border-radius: 50%; background: #198754; border: 2px solid #fff; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #fff; margin-right: 5px;">N</div>
          <span style="font-size: 11px;">Akumulasi fasilitas sekolah</span>
        </div>
        ` : ''}
        <div style="margin-top:${isMobile ? '4px' : '8px'}; font-size:${isMobile ? '8px' : '11px'}; color:#666;">
          Total: ${filteredCount} sekolah<br/>
          Ditampilkan: ${visibleCount} sekolah<br/>
          <span style="color:#e74c3c;">📍 Area: Kabupaten Garut</span><br/>
          <span style="color:#3498db; font-style: italic;">🔄 Data diperbarui otomatis</span>
        </div>
      `;
      return div;
    };
    
    legend.addTo(map);
    
    return () => {
      try {
        legend.remove();
      } catch (e) {
        console.warn("Error removing legend:", e);
      }
    };
  }, [map, filteredCount, visibleCount, facilityStats, isMobile]);
  
  return null;
});

Legend.displayName = 'Legend';

const MapEventHandler = React.memo(({ onBoundsChange }) => {
  const map = useMapEvents({
    moveend: () => {
      onBoundsChange(map);
    },
    zoomend: () => {
      onBoundsChange(map);
    },
    ready: () => {
      console.log("Map is ready");
      setTimeout(() => onBoundsChange(map), 300);
    }
  });

  return null;
});

MapEventHandler.displayName = 'MapEventHandler';

// ========== STABLE MARKER COMPONENT ==========
const StableMarker = React.memo(({ school, index, markerIcon, getDetailedAddress, isMobile }) => {
  const stableKey = useMemo(() => 
    `${school.npsn || 'unknown'}-${school.nama}-${school.lintang}-${school.bujur}`, 
    [school.npsn, school.nama, school.lintang, school.bujur]
  );

  if (!isValidCoordinate(school.lintang, school.bujur)) {
    return null;
  }

  return (
    <Marker 
      key={stableKey}
      position={[school.lintang, school.bujur]} 
      icon={markerIcon}
      eventHandlers={{
        click: (e) => {
          e.originalEvent?.stopPropagation();
        }
      }}
    >
      <Popup 
        maxWidth={isMobile ? 320 : 400}
        closeButton={true}
        autoClose={true}
        closeOnClick={false}
        keepInView={true}
        autoPan={true}
        autoPanPadding={[5, 5]}
      >
        <SchoolPopup school={school} getDetailedAddress={getDetailedAddress} isMobile={isMobile} />
      </Popup>
    </Marker>
  );
});

StableMarker.displayName = 'StableMarker';

const StableKecamatanMarker = React.memo(({ kecamatanName, stats, center, isMobile }) => {
  const map = useMap();
  const [shouldShow, setShouldShow] = useState(true);
  
  useEffect(() => {
    const handleZoom = () => {
      const currentZoom = map.getZoom();
      setShouldShow(currentZoom <= (isMobile ? 11 : 12));
    };
    
    handleZoom();
    map.on('zoomend', handleZoom);
    
    return () => {
      map.off('zoomend', handleZoom);
    };
  }, [map, isMobile]);

  const stableKey = useMemo(() => 
    `kecamatan-${kecamatanName}-${center.lat}-${center.lng}`, 
    [kecamatanName, center.lat, center.lng]
  );

  if (!shouldShow) {
    return null;
  }

  return (
    <Marker
      key={stableKey}
      position={[center.lat, center.lng]}
      icon={createKecamatanIcon(stats, isMobile ? 'small' : 'normal')}
      eventHandlers={{
        click: (e) => {
          e.originalEvent?.stopPropagation();
        }
      }}
    >
      <Popup
        closeButton={true}
        autoClose={false}
        closeOnClick={false}
        keepInView={true}
        autoPan={true}
        autoPanPadding={[5, 5]}
        maxWidth={isMobile ? 320 : 400}
      >
        <KecamatanPopup kecamatanName={kecamatanName} stats={stats} isMobile={isMobile} />
      </Popup>
    </Marker>
  );
});

StableKecamatanMarker.displayName = 'StableKecamatanMarker';

// ========== MAIN COMPONENT ==========
const Map = ({ filter, schools = [] }) => {
  // Responsive hook
  const { isMobile, isTablet } = useResponsive();
  
  // State
  const [allSchools, setAllSchools] = useState([]);
  const [filteredSchools, setFilteredSchools] = useState([]);
  const [visibleSchools, setVisibleSchools] = useState([]);
  const [geoKecamatan, setGeoKecamatan] = useState(null);
  const [geoDesa, setGeoDesa] = useState(null);
  const [kecamatanStats, setKecamatanStats] = useState({});
  const [kecamatanCenters, setKecamatanCenters] = useState({});
  const [addressCache, setAddressCache] = useState({});
  const [isMapReady, setIsMapReady] = useState(false);
  
  // Refs
  const mapRef = useRef();
  const boundsUpdateTimeoutRef = useRef();

  // Responsive performance limits
  const responsivePerformanceLimits = useMemo(() => ({
    maxVisibleMarkers: isMobile ? 200 : isTablet ? 350 : 500,
    initialDisplayLimit: isMobile ? 100 : isTablet ? 150 : 200,
    boundsUpdateDelay: isMobile ? 500 : 300
  }), [isMobile, isTablet]);

  // ========== UTILITY HOOKS ==========
  const calculateKecamatanCenters = useCallback((geoData) => {
    const centers = {};
    
    if (geoData?.features) {
      geoData.features.forEach(feature => {
        const kecamatanName = feature.properties?.district || 
                             feature.properties?.KECAMATAN || 
                             feature.properties?.kecamatan || 
                             feature.properties?.name;
        
        if (kecamatanName && feature.geometry) {
          const coordinates = feature.geometry.coordinates;
          let totalLat = 0, totalLng = 0, pointCount = 0;
          
          const processCoordinates = (coords) => {
            if (Array.isArray(coords[0])) {
              coords.forEach(processCoordinates);
            } else {
              totalLng += coords[0];
              totalLat += coords[1];
              pointCount++;
            }
          };
          
          processCoordinates(coordinates);
          
          if (pointCount > 0) {
            const centerLat = totalLat / pointCount;
            const centerLng = totalLng / pointCount;
            
            if (isWithinGarutBounds(centerLat, centerLng)) {
              centers[kecamatanName] = {
                lat: centerLat,
                lng: centerLng
              };
            }
          }
        }
      });
    }
    
    return centers;
  }, []);

  const calculateKecamatanStats = useCallback((schoolsData) => {
    const stats = {};
    
    schoolsData.forEach(school => {
      const kec = school.kecamatan;
      if (!kec) return;
      
      if (!stats[kec]) {
        stats[kec] = {
          total: 0,
          baik: 0,
          rusakSedang: 0,
          rusakBerat: 0,
          noData: 0,
          schools: []
        };
      }
      
      stats[kec].total++;
      stats[kec].schools.push(school);
      
      if (!school.fasilitas) {
        stats[kec].noData++;
        return;
      }
      
      if (typeof school.fasilitas === 'object') {
        if (school.fasilitas.rusakBerat > 0 || school.fasilitas.rusak_berat > 0 || school.fasilitas.heavily_damaged > 0) {
          stats[kec].rusakBerat++;
        } else if (school.fasilitas.rusakSedang > 0 || school.fasilitas.rusak_sedang > 0 || school.fasilitas.slightly_damaged > 0) {
          stats[kec].rusakSedang++;
        } else if (school.fasilitas.baik > 0 || school.fasilitas.good > 0 || school.fasilitas.bagus > 0) {
          stats[kec].baik++;
        } else {
          stats[kec].noData++;
        }
      } else {
        if (school.fasilitas === "Rusak Berat") {
          stats[kec].rusakBerat++;
        } else if (school.fasilitas === "Rusak Sedang") {
          stats[kec].rusakSedang++;
        } else if (school.fasilitas === "Rehabilitasi") {
          stats[kec].baik++;
        } else {
          stats[kec].noData++;
        }
      }
    });
    
    return stats;
  }, []);

  const getDetailedAddress = useCallback(async (school) => {
    const cacheKey = `${school.lintang}-${school.bujur}`;
    
    if (addressCache[cacheKey]) {
      return addressCache[cacheKey];
    }
    
    const detailAddress = await reverseGeocode(school.lintang, school.bujur);
    
    if (detailAddress) {
      setAddressCache(prev => ({
        ...prev,
        [cacheKey]: detailAddress
      }));
    }
    
    return detailAddress;
  }, [addressCache]);

  const updateVisibleMarkers = useCallback((map) => {
    if (!map || !isMapReady || filteredSchools.length === 0) {
      return;
    }
    
    try {
      if (boundsUpdateTimeoutRef.current) {
        clearTimeout(boundsUpdateTimeoutRef.current);
      }

      boundsUpdateTimeoutRef.current = setTimeout(() => {
        try {
          const bounds = map.getBounds();
          
          if (!bounds) {
            console.warn("No map bounds available");
            return;
          }

          const visible = filteredSchools.filter((school) => {
            if (!isValidCoordinate(school.lintang, school.bujur)) {
              return false;
            }

            try {
              return bounds.contains([school.lintang, school.bujur]);
            } catch (e) {
              console.warn("Error checking bounds for school:", school.nama, e);
              return false;
            }
          });
          
          const limitedVisible = visible.slice(0, responsivePerformanceLimits.maxVisibleMarkers);
          console.log(`Visible schools: ${limitedVisible.length} out of ${filteredSchools.length}`);
          setVisibleSchools(limitedVisible);
          
        } catch (error) {
          console.warn("Error in bounds timeout:", error);
        }
      }, responsivePerformanceLimits.boundsUpdateDelay);
      
    } catch (error) {
      console.warn("Error updating visible markers:", error);
    }
  }, [filteredSchools, isMapReady, responsivePerformanceLimits]);

  // ========== DATA LOADING EFFECTS ==========
  useEffect(() => {
    const loadSchoolData = async () => {
      if (schools && schools.length > 0) {
        console.log("Loading schools from props:", schools.length);
        const formattedSchools = formatSchoolsData(schools);
        console.log("Formatted schools (within Garut bounds):", formattedSchools.length);
        setAllSchools(formattedSchools);
        return;
      }

      try {
        const [paudRes, sdRes, smpRes, pkbmRes, kecRes, desaRes] = await Promise.all([
          fetch(API_ENDPOINTS.paud).then(r => r.json()),
          fetch(API_ENDPOINTS.sd).then(r => r.json()),
          fetch(API_ENDPOINTS.smp).then(r => r.json()),
          fetch(API_ENDPOINTS.pkbm).then(r => r.json()),
          fetch(API_ENDPOINTS.kecamatan).then(r => r.json()),
          fetch(API_ENDPOINTS.desa).then(r => r.json())
        ]);

        const allSchoolsData = [
          ...formatLegacyData(paudRes, "PAUD"),
          ...formatLegacyData(sdRes, "SD"),
          ...formatLegacyData(smpRes, "SMP"),
          ...formatLegacyData(pkbmRes, "PKBM")
        ];
        
        console.log("Loaded schools from API (within Garut bounds):", allSchoolsData.length);
        setAllSchools(allSchoolsData);
        setFilteredSchools(allSchoolsData);
        setVisibleSchools(allSchoolsData.slice(0, responsivePerformanceLimits.initialDisplayLimit));
        setGeoKecamatan(kecRes);
        setGeoDesa(desaRes);
      } catch (error) {
        console.error("Error loading school data:", error);
        setAllSchools([]);
      }
    };

    loadSchoolData();
  }, [schools]);

  useEffect(() => {
    const loadGeoData = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.kecamatan);
        const data = await response.json();
        
        const safeData = {
          ...data,
          features: data.features.filter((f) => f.geometry?.coordinates),
        };
        
        setGeoKecamatan(safeData);
        
        const centers = calculateKecamatanCenters(safeData);
        setKecamatanCenters(centers);
      } catch (error) {
        console.error("Error loading kecamatan data:", error);
        setGeoKecamatan(null);
      }
    };

    loadGeoData();
  }, [calculateKecamatanCenters]);

  useEffect(() => {
    const loadDesaData = async () => {
      if (filter?.kecamatan && 
          filter.kecamatan !== "all" && 
          filter.kecamatan !== "Semua Kecamatan") {
        
        try {
          const response = await fetch(API_ENDPOINTS.desa);
          const data = await response.json();
          
          const desaFiltered = {
            ...data,
            features: data.features
              .filter((f) => f.geometry?.coordinates)
              .filter((f) => {
                const kecamatan = f.properties?.district || 
                               f.properties?.KECAMATAN || 
                               f.properties?.kecamatan || 
                               f.properties?.kec || 
                               f.properties?.NAMKEC || 
                               f.properties?.kecamatan_nama;
                return kecamatan === filter.kecamatan;
              }),
          };
          
          setGeoDesa(desaFiltered);
        } catch (error) {
          console.error("Error loading desa data:", error);
          setGeoDesa(null);
        }
      } else {
        setGeoDesa(null);
      }
    };

    loadDesaData();
  }, [filter?.kecamatan]);

  // ========== DATA PROCESSING EFFECTS ==========
  useEffect(() => {
    if (allSchools.length > 0) {
      const stats = calculateKecamatanStats(allSchools);
      setKecamatanStats(stats);
    }
  }, [allSchools, calculateKecamatanStats]);

  const memoizedFilteredSchools = useMemo(() => {
    let filtered = allSchools;

    if (filter?.jenjang && 
        filter.jenjang !== "all" && 
        filter.jenjang !== "Semua Jenjang") {
      filtered = filtered.filter((s) => s.jenjang === filter.jenjang);
    }
    
    if (filter?.kecamatan && 
        filter.kecamatan !== "all" && 
        filter.kecamatan !== "Semua Kecamatan") {
      filtered = filtered.filter((s) => s.kecamatan === filter.kecamatan);
    }
    
    if (filter?.desa && 
        filter.desa !== "all" && 
        filter.desa !== "Semua Desa") {
      filtered = filtered.filter((s) => s.desa === filter.desa);
    }

    return filtered;
  }, [filter, allSchools]);

  useEffect(() => {
    setFilteredSchools(memoizedFilteredSchools);
  }, [memoizedFilteredSchools]);

  useEffect(() => {
    if (filteredSchools.length > 0 && isMapReady) {
      console.log("FilteredSchools changed:", filteredSchools.length);
      
      setVisibleSchools(filteredSchools.slice(0, responsivePerformanceLimits.initialDisplayLimit));
      
      if (mapRef.current) {
        const map = mapRef.current;
        if (map.getBounds) {
          setTimeout(() => updateVisibleMarkers(map), 500);
        }
      }
    } else if (filteredSchools.length === 0) {
      setVisibleSchools([]);
    }
  }, [filteredSchools, updateVisibleMarkers, isMapReady, responsivePerformanceLimits]);

  // ========== CLEANUP ==========
  useEffect(() => {
    return () => {
      if (boundsUpdateTimeoutRef.current) {
        clearTimeout(boundsUpdateTimeoutRef.current);
      }
    };
  }, []);

  // ========== RENDER HELPERS ==========
  const renderKecamatanMarkers = () => {
    return Object.entries(kecamatanStats).map(([kecamatanName, stats]) => {
      const center = kecamatanCenters[kecamatanName];
      
      const shouldShow = center && 
                        (!filter?.kecamatan || 
                         filter.kecamatan === "all" || 
                         filter.kecamatan === "Semua Kecamatan");
      
      if (!shouldShow) {
        return null;
      }

      return (
        <StableKecamatanMarker 
          key={`kecamatan-${kecamatanName}`}
          kecamatanName={kecamatanName}
          stats={stats}
          center={center}
          isMobile={isMobile}
        />
      );
    });
  };

  const renderSchoolMarkers = () => {
    return visibleSchools.map((school, index) => {
      const markerIcon = school.fasilitas ? 
        getIconForFacility(school.fasilitas, isMobile) : 
        defaultIcon;
      
      return (
        <StableMarker
          key={`school-${school.npsn || 'unknown'}-${index}`}
          school={school}
          index={index}
          markerIcon={markerIcon}
          getDetailedAddress={getDetailedAddress}
          isMobile={isMobile}
        />
      );
    });
  };

  // ========== STYLES ==========
  const kecamatanStyle = useMemo(() => ({ 
    color: "#555", 
    weight: isMobile ? 0.5 : 1,
    fillOpacity: 0.05 
  }), [isMobile]);
  
  const desaStyle = useMemo(() => ({ 
    color: "#aaa", 
    weight: isMobile ? 0.3 : 0.5,
    fillOpacity: 0.02 
  }), [isMobile]);

  // Responsive map height
  const mapHeight = useMemo(() => {
    if (isMobile) return "70vh";
    if (isTablet) return "80vh";
    return "100vh";
  }, [isMobile, isTablet]);

  // ========== RENDER ==========
  return (
    <div className={styles.mapWrapper} style={{ height: mapHeight }}>
      <MapContainer
        center={GARUT_CENTER}
        zoom={isMobile ? 10 : 11}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
        ref={mapRef}
        whenReady={() => {
          console.log("MapContainer ready");
          setIsMapReady(true);
          setTimeout(() => {
            if (filteredSchools.length > 0) {
              setVisibleSchools(filteredSchools.slice(0, responsivePerformanceLimits.initialDisplayLimit));
            }
          }, 1000);
        }}
        closePopupOnClick={false}
        attributionControl={!isMobile}
        zoomControl={!isMobile}
      >
        <TileLayer 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution={isMobile ? '' : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
        />
        
        {geoKecamatan && (
          <SafeGeoJSON data={geoKecamatan} style={kecamatanStyle} />
        )}
        {geoDesa && (
          <SafeGeoJSON data={geoDesa} style={desaStyle} />
        )}
        
        {isMapReady && renderKecamatanMarkers()}
        
        {isMapReady && (
          <MarkerClusterGroup 
            chunkedLoading 
            maxClusterRadius={isMobile ? 30 : 40}
            disableClusteringAtZoom={isMobile ? 14 : 15}
            spiderfyOnMaxZoom={true}
            showCoverageOnHover={!isMobile}
            zoomToBoundsOnClick={true}
            iconCreateFunction={(cluster) => {
              const count = cluster.getChildCount();
              const size = count < 10 ? 'small' : count < 100 ? 'medium' : 'large';
              const dimensions = isMobile ? 
                { small: 20, medium: 30, large: 40 } :
                { small: 30, medium: 40, large: 50 };
              
              return L.divIcon({
                html: `<div style="background: #3498db; color: white; border-radius: 50%; width: ${dimensions[size]}px; height: ${dimensions[size]}px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: ${isMobile ? '10px' : '12px'}; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">${count}</div>`,
                className: 'custom-cluster-icon',
                iconSize: [dimensions[size], dimensions[size]]
              });
            }}
          >
            {renderSchoolMarkers()}
          </MarkerClusterGroup>
        )}
        
        <MapEventHandler onBoundsChange={updateVisibleMarkers} />
        {isMapReady && (
          <Legend 
            filteredCount={filteredSchools.length} 
            visibleCount={visibleSchools.length}
            schools={filteredSchools}
            isMobile={isMobile}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default Map;