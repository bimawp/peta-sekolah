// src/hooks/useSchoolMapDashboardData.js

import { useState, useEffect, useMemo, useCallback } from 'react';

/**
 * Custom Hook untuk mengambil dan memproses data sekolah dari JSON files
 * LOGIKA SAMA PERSIS dengan SchoolDetailPage.jsx original (document 5)
 */
const useSchoolMapDashboardData = () => {
    const [schoolData, setSchoolData] = useState([]);
    const [geoData, setGeoData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const isValidCoordinate = useCallback((lat, lng) => (
        lat != null && lng != null &&
        typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90 &&
        typeof lng === 'number' && !isNaN(lng) && lng >= -180 && lng <= 180 &&
        (lat !== 0 || lng !== 0)
    ), []);

    const loadJSON = useCallback(async (fullPath) => {
        try {
            const response = await fetch(fullPath);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for ${fullPath}`);
            return await response.json();
        } catch (error) {
            console.error(`Gagal memuat ${fullPath}:`, error);
            return null;
        }
    }, []);

    useEffect(() => {
        const loadAllData = async () => {
            try {
                setLoading(true);
                setError(null);
                
                // Load semua file JSON secara paralel (SAMA PERSIS dengan original)
                const [
                    paudData, sdData, smpData, pkbmData,
                    kegiatanPaudData, kegiatanSdData, kegiatanSmpData, kegiatanPkbmData,
                    kecGeoData, desaGeoData
                ] = await Promise.all([
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

                const combinedSchoolData = [];
                
                // FUNGSI YANG SAMA PERSIS dengan original
                const processSchoolData = (data, jenjang) => {
                    if (!data) return;
                    
                    const processSingleSchool = (school, kecamatanName) => {
                        if (!school || typeof school !== 'object') return;
                        
                        // LOGIKA SAMA PERSIS dengan original
                        let student_count = 0;
                        let kondisiKelas = {};
                        
                        if (jenjang === 'PAUD') {
                            student_count = (school.student_data?.male_students || 0) + (school.student_data?.female_students || 0);
                            kondisiKelas = {
                                baik: parseInt(school.class_condition?.good) || 0,
                                rusakSedang: parseInt(school.class_condition?.moderate_damage) || 0,
                                rusakBerat: parseInt(school.class_condition?.heavy_damage) || 0,
                            };
                        } else { // Untuk SD, SMP, PKBM
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
                        
                        if (!isValidCoordinate(lat, lng)) {
                            return;
                        }
                        
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
                            originalData: school // PENTING: Menyimpan data asli untuk halaman detail
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

                // Process semua jenjang (SAMA PERSIS dengan original)
                processSchoolData(paudData, 'PAUD');
                processSchoolData(sdData, 'SD');
                processSchoolData(smpData, 'SMP');
                processSchoolData(pkbmData, 'PKBM');

                // Combine data kegiatan (SAMA PERSIS dengan original)
                const combinedKegiatanData = [
                    ...(Array.isArray(kegiatanPaudData) ? kegiatanPaudData : []),
                    ...(Array.isArray(kegiatanSdData) ? kegiatanSdData : []),
                    ...(Array.isArray(kegiatanSmpData) ? kegiatanSmpData : []),
                    ...(Array.isArray(kegiatanPkbmData) ? kegiatanPkbmData : [])
                ];

                // Map kegiatan per NPSN (SAMA PERSIS dengan original)
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

                // Merge school data dengan kegiatan (SAMA PERSIS dengan original)
                const mergedSchoolData = combinedSchoolData.map((school) => {
                    const kegiatanData = kegiatanMap[String(school.npsn)] || { rehabRuangKelas: 0, pembangunanRKB: 0 };
                    return { ...school, ...kegiatanData };
                });

                // Set state (SAMA PERSIS dengan original)
                setSchoolData(mergedSchoolData);
                setGeoData({ kecamatan: kecGeoData, desa: desaGeoData });

            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };
        loadAllData();
    }, [loadJSON, isValidCoordinate]);

    // Generate list untuk filter dropdown (SAMA PERSIS dengan original)
    const jenjangList = useMemo(() => {
        return [...new Set(schoolData.map(s => s.jenjang).filter(Boolean))].sort();
    }, [schoolData]);

    const kecamatanList = useMemo(() => {
        return [...new Set(schoolData.map(s => s.kecamatan).filter(Boolean))].sort();
    }, [schoolData]);

    const desaList = useMemo(() => {
        return [...new Set(schoolData.map(s => s.desa).filter(Boolean))].sort();
    }, [schoolData]);

    return {
        schoolData,
        geoData,
        loading,
        error,
        jenjangList,
        kecamatanList,
        desaList
    };
};

export default useSchoolMapDashboardData;