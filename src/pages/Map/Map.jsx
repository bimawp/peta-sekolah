import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Override icon default supaya tidak error asset
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Definisi custom icon (optional)
const customIcon = new L.Icon({
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function Map() {
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    setLocations([
      { id: 1, name: 'SDN Contoh 1', lat: -7.2155, lng: 107.8932, alamat: 'Jalan A' },
      { id: 2, name: 'SDN Contoh 2', lat: -7.217, lng: 107.89, alamat: 'Jalan B' },
      { id: 3, name: 'SMP Contoh 3', lat: -7.22, lng: 107.8925, alamat: 'Jalan C' },
    ]);
  }, []);

  return (
    <div style={{ height: '450px', maxWidth: '900px', margin: '0 auto' }}>
       <MapContainer center={[-7.217, 107.893]} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MarkerClusterGroup>
          {locations.map((loc) => (
            <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={customIcon}>
              <Popup>
                <strong>{loc.name}</strong>
                <br />
                {loc.alamat}
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
