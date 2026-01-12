import React, { createContext, useContext, useEffect, useState } from 'react';

const SchoolDataContext = createContext(null);

export const SchoolDataProvider = ({ children }) => {
    const [schools, setSchools] = useState([]);
    const [geoData, setGeoData] = useState({ kecamatan: null, desa: null });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                setLoading(true);
                // Mengambil data sekolah yang sudah diproses dan data geografi secara bersamaan
                const schoolsPromise = fetch('/data/all_schools_processed.json').then(res => {
                    if (!res.ok) throw new Error('Gagal memuat all_schools_processed.json');
                    return res.json();
                });
                const kecamatanPromise = fetch('/data/kecamatan.geojson').then(res => res.json());
                
                const [allSchools, kecamatanGeoJSON] = await Promise.all([schoolsPromise, kecamatanPromise]);
                
                setSchools(allSchools);
                setGeoData({ kecamatan: kecamatanGeoJSON, desa: null }); // Data desa bisa ditambahkan di sini jika perlu
            } catch (err) {
                console.error("Gagal mengambil data terpusat:", err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, []);

    // Nilai yang akan dibagikan ke seluruh aplikasi
    const value = { schools, geoData, loading, error };

    return (
        <SchoolDataContext.Provider value={value}>
            {children}
        </SchoolDataContext.Provider>
    );
};

// Custom hook untuk menggunakan data ini di komponen lain
export const useSharedSchoolData = () => {
    const context = useContext(SchoolDataContext);
    if (!context) {
        throw new Error('useSharedSchoolData harus digunakan di dalam SchoolDataProvider');
    }
    return context;
};