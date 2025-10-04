// src/hooks/useSchoolMapDashboardData.js - HOOK TERAKHIR: OPTIMASI PARALEL PENUH

import { useState, useEffect, useCallback } from 'react';

const isValidCoordinate = (lat, lng) => (
    lat != null && lng != null &&
    typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90 &&
    typeof lng === 'number' && !isNaN(lng) && lng >= -180 && lng <= 180 &&
    (lat !== 0 || lng !== 0)
);

const loadJSON = async (fullPath) => {
    try {
        const response = await fetch(fullPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} for ${fullPath}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Gagal memuat ${fullPath}:`, error.message);
        return null;
    }
};

const useSchoolMapDashboardData = () => {
    const [schoolData, setSchoolData] = useState([]);
    const [geoData, setGeoData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [jenjangList, setJenjangList] = useState([]);
    const [kecamatanList, setKecamatanList] = useState([]);
    const [desaList, setDesaList] = useState([]);

    const processAllData = useCallback((data) => {
        const [
            paudData, sdData, smpData, pkbmData,
            kegiatanPaudData, kegiatanSdData, kegiatanSmpData, kegiatanPkbmData,
            kecGeoData, desaGeoData
        ] = data;

        if (!kecGeoData) {
            throw new Error("Data GeoJSON (kecamatan) gagal dimuat. Filter tidak dapat diinisialisasi.");
        }

        const combinedSchoolData = [];
        
        const processSchool = (data, jenjang) => {
            if (!data) return;
            
            const processSingleSchool = (school, kecamatanName) => {
                if (!school || typeof school !== 'object') return;
                
                let student_count = 0;
                let kondisiKelas = {};
                
                if (jenjang === 'PAUD') {
                    student_count = (school.student_data?.male_students || 0) + (school.student_data?.female_students || 0);
                    kondisiKelas = {
                        baik: parseInt(school.class_condition?.good) || 0,
                        rusakSedang: parseInt(school.class_condition?.moderate_damage) || 0,
                        rusakBerat: parseInt(school.class_condition?.heavy_damage) || 0,
                    };
                } else {
                    student_count = parseInt(school.student_count) || 0;
                    kondisiKelas = {
                        baik: parseInt(school.class_condition?.classrooms_good) || 0,
                        rusakSedang: parseInt(school.class_condition?.classrooms_moderate_damage) || 0,
                        rusakBerat: parseInt(school.class_condition?.classrooms_heavy_damage) || 0,
                    };
                }
                
                const rawCoords = school.coordinates;
                if (!Array.isArray(rawCoords) || rawCoords.length !== 2) return;
                
                const lat = parseFloat(rawCoords[0]);
                const lng = parseFloat(rawCoords[1]);
                
                if (!isValidCoordinate(lat, lng)) return;
                
                combinedSchoolData.push({
                    jenjang: jenjang,
                    npsn: school.npsn || `${jenjang}-${Math.random()}`,
                    namaSekolah: school.name || school.namaSekolah || 'Tidak diketahui',
                    tipeSekolah: school.type || school.status || '-',
                    desa: school.village || '-',
                    kecamatan: kecamatanName,
                    student_count: student_count, 
                    coordinates: [lat, lng],
                    kondisiKelas: kondisiKelas, 
                    kurangRKB: parseInt(school.class_condition?.lacking_rkb) || 0,
                    originalData: school 
                });
            };
            
            if (Array.isArray(data)) {
                data.forEach(school => processSingleSchool(school, school.kecamatan || '-'));
            } else if (typeof data === 'object') {
                Object.entries(data).forEach(([kecamatan, schools]) => {
                    if (Array.isArray(schools)) {
                        schools.forEach(school => processSingleSchool(school, kecamatan));
                    }
                });
            }
        };

        processSchool(paudData, 'PAUD');
        processSchool(sdData, 'SD');
        processSchool(smpData, 'SMP');
        processSchool(pkbmData, 'PKBM');

        const combinedKegiatanData = [
            ...(Array.isArray(kegiatanPaudData) ? kegiatanPaudData : []),
            ...(Array.isArray(kegiatanSdData) ? kegiatanSdData : []),
            ...(Array.isArray(kegiatanSmpData) ? kegiatanSmpData : []),
            ...(Array.isArray(kegiatanPkbmData) ? kegiatanPkbmData : [])
        ];

        const kegiatanMap = {};
        combinedKegiatanData.forEach(kegiatan => {
            if (kegiatan && kegiatan.npsn) {
                const npsn = String(kegiatan.npsn);
                if (!kegiatanMap[npsn]) {
                    kegiatanMap[npsn] = { rehabRuangKelas: 0, pembangunanRKB: 0 };
                }
                const lokalCount = parseInt(kegiatan.Lokal) || 0;
                if (kegiatan.Kegiatan?.includes('Rehab')) {
                    kegiatanMap[npsn].rehabRuangKelas += lokalCount;
                }
                if (kegiatan.Kegiatan?.includes('Pembangunan')) {
                    kegiatanMap[npsn].pembangunanRKB += lokalCount;
                }
            }
        });

        const mergedSchoolData = combinedSchoolData.map((school) => {
            const kegiatanData = kegiatanMap[String(school.npsn)] || { rehabRuangKelas: 0, pembangunanRKB: 0 };
            return { ...school, ...kegiatanData };
        });

        return {
            mergedSchoolData,
            geoData: { kecamatan: kecGeoData, desa: desaGeoData }
        };

    }, []);

    useEffect(() => {
        const loadAllDataParallel = async () => {
            setLoading(true);
            setError(null);
            
            try {
                console.log("Memulai pemuatan data paralel untuk 12 file...");
                const rawData = await Promise.all([
                    loadJSON('/data/paud.json'),
                    loadJSON('/data/sd_new.json'),
                    loadJSON('/data/smp.json'),
                    loadJSON('/data/pkbm.json'),
                    loadJSON('/data/data_kegiatan_paud.json'),
                    loadJSON('/data/data_kegiatan_sd.json'),
                    loadJSON('/data/data_kegiatan_smp.json'),
                    loadJSON('/data/data_kegiatan_pkbm.json'),
                    loadJSON('/data/kecamatan.geojson'), 
                    loadJSON('/data/desa.geojson')      
                ]);

                if (rawData.slice(0, 4).some(d => d === null)) { 
                    throw new Error("Gagal memuat salah satu data sekolah utama.");
                }

                const { mergedSchoolData, geoData } = processAllData(rawData);
                
                const finalSchoolData = mergedSchoolData;
                const finalGeoData = geoData;
                
                setSchoolData(finalSchoolData);
                setGeoData(finalGeoData);
                setJenjangList([...new Set(finalSchoolData.map(s => s.jenjang).filter(Boolean))].sort());
                setKecamatanList([...new Set(finalSchoolData.map(s => s.kecamatan).filter(Boolean))].sort());
                setDesaList([...new Set(finalSchoolData.map(s => s.desa).filter(Boolean))].sort());

            } catch (err) {
                console.error("Kesalahan dalam proses loading paralel:", err);
                setError(`Gagal memuat data: ${err.message}. Cek konsol untuk detailnya.`);
            } finally {
                setLoading(false);
            }
        };
        loadAllDataParallel();
    }, [processAllData]);

    return { schoolData, geoData, loading, error, jenjangList, kecamatanList, desaList };
};

export default useSchoolMapDashboardData;