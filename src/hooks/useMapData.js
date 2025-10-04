// src/hooks/useMapData.js - PERBAIKAN NAMA EKSPOR

import { useState, useEffect, useCallback } from 'react';

const loadJSON = async (path) => {
    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for ${path}`);
        return await response.json();
    } catch (error) {
        console.error(`Gagal memuat ${path}:`, error);
        return {};
    }
};

// [FIX] Nama fungsi diubah menjadi useMapData agar konsisten
const useMapData = () => {
    const [data, setData] = useState({ schools: [], geoData: { kecamatan: null, desa: null } });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const processData = useCallback((rawData) => {
        const { paudData, sdData, smpData, pkbmData, kecGeoData, desaGeoData } = rawData;
        let allSchools = [];

        const process = (dataObj, jenjang) => {
            if (!dataObj) return;
            const schools = Array.isArray(dataObj) ? dataObj : Object.values(dataObj).flat();
            schools.forEach(school => {
                if (!school || !school.coordinates || school.coordinates.length !== 2) return;
                const lat = parseFloat(school.coordinates[0]);
                const lng = parseFloat(school.coordinates[1]);
                if (isNaN(lat) || isNaN(lng)) return;
                allSchools.push({
                    ...school,
                    jenjang,
                    latitude: lat,
                    longitude: lng,
                    nama: school.name || school.nama_sekolah || 'Nama Tidak Diketahui',
                });
            });
        };

        process(paudData, 'PAUD');
        process(sdData, 'SD');
        process(smpData, 'SMP');
        process(pkbmData, 'PKBM');

        return {
            schools: allSchools,
            geoData: { kecamatan: kecGeoData, desa: desaGeoData }
        };
    }, []);

    useEffect(() => {
        const fetchAndProcessData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [
                    paudData, sdData, smpData, pkbmData, kecGeoData, desaGeoData
                ] = await Promise.all([
                    loadJSON('/data/paud.json'), loadJSON('/data/sd_new.json'),
                    loadJSON('/data/smp.json'), loadJSON('/data/pkbm.json'),
                    loadJSON('/data/kecamatan.geojson'), loadJSON('/data/desa.geojson')
                ]);

                if (!kecGeoData || (!paudData && !sdData && !smpData && !pkbmData)) {
                     throw new Error('Data utama sekolah atau geografi gagal dimuat.');
                }
                const processed = processData({ paudData, sdData, smpData, pkbmData, kecGeoData, desaGeoData });
                setData(processed);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchAndProcessData();
    }, [processData]);

    return { ...data, loading, error };
};

// [FIX] Ekspor dengan nama yang konsisten
export default useMapData;