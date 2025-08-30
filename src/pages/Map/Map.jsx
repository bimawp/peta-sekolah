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
import styles from './Map.module.css';

// Fix default Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ========== CONSTANTS ==========
const GARUT_BOUNDS = {
  minLat: -8.0,
  maxLat: -6.5,
  minLng: 107.0,
  maxLng: 108.5
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

// ========== UTILITY FUNCTIONS ==========
const isWithinGarutBounds = (lat, lng) => {
  return lat >= GARUT_BOUNDS.minLat && 
         lat <= GARUT_BOUNDS.maxLat && 
         lng >= GARUT_BOUNDS.minLng && 
         lng <= GARUT_BOUNDS.maxLng;
};

const isValidCoordinate = (lat, lng) => {
  return !isNaN(lat) && !isNaN(lng) && 
         lat !== 0 && lng !== 0 &&
         lat >= -90 && lat <= 90 && 
         lng >= -180 && lng <= 180;
};

const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// ========== FACILITY ANALYSIS ==========
const analyzeFacilityCondition = (school) => {
  const classCondition = school.class_condition || school.kondisi_ruang_kelas || {};
  const toilets = school.toilets || school.toilet || {};
  const library = school.library || school.perpustakaan || {};
  const laboratory = school.laboratory || school.laboratory_comp || school.lab || {};
  
  if (school.fasilitas) {
    if (typeof school.fasilitas === 'string') {
      return school.fasilitas;
    }
    if (typeof school.fasilitas === 'object') {
      const facility = school.fasilitas;
      if (facility.rusakBerat > 0 || facility.rusak_berat > 0) return "Rusak Berat";
      if (facility.rusakSedang > 0 || facility.rusak_sedang > 0) return "Rusak Sedang"; 
      if (facility.kekurangan > 0 || facility.lacking_rkb > 0) return "Kekurangan RKB";
      if (facility.baik > 0 || facility.good > 0) return "Rehabilitasi";
    }
  }
  
  let totalRooms = 0;
  let goodRooms = 0;
  let moderateDamage = 0;
  let heavyDamage = 0;
  let lacking = 0;

  if (classCondition.total_room || classCondition.total) {
    const total = Number(classCondition.total_room || classCondition.total) || 0;
    totalRooms += total;
    goodRooms += Number(classCondition.classrooms_good || classCondition.baik || classCondition.good) || 0;
    moderateDamage += Number(classCondition.classrooms_moderate_damage || classCondition.rusak_sedang || classCondition.moderate_damage) || 0;
    heavyDamage += Number(classCondition.classrooms_heavy_damage || classCondition.rusak_berat || classCondition.heavy_damage) || 0;
    lacking += Number(classCondition.lacking_rkb || classCondition.kekurangan) || 0;
  }

  const toiletTotal = Number(toilets.total || toilets.available || toilets.jumlah) || 0;
  if (toiletTotal > 0) {
    totalRooms += toiletTotal;
    goodRooms += Number(toilets.good || toilets.baik) || 0;
    moderateDamage += Number(toilets.moderate_damage || toilets.rusak_sedang) || 0;
    heavyDamage += Number(toilets.heavy_damage || toilets.rusak_berat) || 0;
  }

  const libTotal = Number(library.total || library.total_all || library.jumlah) || 0;
  if (libTotal > 0) {
    totalRooms += libTotal;
    goodRooms += Number(library.good || library.baik) || 0;
    moderateDamage += Number(library.moderate_damage || library.rusak_sedang) || 0;
    heavyDamage += Number(library.heavy_damage || library.rusak_berat) || 0;
  }

  const labTotal = Number(laboratory.total || laboratory.total_all || laboratory.jumlah) || 0;
  if (labTotal > 0) {
    totalRooms += labTotal;
    goodRooms += Number(laboratory.good || laboratory.baik) || 0;
    moderateDamage += Number(laboratory.moderate_damage || laboratory.rusak_sedang) || 0;
    heavyDamage += Number(laboratory.heavy_damage || laboratory.rusak_berat) || 0;
  }

  if (heavyDamage > 0) return "Rusak Berat";
  if (lacking > 0) return "Kekurangan RKB";
  if (moderateDamage > 0) return "Rusak Sedang";
  if (goodRooms > 0) return "Rehabilitasi";
  if (totalRooms > 0) return "Rehabilitasi";
  
  return "default";
};

const generateFacilityDetails = (school) => {
  const details = [];
  
  const classData = school.class_condition || school.kondisi_ruang_kelas || {};
  if (classData.total_room || classData.total || classData.jumlah) {
    const total = Number(classData.total_room || classData.total || classData.jumlah) || 0;
    
    if (total > 0) {
      const items = [];
      items.push(`Total Ruang: ${total}`);
      
      const good = Number(classData.classrooms_good || classData.baik || classData.good) || 0;
      const moderate = Number(classData.classrooms_moderate_damage || classData.rusak_sedang || classData.moderate_damage) || 0;
      const heavy = Number(classData.classrooms_heavy_damage || classData.rusak_berat || classData.heavy_damage) || 0;
      const lacking = Number(classData.lacking_rkb || classData.kekurangan) || 0;
      
      if (good > 0) items.push(`Kondisi Baik: ${good}`);
      if (moderate > 0) items.push(`Rusak Sedang: ${moderate}`);
      if (heavy > 0) items.push(`Rusak Berat: ${heavy}`);
      if (lacking > 0) items.push(`Kekurangan RKB: ${lacking}`);
      
      details.push({
        title: "Kondisi Ruang Kelas",
        items: items
      });
    }
  }

  const studentCount = school.student_count || school.jumlah_siswa || 
                      (Number(school.st_male || 0) + Number(school.st_female || 0));
  
  if (studentCount > 0) {
    const items = [`Total: ${studentCount} siswa`];
    
    if (school.st_male && school.st_female) {
      items.push(`Laki-laki: ${school.st_male}`);
      items.push(`Perempuan: ${school.st_female}`);
    }
    
    details.push({
      title: "Jumlah Siswa",
      items: items
    });
  }

  const rombel = school.rombel || school.rombongan_belajar || {};
  if (rombel.total || Object.keys(rombel).length > 0) {
    const items = [];
    
    if (rombel.total) items.push(`Total Rombel: ${rombel.total}`);
    
    if (rombel.kb) items.push(`KB: ${rombel.kb}`);
    if (rombel.tka) items.push(`TK A: ${rombel.tka}`);
    if (rombel.tkb) items.push(`TK B: ${rombel.tkb}`);
    
    Object.keys(rombel).forEach(key => {
      if (key.match(/^\d+$/)) {
        items.push(`Kelas ${key}: ${rombel[key]}`);
      }
    });
    
    if (items.length > 0) {
      details.push({
        title: "Rombongan Belajar",
        items: items
      });
    }
  }

  return {
    condition: analyzeFacilityCondition(school),
    details: details
  };
};

const getFacilityColor = (facility, school = null) => {
  const condition = getFacilityStatus(facility, school);
  return FACILITY_COLORS[condition] || FACILITY_COLORS.default;
};

const getFacilityStatus = (facility, school = null) => {
  if (school) {
    const condition = analyzeFacilityCondition(school);
    return condition;
  }
  
  if (!facility) return "default";
  
  if (typeof facility === 'string') {
    return facility in FACILITY_COLORS ? facility : "default";
  }
  
  if (typeof facility === 'object') {
    if (facility.rusakBerat > 0 || facility.rusak_berat > 0 || facility.heavily_damaged > 0) {
      return "Rusak Berat";
    }
    if (facility.rusakSedang > 0 || facility.rusak_sedang > 0 || facility.slightly_damaged > 0) {
      return "Rusak Sedang";
    }
    if (facility.kekurangan > 0 || facility.lacking_rkb > 0) {
      return "Kekurangan RKB";
    }
    if (facility.baik > 0 || facility.good > 0) {
      return "Rehabilitasi";
    }
  }
  
  return "default";
};

// ========== ICON CREATION ==========
const createFacilityIcon = (color, size = 'normal') => {
  const dimensions = size === 'small' ? { width: 16, height: 26 } : { width: 20, height: 33 };
  const radius = size === 'small' ? 4 : 5;
  
  return new L.DivIcon({
    html: `<div style="
      background: ${color};
      width: ${dimensions.width}px;
      height: ${dimensions.height}px;
      border-radius: 50% 50% 50% 0;
      border: 2px solid #fff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.4);
      transform: rotate(-45deg);
      position: relative;
    ">
      <div style="
        background: white;
        width: ${radius * 2}px;
        height: ${radius * 2}px;
        border-radius: 50%;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(45deg);
        border: 1px solid #333;
      ">
        <div style="
          background: ${color};
          width: ${radius}px;
          height: ${radius}px;
          border-radius: 50%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        "></div>
      </div>
    </div>`,
    iconSize: [dimensions.width, dimensions.height],
    iconAnchor: [dimensions.width/2, dimensions.height],
    popupAnchor: [0, -dimensions.height],
    className: styles.customFacilityIcon
  });
};

const iconCache = {};
const getIconForFacility = (facility, school = null, isMobile = false) => {
  const color = getFacilityColor(facility, school);
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
      let lat, lng;
      
      if (school.coordinates && Array.isArray(school.coordinates) && school.coordinates.length >= 2) {
        lat = parseFloat(school.coordinates[0]);
        lng = parseFloat(school.coordinates[1]);
      } else if (school.lat && school.lng) {
        lat = parseFloat(school.lat);
        lng = parseFloat(school.lng);
      } else if (school.latitude && school.longitude) {
        lat = parseFloat(school.latitude);
        lng = parseFloat(school.longitude);
      }
      
      if (isValidCoordinate(lat, lng)) {
        result.push({
          nama: school.name || school.nama || 'Unknown',
          npsn: school.npsn || school.id || '',
          alamat: school.address || school.alamat || '',
          kecamatan: kecamatan || school.kecamatan || '',
          desa: school.village || school.desa || school.kelurahan || "",
          kabupaten: school.kabupaten || "Garut",
          lintang: lat,
          bujur: lng,
          jenjang,
          fasilitas: school.fasilitas || school.kondisi_fasilitas || null,
          student_count: school.student_count || school.jumlah_siswa,
          st_male: school.st_male || school.siswa_laki,
          st_female: school.st_female || school.siswa_perempuan,
          type: school.type || school.jenis,
          class_condition: school.class_condition || school.kondisi_ruang_kelas,
          rombel: school.rombel || school.rombongan_belajar,
          furniture_computer: school.furniture_computer || school.perabot_komputer,
          furniture: school.furniture || school.perabot,
          teacher: school.teacher || school.guru,
          toilets: school.toilets || school.toilet,
          students_toilet: school.students_toilet,
          teachers_toilet: school.teachers_toilet,
          library: school.library || school.perpustakaan,
          laboratory: school.laboratory,
          laboratory_comp: school.laboratory_comp,
          laboratory_ipa: school.laboratory_ipa,
          laboratory_fisika: school.laboratory_fisika,
          laboratory_biologi: school.laboratory_biologi,
          laboratory_langua: school.laboratory_langua,
          uks: school.uks,
          uks_room: school.uks_room,
          ape: school.ape,
          building_status: school.building_status || school.status_bangunan,
          facilities: school.facilities || school.fasilitas_umum
        });
      }
    });
  });
  
  return result;
};

const formatSchoolsData = (schoolsArray) => {
  return schoolsArray
    .map(school => {
      let lat = parseFloat(
        school.latitude || school.lat || school.lintang || school.koordinat?.lat || 
        (school.coordinates && school.coordinates[0]) || 0
      );
      let lng = parseFloat(
        school.longitude || school.lng || school.bujur || school.koordinat?.lng || 
        (school.coordinates && school.coordinates[1]) || 0
      );
      
      return {
        nama: school.namaSekolah || school.nama_sekolah || school.school_name || school.nama || school.name || 'Unknown',
        npsn: school.npsn || school.school_id || school.id || '',
        alamat: school.alamat || school.address || school.alamat_sekolah || '',
        kecamatan: school.kecamatan || school.kec || school.kecamatan_nama || school.subdistrict || '',
        desa: school.desa || school.kelurahan || school.desa_kelurahan || school.village || '',
        kabupaten: school.kabupaten || school.kab || school.kabupaten_nama || school.regency || 'Garut',
        lintang: lat,
        bujur: lng,
        jenjang: school.jenjang || school.tingkat_pendidikan || school.level || school.bentuk_pendidikan || 'Unknown',
        fasilitas: school.fasilitas || school.kondisiKelas || school.kondisi_ruang_kelas || null,
        student_count: school.student_count,
        st_male: school.st_male,
        st_female: school.st_female,
        type: school.type,
        class_condition: school.class_condition,
        rombel: school.rombel,
        furniture_computer: school.furniture_computer,
        furniture: school.furniture,
        teacher: school.teacher,
        toilets: school.toilets,
        students_toilet: school.students_toilet,
        teachers_toilet: school.teachers_toilet,
        library: school.library,
        laboratory: school.laboratory,
        laboratory_comp: school.laboratory_comp,
        laboratory_ipa: school.laboratory_ipa,
        laboratory_fisika: school.laboratory_fisika,
        laboratory_biologi: school.laboratory_biologi,
        laboratory_langua: school.laboratory_langua,
        uks: school.uks,
        uks_room: school.uks_room,
        ape: school.ape,
        building_status: school.building_status,
        facilities: school.facilities
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
      setIsMobile(width <= 768);
      setIsTablet(width > 768 && width <= 1024);
    };
    
    checkDevice();
    const debouncedCheck = debounce(checkDevice, 100);
    window.addEventListener('resize', debouncedCheck);
    
    return () => window.removeEventListener('resize', debouncedCheck);
  }, []);
  
  return { isMobile, isTablet };
};

// ========== POPUP COMPONENTS ==========
const EnhancedSchoolPopup = React.memo(({ school, isMobile }) => {
  const [showFullDetails, setShowFullDetails] = useState(false);
  
  const facilityAnalysis = useMemo(() => {
    return generateFacilityDetails(school);
  }, [school]);
  
  const facilityStatus = getFacilityStatus(school.fasilitas, school);
  const facilityColor = FACILITY_COLORS[facilityStatus];

  const containerClass = `${styles.popupContainer} ${isMobile ? styles.mobile : styles.desktop}`;
  const titleClass = `${styles.popupTitle} ${isMobile ? styles.mobile : styles.desktop}`;
  const facilitySectionClass = `${styles.facilitySection} ${isMobile ? styles.mobile : styles.desktop}`;
  const circleClass = `${styles.facilityCircle} ${isMobile ? styles.mobile : styles.desktop}`;
  const buttonClass = `${styles.detailToggleButton} ${isMobile ? styles.mobile : styles.desktop}`;
  const hideButtonClass = `${styles.hideDetailButton} ${isMobile ? styles.mobile : styles.desktop}`;
  const locationClass = `${styles.locationSection} ${isMobile ? styles.mobile : styles.desktop}`;
  const coordinatesClass = `${styles.coordinatesSection} ${isMobile ? styles.mobile : styles.desktop}`;

  // Prevent event bubbling that could cause popup to close
  const handleToggleDetails = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    setShowFullDetails(prev => !prev);
  }, []);

  return (
    <div className={containerClass}>
      <div className={titleClass}>
        {school.nama}
      </div>
      
      <div className={styles.schoolInfo}>
        <strong>Jenjang:</strong> 
        <span className={styles.jenjangBadge}>{school.jenjang}</span>
        {school.type && (
          <span className={styles.typeBadge}>({school.type})</span>
        )}
      </div>
      
      {school.alamat && (
        <div className={styles.schoolInfoItem}>
          <strong>Alamat:</strong> {school.alamat}
        </div>
      )}
      
      <div className={facilitySectionClass} style={{ borderColor: facilityColor }}>
        <div className={styles.facilityIndicator}>
          <span className={circleClass} style={{ background: facilityColor }}></span>
          <strong className={styles.facilityStatus} style={{ color: facilityColor }}>
            {FACILITY_LABELS[facilityStatus]}
          </strong>
        </div>
      </div>

      {facilityAnalysis.details.length > 0 && (
        <div className={styles.facilityDetailsSection}>
          <button 
            onClick={handleToggleDetails}
            className={showFullDetails ? hideButtonClass : buttonClass}
            type="button"
          >
            {showFullDetails ? 
              'Sembunyikan Detail' : 
              `Lihat Detail Fasilitas (${facilityAnalysis.details.length} kategori)`
            }
          </button>
          
          {showFullDetails && (
            <div className={styles.detailsContainer}>
              {facilityAnalysis.details.map((detail, index) => (
                <div key={index} className={styles.detailSection}>
                  <div className={`${styles.detailTitle} ${isMobile ? styles.mobile : styles.desktop}`}>
                    {detail.title}
                  </div>
                  {detail.items.map((item, itemIndex) => (
                    <div key={itemIndex} className={`${styles.detailItem} ${isMobile ? styles.mobile : styles.desktop}`}>
                      • {item}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      <div className={locationClass}>
        <div className={styles.locationTitle}>Lokasi:</div>
        
        {school.desa && (
          <div className={styles.locationItem}><strong>Desa/Kel:</strong> {school.desa}</div>
        )}
        {school.kecamatan && (
          <div className={styles.locationItem}><strong>Kecamatan:</strong> {school.kecamatan}</div>
        )}
        {school.kabupaten && (
          <div className={styles.locationItem}><strong>Kabupaten:</strong> {school.kabupaten}</div>
        )}
      </div>
      
      <div className={coordinatesClass}>
        {school.npsn && (
          <><strong>NPSN:</strong> {school.npsn}<br /></>
        )}
        <strong>Koordinat:</strong> {school.lintang.toFixed(6)}, {school.bujur.toFixed(6)}
      </div>
    </div>
  );
});

EnhancedSchoolPopup.displayName = 'EnhancedSchoolPopup';

// ========== MARKER COMPONENTS ==========
const VirtualizedMarker = React.memo(({ school, isMobile }) => {
  const markerRef = useRef();
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  
  const markerIcon = useMemo(() => 
    getIconForFacility(school.fasilitas, school, isMobile), 
    [school.fasilitas, school, isMobile]
  );
  
  const stableKey = useMemo(() => 
    `${school.npsn || 'unk'}-${school.lintang}-${school.bujur}`, 
    [school.npsn, school.lintang, school.bujur]
  );

  const handleClick = useCallback(() => {
    if (markerRef.current && !isPopupOpen) {
      markerRef.current.openPopup();
      setIsPopupOpen(true);
    }
  }, [isPopupOpen]);

  const handlePopupClose = useCallback(() => {
    setIsPopupOpen(false);
  }, []);

  if (!isValidCoordinate(school.lintang, school.bujur)) {
    return null;
  }

  return (
    <Marker 
      key={stableKey}
      ref={markerRef}
      position={[school.lintang, school.bujur]} 
      icon={markerIcon}
      eventHandlers={{
        click: handleClick,
        popupclose: handlePopupClose
      }}
    >
      <Popup 
        maxWidth={isMobile ? 300 : 400}
        closeButton={true}
        autoClose={true}
        closeOnClick={true}
        keepInView={true}
        autoPan={!isMobile}
      >
        <EnhancedSchoolPopup 
          school={school} 
          isMobile={isMobile}
        />
      </Popup>
    </Marker>
  );
});

VirtualizedMarker.displayName = 'VirtualizedMarker';

// ========== KECAMATAN COMPONENTS ==========
const createKecamatanIcon = (stats, size = 'normal') => {
  const { total, baik, rusakSedang, rusakBerat } = stats;
  const dimensions = size === 'small' ? 24 : 30;
  
  let dominantColor = FACILITY_COLORS.default;
  if (rusakBerat > 0) dominantColor = FACILITY_COLORS["Rusak Berat"];
  else if (rusakSedang > 0) dominantColor = FACILITY_COLORS["Rusak Sedang"];
  else if (baik > 0) dominantColor = FACILITY_COLORS["Rehabilitasi"];
  
  return new L.DivIcon({
    html: `<div style="
      width: ${dimensions}px;
      height: ${dimensions}px;
      border-radius: 50%;
      background: ${dominantColor};
      border: 3px solid #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
    ">
      <div style="font-size: ${size === 'small' ? '8px' : '10px'}; line-height: 1;">${total}</div>
      <div style="font-size: ${size === 'small' ? '6px' : '7px'}; line-height: 1;">sekolah</div>
    </div>`,
    iconSize: [dimensions, dimensions],
    iconAnchor: [dimensions/2, dimensions/2],
    popupAnchor: [0, -dimensions/2],
    className: styles.customKecamatanIcon
  });
};

const KecamatanPopup = React.memo(({ kecamatanName, stats, isMobile }) => {
  const percentages = useMemo(() => ({
    baik: ((stats.baik / stats.total) * 100).toFixed(1),
    rusakSedang: ((stats.rusakSedang / stats.total) * 100).toFixed(1),
    rusakBerat: ((stats.rusakBerat / stats.total) * 100).toFixed(1),
    noData: ((stats.noData / stats.total) * 100).toFixed(1)
  }), [stats]);

  const containerClass = `${styles.kecamatanPopup} ${isMobile ? styles.mobile : styles.desktop}`;
  const titleClass = `${styles.kecamatanTitle} ${isMobile ? styles.mobile : styles.desktop}`;
  const totalClass = `${styles.totalSchoolsCard} ${isMobile ? styles.mobile : styles.desktop}`;
  const conditionListClass = `${styles.conditionList} ${isMobile ? styles.mobile : styles.desktop}`;
  const circleClass = `${styles.conditionCircle} ${isMobile ? styles.mobile : styles.desktop}`;

  return (
    <div className={containerClass}>
      <strong className={titleClass}>
        Kecamatan {kecamatanName}
      </strong>
      
      <div className={totalClass}>
        <strong>Total Sekolah: {stats.total}</strong>
      </div>
      
      <div className={styles.conditionTitle}>
        <strong>Kondisi Fasilitas:</strong>
      </div>
      
      <div className={conditionListClass}>
        {[
          { key: 'baik', label: 'Kondisi Baik', color: '#198754' },
          { key: 'rusakSedang', label: 'Rusak Sedang', color: '#fd7e14' },
          { key: 'rusakBerat', label: 'Rusak Berat', color: '#dc3545' },
          { key: 'noData', label: 'Tanpa Data', color: '#6c757d' }
        ].map(({ key, label, color }) => (
          stats[key] > 0 && (
            <div key={key} className={styles.conditionItem}>
              <span className={circleClass} style={{ background: color }}></span>
              <span>{label}: <strong>{stats[key]}</strong> ({percentages[key]}%)</span>
            </div>
          )
        ))}
      </div>
    </div>
  );
});

KecamatanPopup.displayName = 'KecamatanPopup';

// ========== MAP COMPONENTS ==========
const SafeGeoJSON = React.memo(({ data, style }) => {
  const safeOnEachFeature = useCallback((feature, layer) => {
    try {
      if (feature.properties) {
        const name =
          feature.properties.name ||
          feature.properties.district ||
          feature.properties.village ||
          "Unknown";
        layer.bindPopup(name);
      }
    } catch (e) {
      console.warn("GeoJSON feature error", e);
    }
  }, []);

  if (!data?.features) return null;

  return (
    <GeoJSON
      data={data}
      style={style}
      onEachFeature={safeOnEachFeature}
      key={JSON.stringify(data)}
    />
  );
});

SafeGeoJSON.displayName = "SafeGeoJSON";

// ========== LEGEND ==========
const InteractiveLegend = React.memo(({ filteredCount, visibleCount, schools, isMobile, totalSchoolsLoaded }) => {
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
      const status = getFacilityStatus(school.fasilitas, school);
      stats[status] = (stats[status] || 0) + 1;
    });

    return stats;
  }, [schools]);
  
  useEffect(() => {
    const legend = L.control({ position: "bottomright" });
    
    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "info legend");
      div.className += ` ${styles.legend} ${isMobile ? styles.mobile : styles.desktop}`;
      div.style.maxHeight = isMobile ? '70vh' : '80vh';
      div.style.overflowY = 'auto';
      div.style.zIndex = '1000';
      div.style.background = 'rgba(255, 255, 255, 0.95)';
      div.style.backdropFilter = 'blur(5px)';
      
      const facilityRows = Object.entries(facilityStats)
        .filter(([_, count]) => count > 0)
        .map(([status, count]) => {
          const color = FACILITY_COLORS[status];
          const label = FACILITY_LABELS[status];
          const percentage = ((count / filteredCount) * 100).toFixed(1);
          
          return `
            <div class="${styles.legendRow} ${isMobile ? styles.mobile : styles.desktop}" style="margin-bottom: 4px;">
              <span class="${styles.legendCircle} ${isMobile ? styles.mobile : styles.desktop}" style="background:${color}; display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px;"></span>
              <span class="${styles.legendText} ${isMobile ? styles.mobile : styles.desktop}" style="font-size: ${isMobile ? '11px' : '12px'};">${isMobile && label.length > 15 ? label.substring(0, 15) + '...' : label}: <strong>${count}</strong> <span style="color: #666;">(${percentage}%)</span></span>
            </div>
          `;
        }).join('');
      
      div.innerHTML = `
        <h4 class="${styles.legendTitle} ${isMobile ? styles.mobile : styles.desktop}" style="margin: 0 0 8px 0; font-size: ${isMobile ? '14px' : '16px'}; border-bottom: 1px solid #ddd; padding-bottom: 4px;">Peta Sekolah Garut</h4>
        <div class="${styles.legendConditionTitle} ${isMobile ? styles.mobile : styles.desktop}" style="font-weight: bold; margin-bottom: 6px; font-size: ${isMobile ? '12px' : '13px'};">Kondisi Fasilitas:</div>
        <div style="margin-bottom: 8px;">${facilityRows}</div>
        <hr style="margin: 8px 0; border: none; border-top: 1px solid #ddd;">
        <div class="${styles.legendStats} ${isMobile ? styles.mobile : styles.desktop}" style="font-size: ${isMobile ? '10px' : '11px'}; color: #666;">
          <div style="margin-bottom: 2px;"><span>Sekolah Terfilter: <strong>${filteredCount}</strong></span></div>
          <div style="margin-bottom: 2px;"><span>Sekolah Terlihat: <strong>${visibleCount}</strong></span></div>
          <div style="margin-bottom: 2px;"><span>Area: <strong>Kabupaten Garut</strong></span></div>
          <div><span>Update Otomatis</span></div>
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
  }, [map, filteredCount, visibleCount, facilityStats, isMobile, totalSchoolsLoaded]);
  
  return null;
});

InteractiveLegend.displayName = 'InteractiveLegend';

// ========== MAP EVENTS ==========
const OptimizedMapEventHandler = React.memo(({ onBoundsChange, isMobile }) => {
  const map = useMapEvents({
    moveend: debounce(() => {
      onBoundsChange(map);
    }, isMobile ? 400 : 300),
    
    zoomend: debounce(() => {
      onBoundsChange(map);
    }, isMobile ? 400 : 300),
    
    ready: () => {
      setTimeout(() => onBoundsChange(map), 500);
    }
  });

  return null;
});

OptimizedMapEventHandler.displayName = 'OptimizedMapEventHandler';

// ========== KECAMATAN MARKER ==========
const OptimizedKecamatanMarker = React.memo(({ kecamatanName, stats, center, isMobile }) => {
  const map = useMap();
  const [shouldShow, setShouldShow] = useState(true);
  
  useEffect(() => {
    const handleZoom = () => {
      const currentZoom = map.getZoom();
      setShouldShow(currentZoom <= (isMobile ? 10 : 11));
    };
    
    handleZoom();
    map.on('zoomend', handleZoom);
    
    return () => {
      map.off('zoomend', handleZoom);
    };
  }, [map, isMobile]);

  if (!shouldShow || !center) return null;

  return (
    <Marker
      position={[center.lat, center.lng]}
      icon={createKecamatanIcon(stats, isMobile ? 'small' : 'normal')}
    >
      <Popup
        closeButton={true}
        autoClose={true}
        maxWidth={isMobile ? 280 : 350}
      >
        <KecamatanPopup kecamatanName={kecamatanName} stats={stats} isMobile={isMobile} />
      </Popup>
    </Marker>
  );
});

OptimizedKecamatanMarker.displayName = 'OptimizedKecamatanMarker';

// ========== MAIN MAP COMPONENT ==========
const Map = ({ filter, schools = [] }) => {
  const { isMobile, isTablet } = useResponsive();
  
  // Performance-focused state management
  const [allSchools, setAllSchools] = useState([]);
  const [filteredSchools, setFilteredSchools] = useState([]);
  const [visibleSchools, setVisibleSchools] = useState([]);
  const [geoKecamatan, setGeoKecamatan] = useState(null);
  const [geoDesa, setGeoDesa] = useState(null);
  const [kecamatanStats, setKecamatanStats] = useState({});
  const [kecamatanCenters, setKecamatanCenters] = useState({});
  const [isMapReady, setIsMapReady] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [totalSchoolsLoaded, setTotalSchoolsLoaded] = useState(0);
  
  const mapRef = useRef();
  const boundsUpdateTimeoutRef = useRef();

  // Optimized performance settings
  const performanceConfig = useMemo(() => ({
    maxVisibleMarkers: isMobile ? 200 : isTablet ? 400 : 600,
    clusterRadius: isMobile ? 30 : 40,
    clusterDisableZoom: isMobile ? 14 : 15,
    boundsUpdateDelay: isMobile ? 500 : 300
  }), [isMobile, isTablet]);

  // ========== DATA LOADING ==========
  useEffect(() => {
    const loadAllSchoolData = async () => {
      setLoadingProgress(0);
      
      if (schools && schools.length > 0) {
        const formattedSchools = formatSchoolsData(schools);
        setAllSchools(formattedSchools);
        setTotalSchoolsLoaded(formattedSchools.length);
        return;
      }

      try {
        const endpoints = [
          { url: API_ENDPOINTS.paud, type: "PAUD" },
          { url: API_ENDPOINTS.sd, type: "SD" },
          { url: API_ENDPOINTS.smp, type: "SMP" },
          { url: API_ENDPOINTS.pkbm, type: "PKBM" }
        ];
        
        const allSchoolsData = [];
        let totalLoaded = 0;
        
        for (let i = 0; i < endpoints.length; i++) {
          const { url, type } = endpoints[i];
          
          try {
            const response = await fetch(url);
            const data = await response.json();
            const formattedData = formatLegacyData(data, type);
            
            allSchoolsData.push(...formattedData);
            totalLoaded += formattedData.length;
            
            setLoadingProgress(((i + 1) / endpoints.length) * 100);
            setTotalSchoolsLoaded(totalLoaded);
            
            // Progressive loading
            if (i === 0) {
              setAllSchools([...formattedData]);
            }
          } catch (error) {
            console.error(`Error loading ${type} data:`, error);
          }
        }
        
        setAllSchools(allSchoolsData);
        setTotalSchoolsLoaded(totalLoaded);
        
        // Load geographic boundaries
        const [kecRes, desaRes] = await Promise.all([
          fetch(API_ENDPOINTS.kecamatan).then(r => r.json()).catch(() => null),
          fetch(API_ENDPOINTS.desa).then(r => r.json()).catch(() => null)
        ]);
        
        if (kecRes) setGeoKecamatan(kecRes);
        if (desaRes) setGeoDesa(desaRes);
        
      } catch (error) {
        console.error("Error loading school data:", error);
        setAllSchools([]);
      }
    };

    loadAllSchoolData();
  }, [schools]);

  // ========== KECAMATAN CENTER CALCULATION ==========
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
            centers[kecamatanName] = {
              lat: totalLat / pointCount,
              lng: totalLng / pointCount
            };
          }
        }
      });
    }
    
    return centers;
  }, []);

  // ========== KECAMATAN STATS CALCULATION ==========
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
      
      const condition = getFacilityStatus(school.fasilitas, school);
      
      switch (condition) {
        case "Rusak Berat":
          stats[kec].rusakBerat++;
          break;
        case "Rusak Sedang":
          stats[kec].rusakSedang++;
          break;
        case "Rehabilitasi":
          stats[kec].baik++;
          break;
        default:
          stats[kec].noData++;
      }
    });
    
    return stats;
  }, []);

  // ========== OPTIMIZED VISIBLE MARKERS UPDATE ==========
  const updateVisibleMarkers = useCallback((map) => {
    if (!map || !isMapReady || filteredSchools.length === 0) {
      return;
    }
    
    if (boundsUpdateTimeoutRef.current) {
      clearTimeout(boundsUpdateTimeoutRef.current);
    }

    boundsUpdateTimeoutRef.current = setTimeout(() => {
      try {
        const bounds = map.getBounds();
        if (!bounds) return;

        const visible = filteredSchools.filter((school) => {
          if (!isValidCoordinate(school.lintang, school.bujur)) return false;
          
          try {
            return bounds.contains([school.lintang, school.bujur]);
          } catch (e) {
            return false;
          }
        });
        
        const limitedVisible = visible.slice(0, performanceConfig.maxVisibleMarkers);
        setVisibleSchools(limitedVisible);
        
      } catch (error) {
        console.warn("Error updating visible markers:", error);
      }
    }, performanceConfig.boundsUpdateDelay);
  }, [filteredSchools, isMapReady, performanceConfig]);

  // ========== EFFECTS ==========
  useEffect(() => {
    if (geoKecamatan) {
      const centers = calculateKecamatanCenters(geoKecamatan);
      setKecamatanCenters(centers);
    }
  }, [geoKecamatan, calculateKecamatanCenters]);

  useEffect(() => {
    if (allSchools.length > 0) {
      const stats = calculateKecamatanStats(allSchools);
      setKecamatanStats(stats);
    }
  }, [allSchools, calculateKecamatanStats]);

  // Optimized filtering
  const memoizedFilteredSchools = useMemo(() => {
    let filtered = allSchools;

    if (filter?.jenjang && filter.jenjang !== "all" && filter.jenjang !== "Semua Jenjang") {
      filtered = filtered.filter((s) => s.jenjang === filter.jenjang);
    }
    
    if (filter?.kecamatan && filter.kecamatan !== "all" && filter.kecamatan !== "Semua Kecamatan") {
      filtered = filtered.filter((s) => s.kecamatan === filter.kecamatan);
    }
    
    if (filter?.desa && filter.desa !== "all" && filter.desa !== "Semua Desa") {
      filtered = filtered.filter((s) => s.desa === filter.desa);
    }

    return filtered;
  }, [filter, allSchools]);

  useEffect(() => {
    setFilteredSchools(memoizedFilteredSchools);
  }, [memoizedFilteredSchools]);

  useEffect(() => {
    if (filteredSchools.length > 0 && isMapReady) {
      setVisibleSchools(filteredSchools.slice(0, performanceConfig.maxVisibleMarkers));
      
      if (mapRef.current) {
        setTimeout(() => updateVisibleMarkers(mapRef.current), 300);
      }
    } else if (filteredSchools.length === 0) {
      setVisibleSchools([]);
    }
  }, [filteredSchools, updateVisibleMarkers, isMapReady, performanceConfig]);

  // ========== RENDER METHODS ==========
  const renderKecamatanMarkers = () => {
    if (!geoKecamatan || Object.keys(kecamatanStats).length === 0) return null;
    
    return Object.entries(kecamatanStats).map(([kecamatanName, stats]) => {
      const center = kecamatanCenters[kecamatanName];
      
      const shouldShow = center && 
                        (!filter?.kecamatan || 
                         filter.kecamatan === "all" || 
                         filter.kecamatan === "Semua Kecamatan");
      
      if (!shouldShow) return null;

      return (
        <OptimizedKecamatanMarker 
          key={`kec-${kecamatanName}`}
          kecamatanName={kecamatanName}
          stats={stats}
          center={center}
          isMobile={isMobile}
        />
      );
    });
  };

  const renderSchoolMarkers = () => {
    return visibleSchools.map((school, index) => (
      <VirtualizedMarker
        key={`school-${school.npsn || index}-${school.lintang}-${school.bujur}`}
        school={school}
        isMobile={isMobile}
      />
    ));
  };

  // ========== STYLES ==========
  const kecamatanStyle = useMemo(() => ({ 
    color: "#555", 
    weight: isMobile ? 0.5 : 1,
    fillOpacity: 0.02,
    opacity: 0.7
  }), [isMobile]);
  
  const desaStyle = useMemo(() => ({ 
    color: "#888", 
    weight: isMobile ? 0.3 : 0.5,
    fillOpacity: 0.01,
    opacity: 0.5
  }), [isMobile]);

  const mapHeight = useMemo(() => {
    if (isMobile) return "75vh";
    if (isTablet) return "85vh";
    return "100vh";
  }, [isMobile, isTablet]);

  // ========== CLEANUP ==========
  useEffect(() => {
    return () => {
      if (boundsUpdateTimeoutRef.current) {
        clearTimeout(boundsUpdateTimeoutRef.current);
      }
    };
  }, []);

  // ========== LOADING OVERLAY ==========
  const LoadingOverlay = () => {
    if (totalSchoolsLoaded > 0) return null;
    
    return (
      <div className={styles.loadingOverlay}>
        <div className={styles.loadingCard}>
          <div className={styles.loadingTitle}>Memuat Data Sekolah...</div>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
          <div className={styles.progressText}>
            {loadingProgress.toFixed(0)}% - Target: 4842+ sekolah
          </div>
        </div>
      </div>
    );
  };

  // ========== MAIN RENDER ==========
  return (
    <div className={styles.mapContainer} style={{ height: mapHeight }}>
      <LoadingOverlay />
      
      <MapContainer
        center={GARUT_CENTER}
        zoom={isMobile ? 9 : 10}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
        ref={mapRef}
        whenReady={() => {
          setIsMapReady(true);
        }}
        closePopupOnClick={true}
        attributionControl={!isMobile}
        zoomControl={!isMobile}
        preferCanvas={true}
      >
        <TileLayer 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution={isMobile ? '' : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
          maxZoom={18}
          tileSize={256}
          keepBuffer={isMobile ? 2 : 4}
        />
        
        {geoKecamatan && (
          <SafeGeoJSON data={geoKecamatan} style={kecamatanStyle} />
        )}
        
        {geoDesa && filter?.kecamatan && filter.kecamatan !== "all" && (
          <SafeGeoJSON data={geoDesa} style={desaStyle} />
        )}
        
        {isMapReady && renderKecamatanMarkers()}
        
        {isMapReady && visibleSchools.length > 0 && (
          <MarkerClusterGroup 
            chunkedLoading={true}
            chunkInterval={isMobile ? 200 : 100}
            chunkDelay={isMobile ? 100 : 50}
            maxClusterRadius={performanceConfig.clusterRadius}
            disableClusteringAtZoom={performanceConfig.clusterDisableZoom}
            spiderfyOnMaxZoom={true}
            showCoverageOnHover={!isMobile}
            zoomToBoundsOnClick={true}
            removeOutsideVisibleBounds={true}
            animate={!isMobile}
            iconCreateFunction={(cluster) => {
              const count = cluster.getChildCount();
              const size = count < 10 ? 'small' : count < 50 ? 'medium' : 'large';
              const dimensions = {
                small: isMobile ? 20 : 25,
                medium: isMobile ? 28 : 35, 
                large: isMobile ? 35 : 45
              };
              
              return L.divIcon({
                html: `<div style="
                  background: linear-gradient(135deg, #3498db, #2980b9);
                  color: white;
                  border-radius: 50%;
                  width: ${dimensions[size]}px;
                  height: ${dimensions[size]}px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-weight: bold;
                  font-size: ${isMobile ? '9px' : '11px'};
                  border: 2px solid #fff;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                ">${count}</div>`,
                className: styles.customClusterIcon,
                iconSize: [dimensions[size], dimensions[size]]
              });
            }}
          >
            {renderSchoolMarkers()}
          </MarkerClusterGroup>
        )}
        
        <OptimizedMapEventHandler onBoundsChange={updateVisibleMarkers} isMobile={isMobile} />
        
        {isMapReady && (
          <InteractiveLegend 
            filteredCount={filteredSchools.length} 
            visibleCount={visibleSchools.length}
            schools={filteredSchools}
            isMobile={isMobile}
            totalSchoolsLoaded={totalSchoolsLoaded}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default Map;