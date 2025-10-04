// src/hooks/useSchoolMapDashboardData.js

import { useState, useEffect, useMemo } from 'react';
import { getSchoolsForDashboard } from '../services/api/schoolApi';
import { fetchGeoData } from '../services/api/regionApi';

const useSchoolMapDashboardData = () => {
    const [schoolData, setSchoolData] = useState([]);
    const [geoData, setGeoData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [schoolsResponse, geoResponse] = await Promise.all([
                    getSchoolsForDashboard(),
                    fetchGeoData()
                ]);

                const processedSchools = schoolsResponse.map(school => {
                    const conditions = school.class_conditions?.[0] || {};
                    // Data rehab & construction sengaja dikosongkan di awal agar ringan
                    // Data ini tidak dibutuhkan untuk chart utama
                    return {
                        namaSekolah: school.name,
                        npsn: school.npsn,
                        jenjang: school.level,
                        tipeSekolah: school.type,
                        desa: school.village,
                        kecamatan: school.kecamatan,
                        student_count: school.student_count || 0,
                        coordinates: [school.latitude, school.longitude],
                        kondisiKelas: {
                            baik: conditions.classrooms_good || 0,
                            rusakSedang: conditions.classrooms_moderate_damage || 0,
                            rusakBerat: conditions.classrooms_heavy_damage || 0
                        },
                        kurangRKB: conditions.lacking_rkb || 0,
                        rehabRuangKelas: 0, // Dikosongkan di awal
                        pembangunanRKB: 0, // Dikosongkan di awal
                        originalData: school
                    };
                });

                setSchoolData(processedSchools);
                setGeoData(geoResponse);
                
            } catch (err) {
                console.error("Error di useSchoolMapDashboardData:", err);
                setError('Gagal memuat data dasbor.');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const { jenjangList, kecamatanList, desaList } = useMemo(() => {
        const jenjangSet = new Set(schoolData.map(s => s.jenjang).filter(Boolean));
        const kecamatanSet = new Set(schoolData.map(s => s.kecamatan).filter(Boolean));
        const desaSet = new Set(schoolData.map(s => s.desa).filter(Boolean));
        
        return {
            jenjangList: Array.from(jenjangSet).sort(),
            kecamatanList: Array.from(kecamatanSet).sort(),
            desaList: Array.from(desaSet).sort()
        };
    }, [schoolData]);

    return { schoolData, geoData, loading, error, jenjangList, kecamatanList, desaList };
};

export default useSchoolMapDashboardData;