// src/components/common/Map/SimpleMap.jsx

import React, { useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import styles from './SimpleMap.module.css';

// Fungsi untuk membuat ikon angka (cluster kecamatan)
const createKecamatanIcon = (total) => {
    return L.divIcon({
        html: `<div class="${styles.kecamatanMarker}">${total}</div>`,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });
};

const SimpleMap = ({ schools, geoData, initialCenter, initialZoom, isDesaFiltered }) => {
    
    // Logika untuk mengelompokkan sekolah per kecamatan
    const schoolsByKecamatan = useMemo(() => {
        if (isDesaFiltered) return []; // Jangan hitung jika sudah filter desa

        const aggregation = schools.reduce((acc, school) => {
            if (!school.kecamatan || !school.coordinates) return acc;
            
            if (!acc[school.kecamatan]) {
                acc[school.kecamatan] = {
                    nama: school.kecamatan,
                    totalSekolah: 0,
                    jenjang: { PAUD: 0, SD: 0, SMP: 0, PKBM: 0 },
                    latitudes: [],
                    longitudes: []
                };
            }
            
            acc[school.kecamatan].totalSekolah++;
            const jenjang = school.jenjang?.toUpperCase() || 'LAINNYA';
            if (acc[school.kecamatan].jenjang[jenjang] !== undefined) {
                acc[school.kecamatan].jenjang[jenjang]++;
            }
            acc[school.kecamatan].latitudes.push(school.coordinates[0]);
            acc[school.kecamatan].longitudes.push(school.coordinates[1]);

            return acc;
        }, {});

        return Object.values(aggregation).map(kec => {
            const avgLat = kec.latitudes.reduce((a, b) => a + b, 0) / kec.latitudes.length;
            const avgLng = kec.longitudes.reduce((a, b) => a + b, 0) / kec.longitudes.length;
            return { ...kec, position: [avgLat, avgLng] };
        });

    }, [schools, isDesaFiltered]);

    const renderMarkers = () => {
        // PERMINTAAN #3: Jika filter desa aktif, tampilkan marker individual
        if (isDesaFiltered) {
            return schools.map(school => (
                <Marker key={school.npsn} position={school.coordinates}>
                    <Popup>
                        <b>{school.nama}</b><br/>
                        NPSN: {school.npsn}<br/>
                        Fasilitas: 
                        Baik ({school.fasilitas?.baik || 0}), 
                        Rusak Sedang ({school.fasilitas?.rusakSedang || 0}), 
                        Rusak Berat ({school.fasilitas?.rusakBerat || 0})
                    </Popup>
                </Marker>
            ));
        }

        // PERMINTAAN #2: Jika tidak, tampilkan cluster per kecamatan (logika awal Anda)
        return schoolsByKecamatan.map(kec => (
            <Marker key={kec.nama} position={kec.position} icon={createKecamatanIcon(kec.totalSekolah)}>
                <Popup>
                    <b>Kecamatan {kec.nama}</b><br />
                    Total Sekolah: {kec.totalSekolah}<br /><br />
                    - PAUD: {kec.jenjang.PAUD} sekolah<br />
                    - SD: {kec.jenjang.SD} sekolah<br />
                    - SMP: {kec.jenjang.SMP} sekolah<br />
                    - PKBM: {kec.jenjang.PKBM} sekolah
                </Popup>
            </Marker>
        ));
    };

    return (
        <MapContainer 
            center={initialCenter} 
            zoom={initialZoom} 
            className={styles.mapContainer}
            scrollWheelZoom={true}
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {/* PERMINTAAN #4: Batas wilayah Garut */}
            {geoData && <GeoJSON data={geoData} style={() => ({ color: '#3b82f6', weight: 2, opacity: 0.6 })} />}
            {renderMarkers()}
        </MapContainer>
    );
};

export default SimpleMap;