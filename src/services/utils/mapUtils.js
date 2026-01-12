// src/services/utils/mapUtils.js - VERSI DEFINITIF UNTUK IKON

import L from 'leaflet';
// [PERBAIKAN] Impor gambar secara eksplisit agar Vite memprosesnya
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Perbaikan untuk ikon marker default. Path sekarang dijamin benar.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

// Fungsi untuk membuat ikon klaster (sudah benar)
export const createClusterIcon = (count) => {
  let size = 40, fontSize = 14;
  if (count >= 100) { size = 50; fontSize = 16; }
  else if (count < 10) { size = 30; fontSize = 12; }
  const html = `<div style="width:${size}px;height:${size}px;border-radius:50%;background-color:rgba(67,56,202,0.9);color:white;font-size:${fontSize}px;font-weight:bold;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 4px 8px rgba(0,0,0,0.3);cursor:pointer;">${count}</div>`;
  return L.divIcon({ html, className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
};