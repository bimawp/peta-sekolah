// src/services/utils/mapUtils.js
import L from 'leaflet';

// Import icon images
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Create custom icons for different school levels
const createIcon = (color = '#007bff') => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

export const getIcon = (level) => {
  switch (level?.toLowerCase()) {
    case 'tk':
    case 'paud':
      return createIcon('#ff6b6b'); // Red for early childhood
    case 'sd':
    case 'mi':
      return createIcon('#4ecdc4'); // Teal for elementary
    case 'smp':
    case 'mts':
      return createIcon('#45b7d1'); // Blue for junior high
    case 'sma':
    case 'smk':
    case 'ma':
      return createIcon('#96ceb4'); // Green for senior high
    default:
      return createIcon('#feca57'); // Yellow for others
  }
};