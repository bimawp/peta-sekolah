// src/components/common/Map/SimpleMap.jsx - FINAL REVISION FOR CONDITIONAL MARKERS/POPUPS DAN FIX CRASH

import L from 'leaflet'; 
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';

import styles from './SimpleMap.module.css'; 
import { useEffect } from 'react';

// 4. Batasan Panning untuk Garut
const MAX_BOUNDS = [
    [-7.6, 107.5], // South West Lat, Lng
    [-6.7, 108.5]  // North East Lat, Lng
];

// --- FUNGSI CUSTOM POPUP UNTUK CLUSTER (POIN 2) ---
const createClusterPopupContent = (cluster) => {
    const children = cluster.getAllChildMarkers();
    
    // Hitung jumlah sekolah per jenjang di dalam cluster
    const jenjangCounts = children.reduce((acc, marker) => {
        
        // FIX STABILITAS: Menambahkan pengecekan defensif untuk menghindari crash
        const schoolData = marker.options?.schoolData; 
        
        if (!schoolData || !schoolData.jenjang) {
             return acc; 
        }

        const jenjang = schoolData.jenjang || 'Lainnya';
        acc[jenjang] = (acc[jenjang] || 0) + 1;
        return acc;
    }, {});
    
    const total = children.length;
    
    let content = `<div class="${styles.clusterPopup}">`;
    content += `<h4>Total ${total} Sekolah di Area Ini</h4>`;
    
    const jenjangKeys = Object.keys(jenjangCounts);

    if (jenjangKeys.length === 0) {
        content += `<p>Detail jenjang tidak tersedia atau data tidak lengkap.</p>`;
    } else {
        content += '<ul>';
        const sortedJenjang = Object.entries(jenjangCounts).sort(([, a], [, b]) => b - a);
        sortedJenjang.forEach(([jenjang, count]) => {
            content += `<li><strong>${jenjang}</strong>: ${count} sekolah</li>`;
        });
        content += '</ul>';
    }
    
    content += '</div>';
    
    return content;
};
// -----------------------------------------------------

// 2. Fungsi untuk membuat custom cluster icon (dengan angka)
const createClusterCustomIcon = (cluster) => {
    const count = cluster.getChildCount();
    let size = 'small';
    let color = '#3b82f6'; // Biru
    if (count > 100) {
        size = 'large';
        color = '#ef4444'; // Merah
    } else if (count > 10) {
        size = 'medium';
        color = '#f59e0b'; // Oranye
    }

    return new L.DivIcon({
        html: `<div class="${styles['custom-cluster-icon']} ${styles[`custom-cluster-${size}`]}" style="background-color: ${color}; box-shadow: 0 0 0 4px ${color}40;"><span>${count}</span></div>`,
        className: 'marker-cluster',
        iconSize: new L.Point(40, 40) 
    });
};

// --- FUNGSI CUSTOM POPUP UNTUK MARKER INDIVIDUAL (POIN 3) ---
const renderFacilityPopupContent = (school) => {
    const { fasilitas } = school;
    return `
        <div class="${styles.facilityPopup}">
            <h4>${school.nama} (${school.jenjang})</h4>
            <p><strong>NPSN:</strong> ${school.npsn}</p>
            <p><strong>Lokasi:</strong> ${school.desa}, ${school.kecamatan}</p>
            <h5>Kondisi Ruang Kelas:</h5>
            <ul>
                <li style="color: #10b981;">✅ Baik: ${fasilitas?.baik || 0} unit</li>
                <li style="color: #f59e0b;">⚠️ Rusak Sedang: ${fasilitas?.rusakSedang || 0} unit</li>
                <li style="color: #ef4444;">❌ Rusak Berat: ${fasilitas?.rusakBerat || 0} unit</li>
            </ul>
        </div>
    `;
};
// -------------------------------------------------------------

// Component Controller untuk menyesuaikan tampilan peta (zoom/center)
const MapUpdateController = ({ validSchools, initialCenter, initialZoom, isDesaFiltered }) => {
    const map = useMap();
    
    useEffect(() => {
        if (validSchools.length > 0) {
            const bounds = L.latLngBounds(validSchools.map(school => school.coordinates));
            
            if (bounds.isValid()) {
                if (validSchools.length > 1) {
                    const maxZoom = isDesaFiltered ? 15 : initialZoom || 11; 
                    map.fitBounds(bounds, { padding: [30, 30], maxZoom: maxZoom });
                } else {
                    map.setView(validSchools[0].coordinates, 15);
                }
            } else {
                map.setView(initialCenter, initialZoom);
            }
        } else {
            map.setView(initialCenter, initialZoom);
        }
    }, [validSchools.length, isDesaFiltered, map, initialCenter, initialZoom]); 

    return null;
};

const SimpleMap = ({ schools, initialCenter, initialZoom, isDesaFiltered, ...props }) => {
    
    const validSchools = schools.filter(school => 
        school && 
        school.coordinates && 
        school.coordinates.length === 2 && 
        typeof school.coordinates[0] === 'number' &&
        typeof school.coordinates[1] === 'number'
    );

    const center = initialCenter || [-7.21, 107.91];
    const zoom = initialZoom || 10;
    
    // Memaksa re-render MapContainer
    const mapKey = `map-filter-${isDesaFiltered ? 'desa' : 'kec'}-${validSchools.length}`; 

    if (validSchools.length === 0) {
        return (
             <MapContainer 
                key="map-empty-state"
                center={center} 
                zoom={zoom} 
                maxBounds={MAX_BOUNDS} 
                minZoom={9} 
                maxZoom={18} 
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000, backgroundColor: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    Tidak ada data sekolah dengan lokasi valid untuk ditampilkan di peta.
                </div>
            </MapContainer>
        );
    }

    // Poin 3: Render marker individu jika filter sudah sampai desa
    if (isDesaFiltered) {
        return (
            <MapContainer 
                key={mapKey} 
                center={center} 
                zoom={zoom + 2} 
                maxBounds={MAX_BOUNDS} 
                minZoom={9} 
                maxZoom={18} 
                scrollWheelZoom={true} 
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <MapUpdateController 
                    validSchools={validSchools} 
                    initialCenter={center} 
                    initialZoom={zoom}
                    isDesaFiltered={isDesaFiltered}
                />
                {validSchools.map(school => (
                    <Marker 
                        key={school.npsn} 
                        position={school.coordinates}
                        options={{ schoolData: school }} 
                    >
                        {/* Pop-up detail fasilitas (Poin 3) */}
                        <Popup>
                            <div dangerouslySetInnerHTML={{ __html: renderFacilityPopupContent(school) }} />
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        );
    }

    // Poin 2: Render MarkerClusterGroup (Default/Kecamatan filter)
    return (
        <MapContainer 
            key={mapKey} 
            center={center} 
            zoom={zoom} 
            maxBounds={MAX_BOUNDS} // Batasan Panning Garut (Poin 4)
            minZoom={9} 
            maxZoom={18} 
            scrollWheelZoom={true} 
            style={{ height: '100%', width: '100%' }}
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <MapUpdateController 
                validSchools={validSchools} 
                initialCenter={center} 
                initialZoom={zoom}
                isDesaFiltered={isDesaFiltered}
            />

            <MarkerClusterGroup 
                iconCreateFunction={createClusterCustomIcon} // Ikon angka (Poin 2)
                showCoverageOnHover={false}
                zoomToBoundsOnClick={true}
                disableClusteringAtZoom={13} 
                
                eventHandlers={{
                    clusterclick: (e) => {
                        const content = createClusterPopupContent(e.layer);
                        L.popup({ minWidth: 200 })
                          .setLatLng(e.layer.getLatLng())
                          .setContent(content)
                          .openOn(e.target._map);
                    }
                }}
            >
                {validSchools.map(school => (
                    <Marker 
                        key={school.npsn} 
                        position={school.coordinates}
                        options={{ schoolData: school }} 
                    >
                        <Popup>
                            <b>{school.nama}</b><br/>
                            NPSN: {school.npsn}<br/>
                            Jenjang: {school.jenjang}<br/>
                        </Popup>
                    </Marker>
                ))}
            </MarkerClusterGroup>
        </MapContainer>
    );
};

export default SimpleMap;