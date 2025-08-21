import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import MarkerClusterGroup from "react-leaflet-cluster";
import styles from "./Map.module.css";

const defaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const Map = ({ filter, schools = [] }) => {
  const [sekolah, setSekolah] = useState([]);
  const [filteredSekolah, setFilteredSekolah] = useState([]);
  const [visibleSekolah, setVisibleSekolah] = useState([]);
  const [geoKecamatan, setGeoKecamatan] = useState(null);
  const [geoDesa, setGeoDesa] = useState(null);
  const mapRef = useRef();

  const formatData = (raw, jenjang) => {
    let result = [];
    Object.keys(raw).forEach((kec) => {
      raw[kec].forEach((s) => {
        if (s.coordinates && s.coordinates.length === 2) {
          result.push({
            nama: s.name,
            npsn: s.npsn,
            alamat: s.address,
            kecamatan: kec,
            desa: s.desa || "",
            lintang: s.coordinates[0],
            bujur: s.coordinates[1],
            jenjang,
            fasilitas: s.fasilitas || null,
          });
        }
      });
    });
    return result;
  };

  const formatSchoolsData = (schoolsArray) => {
    return schoolsArray.map(school => ({
      nama: school.namaSekolah || school.nama_sekolah || school.school_name || school.nama || 'Unknown',
      npsn: school.npsn || school.school_id || school.id || '',
      alamat: school.alamat || school.address || school.alamat_sekolah || '',
      kecamatan: school.kecamatan || school.kec || school.kecamatan_nama || school.subdistrict || '',
      desa: school.desa || school.kelurahan || school.desa_kelurahan || school.village || '',
      lintang: school.latitude || school.lat || school.lintang || school.koordinat?.lat || null,
      bujur: school.longitude || school.lng || school.bujur || school.koordinat?.lng || null,
      jenjang: school.jenjang || school.tingkat_pendidikan || school.level || school.bentuk_pendidikan || 'Unknown',
      fasilitas: school.fasilitas || school.kondisiKelas || school.kondisi_ruang_kelas || null,
    })).filter(s => s.lintang && s.bujur && !isNaN(s.lintang) && !isNaN(s.bujur));
  };

  // Load data sekolah - prioritaskan data dari props schools
  useEffect(() => {
    if (schools && schools.length > 0) {
      // Jika ada data schools dari props, gunakan itu
      const formattedSchools = formatSchoolsData(schools);
      setSekolah(formattedSchools);
      setFilteredSekolah(formattedSchools);
    } else {
      // Fallback ke data API asli jika tidak ada data dari props
      Promise.all([
        fetch("https://peta-sekolah.vercel.app/paud/data/paud.json").then((r) => r.json()),
        fetch("https://peta-sekolah.vercel.app/sd/data/sd_new.json").then((r) => r.json()),
        fetch("https://peta-sekolah.vercel.app/smp/data/smp.json").then((r) => r.json()),
        fetch("https://peta-sekolah.vercel.app/pkbm/data/pkbm.json").then((r) => r.json()),
      ]).then(([paud, sd, smp, pkbm]) => {
        const allSekolah = [
          ...formatData(paud, "PAUD"),
          ...formatData(sd, "SD"),
          ...formatData(smp, "SMP"),
          ...formatData(pkbm, "PKBM"),
        ];
        setSekolah(allSekolah);
        setFilteredSekolah(allSekolah);
      }).catch(error => {
        console.error("Error loading school data:", error);
        setSekolah([]);
        setFilteredSekolah([]);
      });
    }
  }, [schools]);

  // Load GeoJSON data
  useEffect(() => {
    fetch("https://peta-sekolah.vercel.app/data/kecamatan.geojson")
      .then((r) => r.json())
      .then((data) => {
        // Filter fitur yang valid
        const safeData = {
          ...data,
          features: data.features.filter((f) => f.geometry?.coordinates),
        };
        setGeoKecamatan(safeData);
      })
      .catch(error => {
        console.error("Error loading kecamatan data:", error);
        setGeoKecamatan(null);
      });
  }, []);

  useEffect(() => {
    if (filter?.kecamatan && filter.kecamatan !== "all" && filter.kecamatan !== "Semua Kecamatan") {
      fetch("https://peta-sekolah.vercel.app/data/desa.geojson")
        .then((r) => r.json())
        .then((data) => {
          const desaFiltered = {
            ...data,
            features: data.features
              .filter((f) => f.geometry?.coordinates)
              .filter((f) => {
                const kecamatan = f.properties?.district || f.properties?.KECAMATAN || 
                               f.properties?.kecamatan || f.properties?.kec || 
                               f.properties?.NAMKEC || f.properties?.kecamatan_nama;
                return kecamatan === filter.kecamatan;
              }),
          };
          setGeoDesa(desaFiltered);
        })
        .catch(error => {
          console.error("Error loading desa data:", error);
          setGeoDesa(null);
        });
    } else {
      setGeoDesa(null);
    }
  }, [filter?.kecamatan]);

  // Filter sekolah berdasarkan filter dari props
  useEffect(() => {
    let filtered = sekolah;

    if (filter?.jenjang && filter.jenjang !== "all" && filter.jenjang !== "Semua Jenjang") {
      filtered = filtered.filter((s) => s.jenjang === filter.jenjang);
    }
    
    if (filter?.kecamatan && filter.kecamatan !== "all" && filter.kecamatan !== "Semua Kecamatan") {
      filtered = filtered.filter((s) => s.kecamatan === filter.kecamatan);
    }
    
    if (filter?.desa && filter.desa !== "all" && filter.desa !== "Semua Desa") {
      filtered = filtered.filter((s) => s.desa === filter.desa);
    }

    setFilteredSekolah(filtered);
  }, [filter, sekolah]);

  // Fungsi untuk update visible markers
  const updateVisibleMarkers = useCallback((map) => {
    if (!map || filteredSekolah.length === 0) {
      setVisibleSekolah([]);
      return;
    }
    
    try {
      const bounds = map.getBounds();
      const visible = filteredSekolah.filter((s) => {
        // Pastikan koordinat valid sebelum checking bounds
        if (!s.lintang || !s.bujur || 
            isNaN(s.lintang) || isNaN(s.bujur)) {
          return false;
        }
        return bounds.contains([s.lintang, s.bujur]);
      });
      setVisibleSekolah(visible);
    } catch (error) {
      console.warn("Error updating visible markers:", error);
      // Fallback: tampilkan semua filtered sekolah jika ada error
      setVisibleSekolah(filteredSekolah);
    }
  }, [filteredSekolah]);

  // Component untuk handle map events
  const MapEventHandler = () => {
    const map = useMapEvents({
      moveend: () => {
        updateVisibleMarkers(map);
      },
      zoomend: () => {
        updateVisibleMarkers(map);
      }
    });

    // Initial load visible markers
    useEffect(() => {
      if (map && filteredSekolah.length > 0) {
        // Delay sedikit untuk memastikan map sudah ready
        const timer = setTimeout(() => {
          updateVisibleMarkers(map);
        }, 100);
        
        return () => clearTimeout(timer);
      } else if (map && filteredSekolah.length === 0) {
        setVisibleSekolah([]);
      }
    }, [map, filteredSekolah, updateVisibleMarkers]);

    return null;
  };

  const getFasilitasColor = (f) => {
    if (typeof f === 'object') {
      // Jika fasilitas adalah object (kondisiKelas)
      if (f.rusakBerat > 0 || f.rusak_berat > 0 || f.heavily_damaged > 0) return "red";
      if (f.rusakSedang > 0 || f.rusak_sedang > 0 || f.slightly_damaged > 0) return "orange";
      if (f.baik > 0 || f.good > 0 || f.bagus > 0) return "green";
      return "gray";
    }
    
    // Jika fasilitas adalah string
    if (f === "Rusak Berat") return "red";
    if (f === "Rusak Sedang") return "orange";
    if (f === "Kekurangan RKB") return "yellow";
    if (f === "Rehabilitasi") return "green";
    if (f === "Pembangunan RKB") return "blue";
    return "gray";
  };

  const getFasilitasText = (f) => {
    if (typeof f === 'object') {
      const baik = f.baik || f.good || f.bagus || 0;
      const rusakSedang = f.rusakSedang || f.rusak_sedang || f.slightly_damaged || 0;
      const rusakBerat = f.rusakBerat || f.rusak_berat || f.heavily_damaged || 0;
      return `Baik: ${baik}, Rusak Sedang: ${rusakSedang}, Rusak Berat: ${rusakBerat}`;
    }
    return f;
  };

  const SafeGeoJSON = ({ data, style }) => {
    const safeOnEachFeature = (feature, layer) => {
      try {
        if (feature.properties && (feature.properties.name || feature.properties.district || feature.properties.village)) {
          const name = feature.properties.name || feature.properties.district || feature.properties.village || 'Unknown';
          layer.bindPopup(name);
        }
      } catch (e) {
        console.warn("GeoJSON feature error", e);
      }
    };
    
    return <GeoJSON 
      data={data} 
      style={style} 
      onEachFeature={safeOnEachFeature}
      key={JSON.stringify(data)} // Force re-render when data changes
    />;
  };

  const kecamatanStyle = { color: "#555", weight: 1, fillOpacity: 0.05 };
  const desaStyle = { color: "#aaa", weight: 0.5, fillOpacity: 0.02 };

  const Legend = () => {
    const map = useMap();
    useEffect(() => {
      const legend = L.control({ position: "bottomright" });
      legend.onAdd = () => {
        const div = L.DomUtil.create("div", styles.legend);
        div.innerHTML = `
          <h4>Keterangan</h4>
          <div><img src="https://unpkg.com/leaflet/dist/images/marker-icon.png" style="height:18px"/> Lokasi Sekolah</div>
          <div><span style="background:red; width:12px; height:12px; display:inline-block; margin-right:5px;"></span> Rusak Berat</div>
          <div><span style="background:orange; width:12px; height:12px; display:inline-block; margin-right:5px;"></span> Rusak Sedang</div>
          <div><span style="background:yellow; width:12px; height:12px; display:inline-block; margin-right:5px;"></span> Kekurangan RKB</div>
          <div><span style="background:green; width:12px; height:12px; display:inline-block; margin-right:5px;"></span> Kondisi Baik</div>
          <div><span style="background:blue; width:12px; height:12px; display:inline-block; margin-right:5px;"></span> Pembangunan RKB</div>
          <div style="margin-top:8px; font-size:11px; color:#666;">
            Total: ${filteredSekolah.length} sekolah
          </div>
        `;
        return div;
      };
      legend.addTo(map);
      return () => {
        try {
          legend.remove();
        } catch (e) {
          console.warn("Error removing legend:", e);
        }
      };
    }, [map, filteredSekolah.length]);
    return null;
  };

  return (
    <div className={styles.mapWrapper}>
      <MapContainer
        center={[-7.2279, 107.9087]}
        zoom={11}
        scrollWheelZoom={true}
        style={{ height: "90vh", width: "100%" }}
        ref={mapRef}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {geoKecamatan && <SafeGeoJSON data={geoKecamatan} style={kecamatanStyle} />}
        {geoDesa && <SafeGeoJSON data={geoDesa} style={desaStyle} />}
        <MarkerClusterGroup chunkedLoading>
          {visibleSekolah.map((s, i) => {
            // Validasi koordinat sebelum render marker
            if (!s.lintang || !s.bujur || isNaN(s.lintang) || isNaN(s.bujur)) {
              return null;
            }
            
            return (
              <Marker key={`${s.npsn || i}-${s.nama}`} position={[s.lintang, s.bujur]} icon={defaultIcon}>
                <Popup>
                  <div style={{ minWidth: '200px' }}>
                    <strong>{s.nama}</strong><br />
                    <strong>Jenjang:</strong> {s.jenjang}<br />
                    {s.alamat && (
                      <><strong>Alamat:</strong> {s.alamat}<br /></>
                    )}
                    <strong>Kecamatan:</strong> {s.kecamatan}<br />
                    {s.desa && (
                      <><strong>Desa:</strong> {s.desa}<br /></>
                    )}
                    {s.npsn && (
                      <><strong>NPSN:</strong> {s.npsn}<br /></>
                    )}
                    {s.fasilitas && (
                      <>
                        <div style={{ marginTop: 8 }}>
                          <span style={{
                            display:"inline-block", width:12, height:12,
                            borderRadius:"50%", background:getFasilitasColor(s.fasilitas),
                            marginRight:6
                          }}></span>
                          <strong>Kondisi:</strong> {getFasilitasText(s.fasilitas)}
                        </div>
                      </>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
        <MapEventHandler />
        <Legend />
      </MapContainer>
    </div>
  );
};

export default Map;