import { useState, useEffect, useCallback, useMemo } from 'react';

// Fungsi helper untuk mengambil dan mem-parsing JSON dengan aman
const loadJSON = async (path) => {
    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} for ${path}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Gagal memuat ${path}:`, error);
        // Mengembalikan array/objek kosong agar Promise.all tidak gagal total
        return Array.isArray(path) ? [] : {};
    }
};

const useSchoolData = () => {
    const [allData, setAllData] = useState({
        schools: [],
        geoData: { kecamatan: null, desa: null },
        stats: {},
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const processData = useCallback((rawData) => {
        const {
            paudData, sdData, smpData, pkbmData,
            kegiatanPaudData, kegiatanSdData, kegiatanSmpData, kegiatanPkbmData,
            kecGeoData, desaGeoData
        } = rawData;

        // 1. Gabungkan semua data kegiatan ke dalam satu map untuk lookup cepat
        const kegiatanMap = [
            ...(kegiatanPaudData || []),
            ...(kegiatanSdData || []),
            ...(kegiatanSmpData || []),
            ...(kegiatanPkbmData || [])
        ].reduce((acc, kegiatan) => {
            if (kegiatan && kegiatan.npsn) {
                const npsn = String(kegiatan.npsn);
                if (!acc[npsn]) {
                    acc[npsn] = { rehabRuangKelas: 0, pembangunanRKB: 0 };
                }
                const lokalCount = parseInt(kegiatan.Lokal, 10) || 0;
                if (kegiatan.Kegiatan?.includes('Rehab')) {
                    acc[npsn].rehabRuangKelas += lokalCount;
                }
                if (kegiatan.Kegiatan?.includes('Pembangunan')) {
                    acc[npsn].pembangunanRKB += lokalCount;
                }
            }
            return acc;
        }, {});

        // 2. Normalisasi dan gabungkan semua data sekolah
        const allSchools = [];
        const process = (data, jenjang) => {
            if (!data) return;
            // Menangani format data yang berbeda (array langsung atau objek dengan key kecamatan)
            const schools = Array.isArray(data) ? data : Object.values(data).flat();

            schools.forEach(school => {
                if (!school || !school.coordinates || school.coordinates.length !== 2) return;
                
                const lat = parseFloat(school.coordinates[0]);
                const lng = parseFloat(school.coordinates[1]);
                if (isNaN(lat) || isNaN(lng)) return;

                const npsn = String(school.npsn || `${jenjang}-${Math.random()}`);
                const kegiatan = kegiatanMap[npsn] || { rehabRuangKelas: 0, pembangunanRKB: 0 };
                
                allSchools.push({
                    ...school,
                    jenjang,
                    npsn,
                    latitude: lat,
                    longitude: lng,
                    nama_sekolah: school.name || school.nama_sekolah || 'Nama Tidak Diketahui',
                    kecamatan: school.kecamatan,
                    desa: school.village || 'Desa Tidak Diketahui',
                    student_count: parseInt(school.student_count, 10) || 0,
                    kondisi_ruang_kelas_baik: parseInt(school.class_condition?.classrooms_good, 10) || 0,
                    kondisi_ruang_kelas_rusak_sedang: parseInt(school.class_condition?.classrooms_moderate_damage, 10) || 0,
                    kondisi_ruang_kelas_rusak_berat: parseInt(school.class_condition?.classrooms_heavy_damage, 10) || 0,
                    jumlah_rombel: parseInt(school.class_condition?.total_rombel, 10) || 0,
                    jumlah_ruang_kelas: parseInt(school.class_condition?.total_classrooms, 10) || 0,
                    kekurangan_rkb: parseInt(school.class_condition?.lacking_rkb, 10) || 0,
                    ...kegiatan,
                    originalData: school, // Simpan data asli jika diperlukan
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
                    paudData, sdData, smpData, pkbmData,
                    kegiatanPaudData, kegiatanSdData, kegiatanSmpData, kegiatanPkbmData,
                    kecGeoData, desaGeoData
                ] = await Promise.all([
                    loadJSON('/data/paud.json'), loadJSON('/data/sd_new.json'),
                    loadJSON('/data/smp.json'), loadJSON('/data/pkbm.json'),
                    loadJSON('/data/data_kegiatan_paud.json'), loadJSON('/data/data_kegiatan_sd.json'),
                    loadJSON('/data/data_kegiatan_smp.json'), loadJSON('/data/data_kegiatan_pkbm.json'),
                    loadJSON('/data/kecamatan.geojson'), loadJSON('/data/desa.geojson')
                ]);

                // Periksa apakah data penting (sekolah atau geojson) berhasil dimuat
                if (!kecGeoData || (!paudData && !sdData && !smpData && !pkbmData)) {
                     throw new Error('Data utama sekolah atau geografi gagal dimuat. Periksa path file di folder public dan konsol untuk error 400/404.');
                }

                const processed = processData({
                    paudData, sdData, smpData, pkbmData,
                    kegiatanPaudData, kegiatanSdData, kegiatanSmpData, kegiatanPkbmData,
                    kecGeoData, desaGeoData
                });
                
                setAllData(processed);

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAndProcessData();
    }, [processData]);

    return { ...allData, loading, error };
};

export default useSchoolData;