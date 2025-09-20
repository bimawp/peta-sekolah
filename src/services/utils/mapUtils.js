import L from 'leaflet';

// Impor ikon berwarna dari sumber eksternal yang andal
const redIconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png';
const orangeIconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png';
const greenIconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png';
const shadowUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png';

// Buat instance ikon di awal untuk performa yang lebih baik
const baseIcon = {
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
};

const greenIcon = L.icon({ ...baseIcon, iconUrl: greenIconUrl });
const orangeIcon = L.icon({ ...baseIcon, iconUrl: orangeIconUrl });
const redIcon = L.icon({ ...baseIcon, iconUrl: redIconUrl });

/**
 * Menganalisis kondisi sekolah berdasarkan data kerusakan.
 * Fungsi ini diekspor untuk digunakan di schoolApi.js
 */
export const analyzeFacilityCondition = (school) => {
  const heavyDamage = (school.classrooms_heavy_damage || 0) + (school.library_heavy_damage || 0);
  const moderateDamage = (school.classrooms_moderate_damage || 0) + (school.library_moderate_damage || 0);

  if (heavyDamage > 0) {
    return 'Rusak Berat';
  }
  if (moderateDamage > 0) {
    return 'Rusak Sedang';
  }
  return 'Baik';
};

/**
 * Mengembalikan ikon Leaflet berwarna berdasarkan kondisi sekolah.
 * Fungsi ini diekspor untuk digunakan di Map.jsx
 */
export const getIcon = (condition) => {
  switch (condition) {
    case 'Rusak Berat':
      return redIcon;
    case 'Rusak Sedang':
      return orangeIcon;
    case 'Baik':
    default:
      return greenIcon;
  }
};