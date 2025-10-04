// src/hooks/useGeoData.js

import { useState, useEffect } from 'react';

const loadJSON = async (path) => {
    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for ${path}`);
        return await response.json();
    } catch (error) {
        console.error(`Gagal memuat ${path}:`, error);
        return null;
    }
};

/**
 * Hook untuk memuat data geografi (kecamatan dan desa GeoJSON).
 * @returns {{geoData: {kecamatan: any, desa: any}, loading: boolean, error: string | null}}
 */
const useGeoData = () => {
    const [geoData, setGeoData] = useState({ kecamatan: null, desa: null });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchGeoData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [kecGeoData, desaGeoData] = await Promise.all([
                    loadJSON('/data/kecamatan.geojson'), 
                    loadJSON('/data/desa.geojson')
                ]);

                if (!kecGeoData) {
                     throw new Error('Data geografi kecamatan gagal dimuat.');
                }
                
                setGeoData({ kecamatan: kecGeoData, desa: desaGeoData });
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchGeoData();
    }, []);

    return { geoData, loading, error };
};

export default useGeoData;