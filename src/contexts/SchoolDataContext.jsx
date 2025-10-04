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
                const schoolsPromise = fetch('/data/all_schools_processed.json').then(res => {
                    if (!res.ok) throw new Error('Gagal memuat all_schools_processed.json');
                    return res.json();
                });
                const kecamatanPromise = fetch('/data/kecamatan.geojson').then(res => res.json());
                const [allSchools, kecamatanGeoJSON] = await Promise.all([schoolsPromise, kecamatanPromise]);
                setSchools(allSchools);
                setGeoData({ kecamatan: kecamatanGeoJSON, desa: null });
            } catch (err) {
                console.error("Gagal mengambil data terpusat:", err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, []);

    const value = { schools, geoData, loading, error };

    return (
        <SchoolDataContext.Provider value={value}>
            {children}
        </SchoolDataContext.Provider>
    );
};

export const useSharedSchoolData = () => {
    const context = useContext(SchoolDataContext);
    if (!context) {
        throw new Error('useSharedSchoolData harus digunakan di dalam SchoolDataProvider');
    }
    return context;
};