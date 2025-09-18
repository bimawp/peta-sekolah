// src/pages/Map/MapController.jsx
import { useEffect } from "react";
import { useMap } from "react-leaflet";

// Komponen ini bertugas untuk mengontrol peta secara terprogram, seperti zoom otomatis
const MapController = ({ filters, areaCenters, schools }) => {
    const map = useMap();

    useEffect(() => {
        // Pastikan schools adalah array untuk mencegah error
        if (!Array.isArray(schools)) return;

        const { jenjang, kecamatan, desa } = filters;

        // Logika untuk zoom otomatis ketika filter desa lengkap dipilih
        if (kecamatan !== 'all' && desa !== 'all') {
            const desaKey = `${desa}-${kecamatan}`;
            if (areaCenters.desa[desaKey]) {
                map.flyTo(areaCenters.desa[desaKey], 15, { duration: 1.5 });
            } else if (areaCenters.kecamatan[kecamatan]) {
                // Fallback ke pusat kecamatan jika pusat desa tidak ditemukan
                map.flyTo(areaCenters.kecamatan[kecamatan], 13, { duration: 1.5 });
            }
        } else if (kecamatan !== 'all') {
             if (areaCenters.kecamatan[kecamatan]) {
                map.flyTo(areaCenters.kecamatan[kecamatan], 13, { duration: 1.5 });
            }
        }
    }, [filters, areaCenters, schools, map]); // Efek ini hanya berjalan saat dependensi berubah

    return null; // Komponen ini tidak merender apapun di DOM
};

export default MapController;