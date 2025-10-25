import React, { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import styles from "./SimpleMap.module.css";
import {
  applyFilters,
  makeKecamatanNumberIcon,
  getLatLngSafe,
  kecKey,
  uniqueBy,
  GARUT_BOUNDS
} from "./mapUtils";

const GARUT_CENTER = [-7.214, 107.903];
const GARUT_ZOOM = 10;

// Palet warna cerah dan jenuh seperti gambar pertama
function colorForKey(key) {
  const palette = [
    "#1e40af","#7c3aed","#d946ef","#f59e0b","#10b981","#06b6d4",
    "#3b82f6","#ec4899","#f97316","#0ea5e9","#eab308","#ef4444",
    "#14b8a6","#a855f7","#8b5cf6","#f43f5e","#06b6d4","#84cc16",
    "#6366f1","#fb923c","#ec4899","#10b981","#f97316","#3b82f6"
  ];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

export default function SimpleMap({
  schools = [],
  initialCenter = GARUT_CENTER,
  initialZoom = GARUT_ZOOM,
  filters = {},
  statsOverride,
}) {
  const mapRef = useRef(null);
  const fitTimer = useRef(null);
  const kabLayerRef = useRef(null);
  const kecLayerRef = useRef(null);
  const labelLayerRef = useRef(null);

  const schoolsUnique = useMemo(
    () =>
      uniqueBy(schools, function (s) {
        if (!s) return null;
        const npsn = (s && (s.npsn || s.NPSN) || "").toString().trim();
        if (npsn && npsn !== "undefined" && npsn !== "null") return "NPSN:" + npsn;
        const name = (s && (s.namaSekolah || s.name) || "").toString().trim().toUpperCase();
        const desa = (s && (s.desa || s.village) || "").toString().trim().toUpperCase();
        const kk  = kecKey((s && s.kecamatan) || "");
        return name + "::" + desa + "::" + kk;
      }),
    [schools]
  );

  const filtered = useMemo(function () { return applyFilters(schoolsUnique, filters); }, [schoolsUnique, filters]);

  const kecRekap = useMemo(function () {
    const group = new Map();
    for (const s of filtered) {
      const kk = kecKey(s && s.kecamatan);
      if (!group.has(kk)) group.set(kk, { k: kk, displayName: (s && s.kecamatan) || kk, total: 0, coords: [] });
      const g = group.get(kk);
      g.total += 1;
      const ll = getLatLngSafe(s);
      if (ll) g.coords.push(ll);
    }
    return Array.from(group.values()).map(function (g) {
      let center = GARUT_CENTER;
      if (g.coords.length) {
        const sum = g.coords.reduce(function (acc, cur) { return [acc[0] + cur[0], acc[1] + cur[1]]; }, [0, 0]);
        center = [sum[0] / g.coords.length, sum[1] / g.coords.length];
      }
      return { kecKey: g.k, displayName: g.displayName, total: g.total, center };
    });
  }, [filtered]);

  const badgeKecamatan = (statsOverride && statsOverride.kecamatanCount) != null ? statsOverride.kecamatanCount : kecRekap.length;
  const badgeSekolah   = (statsOverride && statsOverride.sekolahCount)   != null ? statsOverride.sekolahCount   : filtered.length;

  useEffect(function () {
    const map = mapRef.current;
    if (!map) return;

    if (!kabLayerRef.current) kabLayerRef.current = L.layerGroup().addTo(map);
    else kabLayerRef.current.clearLayers();

    const controller = new AbortController();
    const qKab = [
      "[out:json][timeout:30];",
      "relation[\"name\"=\"Kabupaten Garut\"][\"boundary\"=\"administrative\"][\"admin_level\"=\"6\"];",
      "out tags geom;"
    ].join("\n");

    (async function () {
      try {
        const urlKab = "https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(qKab);
        const resKab = await fetch(urlKab, { signal: controller.signal });
        if (!resKab.ok) return;
        const dataKab = await resKab.json();
        const el = (dataKab.elements && dataKab.elements[0]) || null;
        if (!el || !el.geometry || !el.geometry.length) return;

        const kabCoords = el.geometry.map(function (p) { return [p.lat, p.lon]; });
        const kabPoly = L.polygon(kabCoords, { color: "#1f2937", weight: 2, opacity: 1, fillOpacity: 0 });
        kabPoly.addTo(kabLayerRef.current);

        const world = [
          [-89.9, -179.9],
          [ 89.9, -179.9],
          [ 89.9,  179.9],
          [-89.9,  179.9]
        ];
        L.polygon([world, kabCoords], {
          stroke: false,
          fillColor: "#ffffff",
          fillOpacity: 0.2,
          interactive: false
        }).addTo(kabLayerRef.current);

        const kabBounds = L.latLngBounds(kabCoords.map(function (c) { return [c[0], c[1]]; }));
        map.setMaxBounds(kabBounds.pad(0.02));
        map.fitBounds(kabBounds.pad(0.05), { animate: true });

        fetchKecamatanInGarut(kabBounds, controller);
      } catch (e) {
        console.log("Boundary Garut optional:", e && e.message ? e.message : e);
        fetchKecamatanInGarut(null, controller);
      }
    })();

    function fetchKecamatanInGarut(kabBounds, ctrl) {
      if (!kecLayerRef.current) kecLayerRef.current = L.layerGroup().addTo(map);
      else kecLayerRef.current.clearLayers();
      if (!labelLayerRef.current) labelLayerRef.current = L.layerGroup().addTo(map);
      else labelLayerRef.current.clearLayers();

      const qKec = [
        "[out:json][timeout:30];",
        "area[\"name\"=\"Kabupaten Garut\"][\"boundary\"=\"administrative\"][\"admin_level\"=\"6\"]->.garut;",
        "(",
        "  relation(area.garut)[\"boundary\"=\"administrative\"][\"admin_level\"=\"7\"];",
        ");",
        "out tags geom;"
      ].join("\n");

      (async function () {
        try {
          const urlKec = "https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(qKec);
          const resKec = await fetch(urlKec, { signal: ctrl.signal });
          if (!resKec.ok) return;
          const dataKec = await resKec.json();

          for (const r of (dataKec.elements || [])) {
            const rawName =
              (r.tags && (r.tags.name || r.tags.NAMOBJ || r.tags.kecamatan || r.tags.Kecamatan)) || "";
            const kk = kecKey(rawName);
            const coords = (r.geometry || []).map(function (p) { return [p.lat, p.lon]; });
            if (coords.length < 3) continue;

            if (kabBounds) {
              const tmpBounds = L.latLngBounds(coords.map(function (c) { return [c[0], c[1]]; }));
              const ctr = tmpBounds.getCenter();
              if (!kabBounds.contains(ctr)) continue;
            }

            // Polygon berwarna dengan opacity tinggi seperti gambar pertama
            L.polygon(coords, {
              fillColor: colorForKey(kk),
              fillOpacity: 0.85,
              color: "#ffffff",
              weight: 2.5,
              opacity: 0.9
            }).addTo(kecLayerRef.current);

            // Label nama kecamatan di tengah poligon
            const b = L.latLngBounds(coords.map(function (c) { return [c[0], c[1]]; }));
            const c = b.getCenter();
            L.marker(c, {
              interactive: false,
              icon: L.divIcon({
                className: styles.kecLabel,
                html: "<div>" + rawName + "</div>"
              }),
              zIndexOffset: 800
            }).addTo(labelLayerRef.current);
          }
        } catch (e) {
          console.log("Overpass kecamatan optional:", e && e.message ? e.message : e);
        }
      })();
    }

    return function () { controller.abort(); };
  }, []);

  useEffect(function () {
    const map = mapRef.current;
    if (!map) return;
    const doFit = function () {
      const pts = kecRekap.map(function (k) { return k.center; }).filter(Boolean);
      if (!pts.length) {
        map.setView(L.latLng(GARUT_CENTER[0], GARUT_CENTER[1]), initialZoom, { animate: true });
        return;
      }
      if (pts.length === 1) {
        map.setView(L.latLng(pts[0][0], pts[0][1]), Math.max(initialZoom, 12), { animate: true });
        return;
      }
      const bounds = L.latLngBounds(pts.map(function (p) { return L.latLng(p[0], p[1]); }));
      map.fitBounds(bounds.pad(0.12), { animate: true });
    };
    clearTimeout(fitTimer.current);
    fitTimer.current = setTimeout(doFit, 160);
    return function () { clearTimeout(fitTimer.current); };
  }, [kecRekap, initialZoom]);

  return (
    <div className={styles.mapRoot}>
      <div className={styles.filterBar}>
        <div className={styles.countBadge}>
          {badgeKecamatan} kecamatan • {badgeSekolah} sekolah
        </div>
      </div>

      <MapContainer
        ref={mapRef}
        center={initialCenter}
        zoom={initialZoom}
        className={styles.map}
        whenCreated={function (m) { mapRef.current = m; }}
        preferCanvas
        updateWhenZooming={false}
        updateWhenIdle
        keepBuffer={2}
        scrollWheelZoom={false}
        zoomControl={false}
        maxBounds={GARUT_BOUNDS}
        maxBoundsViscosity={0.95}
        attributionControl={false}
      >
        <ZoomControl position="bottomright" />

        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" detectRetina />

        {kecRekap.map(function (kec) {
          const icon = makeKecamatanNumberIcon(kec.total, "", styles);
          return (
            <Marker key={kec.kecKey} position={kec.center} icon={icon}>
              <Popup>
                <div className={styles.popup}>
                  <div className={styles.popupTitle}>{kec.displayName}</div>
                  <div className={styles.popupCounts}>{kec.total} sekolah</div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}