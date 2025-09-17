// src/pages/Map/MapController.jsx
import { useEffect } from "react";
import { useMap } from "react-leaflet";

// Komponen ini bertugas untuk mengontrol peta secara terprogram, seperti zoom otomatis
const MapController = ({ filters, areaCenters, schools }) => {
    const map = useMap();

    useEffect(() => {
        const { jenjang, kecamatan, desa } = filters;

        // Logika untuk zoom otomatis ketika filter desa lengkap dipilih
        if (jenjang !== 'all' && kecamatan !== 'all' && desa !== 'all') {
            const desaKey = `${desa}-${kecamatan}`;
            if (areaCenters.desa[desaKey]) {
                map.flyTo(areaCenters.desa[desaKey], 15, { duration: 1.5 });
            } else if (areaCenters.kecamatan[kecamatan]) {
                // Fallback ke pusat kecamatan jika pusat desa tidak ditemukan
                map.flyTo(areaCenters.kecamatan[kecamatan], 13, { duration: 1.5 });
            }

            // Cek jika ada data sekolah untuk filter yang dipilih
            const hasData = schools.some(s => s.jenjang === jenjang && s.kecamatan === kecamatan && s.village === desa);
            if (!hasData) {
                // Beri notifikasi jika tidak ada data ditemukan
                setTimeout(() => {
                    alert(`Tidak ada data sekolah untuk Jenjang ${jenjang} di Desa ${desa}, Kecamatan ${kecamatan}.`);
                }, 1600); // Tunda sedikit agar animasi zoom selesai
            }
        }
    }, [filters, areaCenters, schools, map]); // Efek ini hanya berjalan saat dependensi berubah

    return null; // Komponen ini tidak merender apapun di DOM
};

export default MapController;