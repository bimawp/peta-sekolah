import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const MapController = ({ schools }) => {
    const map = useMap();
    const isInitialLoad = useRef(true);

    useEffect(() => {
        if (!schools || schools.length === 0) {
            if (isInitialLoad.current) return;
            map.flyTo([-7.2278, 107.9087], 10); // Zoom kembali ke Garut jika filter kosong
            return;
        }

        const bounds = new L.LatLngBounds(schools.map(s => [s.latitude, s.longitude]));

        if (bounds.isValid()) {
            if (isInitialLoad.current) {
                map.fitBounds(bounds, { padding: [50, 50] });
                isInitialLoad.current = false;
            } else {
                map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
            }
        }
    }, [schools, map]);

    return null;
};

export default MapController;