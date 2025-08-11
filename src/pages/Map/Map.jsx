import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayerGroup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom icons per jenis sekolah (ubah url ikon sesuai folder public/icons)
const icons = {
  PAUD: new L.Icon({
    iconUrl: '/icons/school.svg',
    iconSize: [25, 25],
  }),
  SD: new L.Icon({
    iconUrl: '/icons/school.svg',
    iconSize: [25, 25],
  }),
  SMP: new L.Icon({
    iconUrl: '/icons/school.svg',
    iconSize: [25, 25],
  }),
  PKBM: new L.Icon({
    iconUrl: '/icons/school.svg',
    iconSize: [25, 25],
  }),
};

// Contoh data sekolah di Garut
const locations = [
  { id: 1, name: 'PAUD Melati', type: 'PAUD', position: [-7.2155, 107.8932] },
  { id: 2, name: 'SD Negeri 1 Garut', type: 'SD', position: [-7.2170, 107.8900] },
  { id: 3, name: 'SMP Negeri 2 Garut', type: 'SMP', position: [-7.2200, 107.8925] },
  { id: 4, name: 'PKBM Garut', type: 'PKBM', position: [-7.2190, 107.8950] },
];

const Map = () => {
  const center = [-7.2170, 107.8930]; // pusat peta di Garut
  const zoomLevel = 13;

  return (
    <MapContainer center={center} zoom={zoomLevel} style={{ height: '100vh', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <LayerGroup>
        {locations.map(({ id, name, type, position }) => (
          <Marker key={id} position={position} icon={icons[type]}>
            <Popup>
              <strong>{name}</strong><br />
              Jenis: {type}
            </Popup>
          </Marker>
        ))}
      </LayerGroup>
    </MapContainer>
  );
};

export default Map;
