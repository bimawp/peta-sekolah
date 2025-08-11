import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from '@changey/react-leaflet-markercluster';
import '@changey/react-leaflet-markercluster/dist/styles.min.css';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

// Fix untuk icon default Leaflet - gunakan CDN atau icon bawaan
delete L.Icon.Default.prototype._getIconUrl;
// Gabungkan pengaturan ikon baru
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/marker-icon-2x.png',
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
});

// Custom icon untuk marker dengan sumber yang dapat diakses
const customIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function Map() {
  const [sekolah, setSekolah] = useState([]);

  useEffect(() => {
    setSekolah([
      { id: 1, name: "SDN Contoh 1", lat: -7.2155, lng: 107.8932, alamat: "Jalan A" },
      { id: 2, name: "SDN Contoh 2", lat: -7.2170, lng: 107.8900, alamat: "Jalan B" },
      { id: 3, name: "SMP Contoh 3", lat: -7.2200, lng: 107.8925, alamat: "Jalan C" },
    ]);
  }, []);

  return (
      <MapContainer
        center={[-7.2170, 107.8930]}
        zoom={13}
        style={{ height: '100%', width: '100%' }} // ganti dari '100vh'
        scrollWheelZoom={true}
      >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MarkerClusterGroup>
        {sekolah.map((sk) => (
          <Marker key={sk.id} position={[sk.lat, sk.lng]} icon={customIcon}>
            <Popup>
              <strong>{sk.name}</strong><br />
              {sk.alamat}
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
