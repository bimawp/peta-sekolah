import { useState, useEffect } from 'react';

const loadJSON = async (path) => {
    try {
        const response = await fetch(path);
        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status} for ${path}`);
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error(`Gagal memuat ${path}:`, error);
        return null;
    }
};

const useSchoolData = () => {
    const [schools, setSchools] = useState([]);
    const [geoData, setGeoData] = useState({ kecamatan: null, desa: null });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({ totalSchools: 0, validLocation: 0 });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                // Sekarang hanya muat 3 file: 1 file sekolah yang sudah matang, dan 2 file geojson
                const [processedSchools, kecGeoData, desaGeoData] = await Promise.all([
                    loadJSON('/data/all_schools_processed.json'),
                    loadJSON('/data/kecamatan.geojson'),
                    loadJSON('/data/desa.geojson')
                ]);

                if (!processedSchools) {
                    throw new Error('Gagal memuat file data sekolah utama (all_schools_processed.json). Pastikan Anda sudah menjalankan skrip "node scripts/preprocessData.js"');
                }

                setSchools(processedSchools);
                setGeoData({ kecamatan: kecGeoData, desa: desaGeoData });
                
                // Hitung statistik dari data yang sudah bersih
                const validLocationCount = processedSchools.filter(s => s.hasValidLocation).length;
                setStats({
                    totalSchools: processedSchools.length,
                    validLocation: validLocationCount,
                });
                console.log(`Memuat selesai: ${processedSchools.length} sekolah, ${validLocationCount} lokasi valid.`);

            } catch (err) {
                setError(err.message);
                console.error("Error saat memuat data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return { schools, geoData, loading, error, stats };
};

export default useSchoolData;