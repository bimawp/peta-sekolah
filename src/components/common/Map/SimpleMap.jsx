// ... import lainnya
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';

// ... (kode css import)

const SimpleMap = ({ schools, ...props }) => {
    // ================== PERBAIKAN DI SINI ==================
    // Filter data SEKALI di sini untuk memastikan hanya data valid yang dirender
    const validSchools = schools.filter(school => 
        school && 
        school.coordinates && 
        typeof school.coordinates[0] === 'number' &&
        typeof school.coordinates[1] === 'number'
    );
    // =======================================================

    if (validSchools.length === 0) {
        return <div>Tidak ada data sekolah dengan lokasi valid untuk ditampilkan di peta.</div>;
    }

    return (
        <MapContainer center={[-7.21, 107.91]} zoom={10} style={{ height: '100%', width: '100%' }}>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <MarkerClusterGroup>
                {/* Gunakan 'validSchools' yang sudah di-filter */}
                {validSchools.map(school => (
                    <Marker 
                        key={school.npsn} 
                        position={school.coordinates}
                    >
                        <Popup>
                            <b>{school.nama}</b><br/>
                            NPSN: {school.npsn}<br/>
                            Jenjang: {school.jenjang}<br/>
                            Alamat: {school.alamat}
                        </Popup>
                    </Marker>
                ))}
            </MarkerClusterGroup>
        </MapContainer>
    );
};

export default SimpleMap;