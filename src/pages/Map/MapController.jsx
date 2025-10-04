// src/pages/Map/MapController.jsx - VERSI BARU DENGAN SEMUA LOGIKA

import React, { useMemo } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { createClusterIcon } from '../../services/utils/mapUtils';
import KecamatanPopup from './Popups'; // Popup untuk klaster
import SchoolFacilityPopup from './SchoolFacilityPopup'; // Popup baru untuk detail sekolah

// Fungsi helper untuk mendapatkan koordinat pusat kecamatan dari GeoJSON
const getKecamatanCenter = (kecamatanName, geoJson) => {
    if (!geoJson || !geoJson.features) return null;
    const feature = geoJson.features.find(
        f => f.properties.KECAMATAN?.toLowerCase() === kecamatanName?.toLowerCase()
    );
    if (!feature) return null;
    
    // Hitung centroid dari poligon
    const coords = feature.geometry.coordinates[0][0];
    if (!coords) return null;
    let latSum = 0, lonSum = 0;
    coords.forEach(coord => {
        lonSum += coord[0];
        latSum += coord[1];
    });
    return [latSum / coords.length, lonSum / coords.length];
};


const MapController = ({ schools, geoData, viewMode, filters }) => {
    const map = useMap();

    // Memoize kalkulasi klaster untuk performa
    const kecamatanClusters = useMemo(() => {
        if (viewMode === 'DETAIL_MARKERS' || !schools || !geoData?.kecamatan) {
            return [];
        }

        const clusters = {};

        schools.forEach(school => {
            const kec = school.kecamatan;
            if (!kec) return;

            if (!clusters[kec]) {
                clusters[kec] = {
                    count: 0,
                    jenjangCount: { PAUD: 0, SD: 0, SMP: 0, PKBM: 0 },
                    position: getKecamatanCenter(kec, geoData.kecamatan)
                };
            }
            
            clusters[kec].count++;
            if (clusters[kec].jenjangCount[school.jenjang] !== undefined) {
                clusters[kec].jenjangCount[school.jenjang]++;
            }
        });
        
        // Jika posisi dari GeoJSON tidak ada, hitung dari rata-rata sekolah
        Object.keys(clusters).forEach(kec => {
            if (!clusters[kec].position) {
                const schoolsInKec = schools.filter(s => s.kecamatan === kec);
                if(schoolsInKec.length > 0) {
                    const avgLat = schoolsInKec.reduce((sum, s) => sum + s.latitude, 0) / schoolsInKec.length;
                    const avgLon = schoolsInKec.reduce((sum, s) => sum + s.longitude, 0) / schoolsInKec.length;
                    clusters[kec].position = [avgLat, avgLon];
                }
            }
        });

        return Object.entries(clusters)
            .map(([name, data]) => ({ name, ...data }))
            .filter(c => c.count > 0 && c.position);

    }, [schools, viewMode, geoData]);

    // RENDER BERDASARKAN VIEW MODE
    if (viewMode === 'INITIAL_CLUSTER' || viewMode === 'CONDITION_CLUSTER') {
        return (
            <>
                {kecamatanClusters.map(cluster => (
                    <Marker
                        key={cluster.name}
                        position={cluster.position}
                        icon={createClusterIcon(cluster.count)}
                    >
                        <Popup>
                            <KecamatanPopup 
                                kecamatanName={cluster.name}
                                total={cluster.count}
                                jenjangCount={cluster.jenjangCount}
                                activeFilter={filters.kondisi}
                            />
                        </Popup>
                    </Marker>
                ))}
            </>
        );
    }

    if (viewMode === 'DETAIL_MARKERS') {
        return (
            <>
                {schools.map(school => (
                    <Marker
                        key={school.id}
                        position={[school.latitude, school.longitude]}
                    >
                        <Popup>
                            <SchoolFacilityPopup school={school} />
                        </Popup>
                    </Marker>
                ))}
            </>
        );
    }

    return null; // Tampilan default jika tidak ada mode yang cocok
};

export default MapController;