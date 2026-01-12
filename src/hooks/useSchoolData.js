// src/hooks/useSchoolData.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { loadSchoolDatasetRPC } from '../services/api/schoolApi'; // Pastikan path ini benar
import useGeoData from './useGeoData'; // <--- IMPORT HOOK MASTER TADI

const useSchoolData = () => {
    // 1. Ambil Data Master Wilayah (Selalu Lengkap & Stabil)
    const { kecamatanList, loading: geoLoading } = useGeoData();

    // 2. State untuk Data Sekolah (Dinamis dari Supabase)
    const [allData, setAllData] = useState({
        schools: [],
        stats: {
            totalKecamatan: 0,
            totalDesa: 0,
            totalSekolah: 0
        },
    });
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const isMounted = useRef(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            // Ambil data sekolah real-time dari Supabase
            // (Menggantikan loadJSON paud.json, sd.json, dll yang berat)
            const schools = await loadSchoolDatasetRPC({});
            
            if (isMounted.current) {
                setAllData({
                    schools: schools || [],
                    stats: {
                        // KUNCI PERBAIKAN:
                        // Total Kecamatan diambil dari Master List JSON (42), bukan dihitung dari sekolah
                        totalKecamatan: kecamatanList.length || 42, 
                        totalDesa: 424, // Angka statis desa di Garut
                        totalSekolah: schools?.length || 0
                    } 
                });
            }
        } catch (err) {
            console.error("Error useSchoolData:", err);
            if (isMounted.current) setError(err?.message || "Gagal memuat data sekolah");
        } finally {
            if (isMounted.current) setLoading(false);
        }
    }, [kecamatanList.length]);

    useEffect(() => {
        isMounted.current = true;
        // Tunggu geoLoading selesai agar statistik kecamatan akurat
        if (!geoLoading) {
            fetchData();
        }
        return () => { isMounted.current = false; };
    }, [fetchData, geoLoading]);
    
    return { 
        ...allData, 
        loading: loading || geoLoading, 
        error, 
        fetchData,
        // Expose data master ke komponen lain agar bisa dipakai Dropdown
        masterKecamatan: kecamatanList 
    };
};

export default useSchoolData;