// src/components/common/Map/SimpleMap.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  GARUT_LEAFLET_BOUNDS,
} from "./mapUtils";

const GARUT_CENTER = [-7.214, 107.903];
const GARUT_ZOOM = 11;

/**
 * =========================
 * PENGATURAN BATAS GESER MAP
 * =========================
 */
const PAN_BOUNDS_PAD_LAT = 0.20;
const PAN_BOUNDS_PAD_LNG = 0.20;
const PAN_BOUNDS_EXTRA_NORTH = 0.45;

function buildExpandedViewBounds(bounds) {
  if (!bounds) return null;
  try {
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();

    const sw2 = L.latLng(sw.lat - PAN_BOUNDS_PAD_LAT, sw.lng - PAN_BOUNDS_PAD_LNG);
    const ne2 = L.latLng(
      ne.lat + PAN_BOUNDS_PAD_LAT + PAN_BOUNDS_EXTRA_NORTH,
      ne.lng + PAN_BOUNDS_PAD_LNG
    );

    return L.latLngBounds(sw2, ne2);
  } catch {
    return null;
  }
}

/* ===== Warna polygon kecamatan (pastel) ===== */
function colorForKey(key) {
  const palette = [
    "#bfdbfe", "#ddd6fe", "#fed7aa", "#bbf7d0", "#bae6fd", "#fecaca",
    "#e9d5ff", "#fce7f3", "#a5f3fc", "#fef3c7", "#c7d2fe", "#f5d0fe",
    "#ffe4e6", "#dcfce7", "#f9a8d4", "#e0f2fe", "#e5e7eb", "#fee2e2",
    "#d9f99d", "#bae6fd", "#fecaca", "#fde68a", "#a7f3d0", "#c4b5fd",
  ];
  if (!key) return palette[0];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

/* ===== Tentukan kondisi prioritas sekolah ===== */
const getSchoolCondition = (s) => {
  const ccProcessed = s?.kondisiKelas;
  if (ccProcessed) {
    if (Number(ccProcessed.rusakBerat || 0) > 0) return "berat";
    if (Number(ccProcessed.rusakSedang || 0) > 0) return "sedang";
    if (Number(s?.kurangRKB || 0) > 0) return "rkb";
    if (Number(ccProcessed.kurangRKB || 0) > 0) return "rkb";
    if (Number(ccProcessed.baik || 0) > 0) return "baik";
  }

  const ccRaw = s?.class_condition;
  if (ccRaw) {
    const berat_raw =
      parseInt(ccRaw.classrooms_heavy_damage || ccRaw.heavy_damage) || 0;
    if (berat_raw > 0) return "berat";

    const sedang_raw =
      parseInt(ccRaw.classrooms_moderate_damage || ccRaw.moderate_damage) || 0;
    if (sedang_raw > 0) return "sedang";

    const rkb_raw = parseInt(ccRaw.lacking_rkb) || 0;
    if (rkb_raw > 0) return "rkb";

    const baik_raw = parseInt(ccRaw.classrooms_good || ccRaw.good) || 0;
    if (baik_raw > 0) return "baik";
  }

  return "baik";
};

/* ===== helper full-filter yang robust (biar tidak nyangkut) ===== */
const isAllValue = (v) => {
  const s = String(v ?? "").trim();
  if (!s) return true;
  const low = s.toLowerCase();
  if (low.startsWith("semua")) return true;
  if (low.startsWith("(semua")) return true;
  if (low.includes("pilih")) return true;
  if (low.includes("select")) return true;
  if (low.includes("desa/kelurahan")) return true;
  return false;
};

const pickFilter = (filters, keys) => {
  for (const k of keys) {
    const v = filters?.[k];
    if (v != null && String(v).trim() !== "") return v;
  }
  return "";
};

/* ===== ICON PIN SVG (tidak tergantung CSS/asset) ===== */
const schoolPinIcon = (label = "") => {
  const text = String(label || "").toUpperCase().slice(0, 4);
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
    <path d="M14 40s12-11.2 12-22C26 8.1 20.6 2.5 14 2.5S2 8.1 2 18c0 10.8 12 22 12 22z"
          fill="#ef4444" stroke="rgba(15,23,42,0.55)" stroke-width="1.2"/>
    <circle cx="14" cy="17" r="7.2" fill="white" stroke="rgba(15,23,42,0.25)" stroke-width="1"/>
    <text x="14" y="20.2" text-anchor="middle" font-size="7.5" font-family="Arial, sans-serif" fill="#111827" font-weight="700">
      ${text}
    </text>
  </svg>`;

  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [28, 40],
    iconAnchor: [14, 38],
    popupAnchor: [0, -32],
  });
};

function SimpleMap({
  schools = [],
  initialCenter,
  initialZoom,
  filters = {},
  statsOverride,
  kecamatanGeo,
  desaGeo,
  onZoomChange,

  hasFullFilter: hasFullFilterProp,
  kecamatanRekapOverride,
}) {
  const mapRef = useRef(null);

  const kecLayerRef = useRef(null);
  const labelLayerRef = useRef(null);

  const [, setZoom] = useState(initialZoom ?? GARUT_ZOOM);
  const [localKecamatanGeo, setLocalKecamatanGeo] = useState(null);

  const [garutBounds, setGarutBounds] = useState(null);
  const [viewBounds, setViewBounds] = useState(null);

  const fallbackBounds = useMemo(() => {
    if (!GARUT_LEAFLET_BOUNDS) return null;
    try {
      return L.latLngBounds(GARUT_LEAFLET_BOUNDS);
    } catch {
      return null;
    }
  }, []);

  const fallbackViewBounds = useMemo(() => {
    if (!fallbackBounds) return null;
    return buildExpandedViewBounds(fallbackBounds);
  }, [fallbackBounds]);

  /* ===== Load boundary (tetap) ===== */
  useEffect(() => {
    let cancelled = false;
    const loadGeo = async () => {
      try {
        const fetches = [];

        fetches.push(fetch("/geo/garut-boundary.geojson"));
        if (!kecamatanGeo) {
          fetches.push(fetch("/geo/garut-kecamatan.geojson"));
        }

        const resList = await Promise.all(fetches);
        if (cancelled) return;

        const bRes = resList[0];
        if (bRes && bRes.ok) {
          const bJson = await bRes.json();
          try {
            const bLayer = L.geoJSON(bJson);
            const b = bLayer.getBounds();
            if (b && typeof b.isValid === "function" && b.isValid()) {
              setGarutBounds(b);

              const vb = buildExpandedViewBounds(b);
              if (vb) setViewBounds(vb);
            }
          } catch (e) {
            console.error("[SimpleMap] gagal hitung bounds Garut:", e);
          }
        }

        if (!kecamatanGeo && resList[1] && resList[1].ok) {
          setLocalKecamatanGeo(await resList[1].json());
        }
      } catch (err) {
        console.error("[SimpleMap] gagal load geojson:", err);
      }
    };

    loadGeo();
    return () => {
      cancelled = true;
    };
  }, [kecamatanGeo]);

  /* ===== Dedup sekolah ===== */
  const schoolsUnique = useMemo(
    () =>
      uniqueBy(schools, (s) => {
        if (!s) return null;

        const id = s?.id != null ? String(s.id).trim() : "";
        if (id) return "ID:" + id;

        const npsn = (s?.npsn || s?.NPSN || "").toString().trim();
        if (npsn && npsn !== "undefined" && npsn !== "null") {
          return "NPSN:" + npsn;
        }

        const name = (s?.namaSekolah || s?.name || "")
          .toString()
          .trim()
          .toUpperCase();
        const desa = (s?.desa || s?.village || "")
          .toString()
          .trim()
          .toUpperCase();
        const kk = kecKey(s?.kecamatan || "");
        return name + "::" + desa + "::" + kk;
      }),
    [schools]
  );

  /* ===== Deteksi Full Filter ===== */
  const fJenjang = pickFilter(filters, ["jenjang", "level"]);
  const fKecamatan = pickFilter(filters, ["kecamatan", "subdistrict", "district"]);
  const fDesa = pickFilter(filters, ["desa", "village", "kelurahan", "desaKelurahan", "desa_kelurahan"]);

  const computedHasFullFilter =
    !isAllValue(fJenjang) && !isAllValue(fKecamatan) && !isAllValue(fDesa);

  const hasFullFilter = hasFullFilterProp === true ? true : computedHasFullFilter;
  const showSchoolDots = hasFullFilter;

  /* ===== Filter data ===== */
  const filtered = useMemo(() => {
    if (showSchoolDots) return schoolsUnique;
    return applyFilters(schoolsUnique, filters);
  }, [schoolsUnique, filters, showSchoolDots]);

  /* ===== Index centroid kecamatan dari GeoJSON ===== */
  const kecCentroidIndex = useMemo(() => {
    const idx = new Map();
    const effectiveKecGeo = kecamatanGeo || localKecamatanGeo;
    if (!effectiveKecGeo || !Array.isArray(effectiveKecGeo?.features)) return idx;

    const pickName = (p) =>
      p?.name ||
      p?.Name ||
      p?.kecamatan ||
      p?.Kecamatan ||
      p?.NAMKEC ||
      p?.NAMKec ||
      p?.NAMOBJ ||
      p?.namobj ||
      "";

    for (const f of effectiveKecGeo.features) {
      try {
        const p = f?.properties || {};
        const rawName = pickName(p);
        const kk = kecKey(rawName);
        if (!kk) continue;

        const gj = L.geoJSON(f);
        const c = gj.getBounds().getCenter();
        idx.set(kk, { rawName, center: [c.lat, c.lng] });
      } catch {
        // ignore
      }
    }
    return idx;
  }, [kecamatanGeo, localKecamatanGeo]);

  /* ===== Rekap per-kecamatan (fallback kalau tidak ada override) ===== */
  const kecRekap = useMemo(() => {
    const group = new Map();

    for (const s of filtered) {
      const kk = kecKey(s?.kecamatan);
      if (!kk) continue;

      if (!group.has(kk)) {
        const geo = kecCentroidIndex.get(kk);
        group.set(kk, {
          k: kk,
          displayName: s?.kecamatan || geo?.rawName || kk,
          total: 0,
          coords: [],
          geoCenter: geo?.center || null,
          tanpaKoordinat: 0,
          diLuarGarut: 0,
          rusakBerat: 0,
          rusakSedang: 0,
          kurangRKB: 0,
          baik: 0,
        });
      }

      const g = group.get(kk);
      g.total += 1;

      const ll = getLatLngSafe(s);
      if (!ll) g.tanpaKoordinat += 1;
      else g.coords.push(ll);

      const condition = getSchoolCondition(s);
      if (condition === "berat") g.rusakBerat += 1;
      else if (condition === "sedang") g.rusakSedang += 1;
      else if (condition === "rkb") g.kurangRKB += 1;
      else g.baik += 1;
    }

    return Array.from(group.values()).map((g) => {
      let center = g.geoCenter || null;

      if (!center && g.coords.length) {
        const sum = g.coords.reduce(
          (acc, cur) => [acc[0] + cur[0], acc[1] + cur[1]],
          [0, 0]
        );
        center = [sum[0] / g.coords.length, sum[1] / g.coords.length];
      }

      if (!center) center = GARUT_CENTER;

      return {
        kecKey: g.k,
        displayName: g.displayName,
        total: g.total,
        center,
        tanpaKoordinat: g.tanpaKoordinat,
        diLuarGarut: g.diLuarGarut,
        rusakBerat: g.rusakBerat,
        rusakSedang: g.rusakSedang,
        kurangRKB: g.kurangRKB,
        baik: g.baik,
      };
    });
  }, [filtered, kecCentroidIndex]);

  /* ===== Gabungkan rekap: pakai override dari parent jika ada ===== */
  const rekapForMarkers = useMemo(() => {
    const src =
      Array.isArray(kecamatanRekapOverride) && kecamatanRekapOverride.length
        ? kecamatanRekapOverride
        : kecRekap;

    return (Array.isArray(src) ? src : []).map((r) => {
      const name =
        r?.displayName ||
        r?.kecamatan ||
        r?.nama_kecamatan ||
        r?.district ||
        r?.subdistrict ||
        r?.name ||
        "";

      const kk = kecKey(r?.kecKey || r?.kec_key || name);
      const geoCenter = kk ? kecCentroidIndex.get(kk)?.center : null;

      let center = null;
      if (Array.isArray(r?.center) && r.center.length === 2) center = r.center;
      else if (r?.lat != null && r?.lng != null) {
        const lat = Number(r.lat);
        const lng = Number(r.lng);
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) center = [lat, lng];
      }

      center = geoCenter || center || GARUT_CENTER;

      const total = Number(r?.total ?? r?.count ?? 0) || 0;
      const tanpaKoordinat =
        Number(r?.tanpaKoordinat ?? r?.tanpa_koordinat ?? r?.no_coords ?? 0) || 0;

      const rusakBerat = Number(r?.rusakBerat ?? r?.rusak_berat ?? 0) || 0;
      const rusakSedang = Number(r?.rusakSedang ?? r?.rusak_sedang ?? 0) || 0;
      const kurangRKB = Number(r?.kurangRKB ?? r?.kurang_rkb ?? 0) || 0;
      const baik = Number(r?.baik ?? 0) || 0;

      const diLuarGarut = Number(r?.diLuarGarut ?? r?.di_luar_garut ?? 0) || 0;
      const rehab = Number(r?.rehab ?? 0) || 0;
      const pembangunan = Number(r?.pembangunan ?? 0) || 0;

      return {
        kecKey: kk || name || String(Math.random()),
        displayName: name || kk,
        total,
        center,
        tanpaKoordinat,
        rusakBerat,
        rusakSedang,
        kurangRKB,
        baik,
        diLuarGarut,
        rehab,
        pembangunan,
      };
    });
  }, [kecamatanRekapOverride, kecRekap, kecCentroidIndex]);

  /* ===== Sekolah yang bisa diplot (FULL FILTER) ===== */
  const { plottableSchools, missingSchools } = useMemo(() => {
    if (!showSchoolDots) return { plottableSchools: [], missingSchools: [] };

    const pts = [];
    const missing = [];

    for (const s of filtered) {
      const ll = getLatLngSafe(s);
      if (!ll) {
        missing.push({
          name: s?.namaSekolah || s?.name || "Tanpa nama",
          npsn: s?.npsn || s?.NPSN || "-",
          desa: s?.desa || s?.village || "",
          kec: s?.kecamatan || "",
        });
        continue;
      }
      pts.push(s);
    }

    return { plottableSchools: pts, missingSchools: missing };
  }, [showSchoolDots, filtered]);

  /* ===== Badge counts ===== */
  const badgeKecamatan =
    statsOverride?.kecamatanCount != null ? statsOverride.kecamatanCount : rekapForMarkers.length;

  const badgeSekolah =
    statsOverride?.sekolahCount != null ? statsOverride.sekolahCount : filtered.length;

  const badgeNoCoords =
    statsOverride?.sekolahNoCoords != null ? statsOverride.sekolahNoCoords : missingSchools.length;

  const badgePlottable =
    statsOverride?.sekolahWithCoords != null
      ? statsOverride.sekolahWithCoords
      : plottableSchools.length;

  /**
   * ===== Polygon kecamatan + label
   * - Polygon selalu digambar (warna batas kecamatan tidak berubah)
   * - Label GeoJSON:
   *    - Mode REKAP: label sudah ada di icon angka => label layer dimatikan agar tidak dobel / tidak jauh
   *    - Mode SEKOLAH: label layer tetap ditampilkan seperti sebelumnya
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!kecLayerRef.current) kecLayerRef.current = L.layerGroup().addTo(map);
    else kecLayerRef.current.clearLayers();

    if (!labelLayerRef.current) labelLayerRef.current = L.layerGroup().addTo(map);
    else labelLayerRef.current.clearLayers();

    const effectiveKecGeo = kecamatanGeo || localKecamatanGeo;
    if (effectiveKecGeo && Array.isArray(effectiveKecGeo?.features)) {
      try {
        for (const f of effectiveKecGeo.features) {
          const p = f?.properties || {};
          const rawName =
            p.name ||
            p.Name ||
            p.kecamatan ||
            p.Kecamatan ||
            p.NAMKEC ||
            p.NAMKec ||
            p.NAMOBJ ||
            p.namobj ||
            "";

          const kk = kecKey(rawName);

          const gj = L.geoJSON(f, {
            style: {
              fillColor: colorForKey(kk),
              fillOpacity: 0.55,
              color: "rgba(15, 23, 42, 0.35)",
              weight: 1.2,
              opacity: 0.9,
            },
            interactive: false,
          });
          gj.addTo(kecLayerRef.current);

          // Label GeoJSON ditampilkan hanya saat mode sekolah (agar tidak dobel dengan label di icon angka)
          if (showSchoolDots) {
            const c = gj.getBounds().getCenter();
            L.marker(c, {
              interactive: false,
              icon: L.divIcon({
                className: styles.kecLabel,
                html: `<div>${rawName}</div>`,
              }),
              zIndexOffset: 800,
            }).addTo(labelLayerRef.current);
          }
        }
      } catch (err) {
        console.error("[SimpleMap] gagal menggambar kecamatan Garut:", err);
      }
    }

    return () => {
      kecLayerRef.current?.clearLayers();
      labelLayerRef.current?.clearLayers();
    };
  }, [kecamatanGeo, localKecamatanGeo, showSchoolDots]);

  /* ===== Update maxBounds ===== */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const vb = viewBounds || fallbackViewBounds || garutBounds || fallbackBounds;
    if (!vb) return;
    try {
      map.setMaxBounds(vb);
    } catch {
      // ignore
    }
  }, [viewBounds, fallbackViewBounds, garutBounds, fallbackBounds]);

  /* ===== Snap balik kalau keluar bounds ===== */
  useEffect(() => {
    const map = mapRef.current;
    const bounds = viewBounds || fallbackViewBounds || garutBounds || fallbackBounds;
    if (!map || !bounds) return;

    const handleMoveEnd = () => {
      try {
        const center = map.getCenter();
        if (!bounds.contains(center)) {
          map.fitBounds(bounds, {
            paddingTopLeft: [10, 140],
            paddingBottomRight: [10, 10],
            animate: true,
            duration: 0.25,
          });
        }
      } catch {
        // ignore
      }
    };

    map.on("moveend", handleMoveEnd);
    return () => map.off("moveend", handleMoveEnd);
  }, [viewBounds, fallbackViewBounds, garutBounds, fallbackBounds]);

  /* ===== Sync zoom ===== */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handleZoom = () => {
      const z = map.getZoom();
      setZoom(z);
      if (typeof onZoomChange === "function") onZoomChange(z);
    };
    map.on("zoomend", handleZoom);
    handleZoom();
    return () => map.off("zoomend", handleZoom);
  }, [onZoomChange]);

  const effectiveCenter = initialCenter || GARUT_CENTER;
  const effectiveZoom = initialZoom ?? GARUT_ZOOM;

  /* ===== Posisi marker agregat tanpa koordinat (full filter) ===== */
  const missingMarkerPos = useMemo(() => {
    if (!showSchoolDots || !missingSchools.length) return null;

    const kk = kecKey(fKecamatan);
    const pos =
      (kk && kecCentroidIndex.get(kk)?.center) ||
      (rekapForMarkers.length === 1 ? rekapForMarkers[0]?.center : null) ||
      GARUT_CENTER;

    return pos;
  }, [showSchoolDots, missingSchools.length, fKecamatan, kecCentroidIndex, rekapForMarkers]);

  return (
    <div className={styles.mapRoot}>
      <div className={styles.filterBar}>
        <div className={styles.countBadge}>
          {badgeKecamatan} kecamatan • {badgeSekolah} sekolah
          {badgeNoCoords > 0 ? (
            <>
              {" "}
              • titik: {badgePlottable} • tanpa koordinat: {badgeNoCoords}
            </>
          ) : (
            <> • titik: {badgePlottable}</>
          )}
        </div>
      </div>

      <MapContainer
        ref={mapRef}
        center={effectiveCenter}
        zoom={effectiveZoom}
        className={styles.map}
        preferCanvas
        inertia={false}
        updateWhenZooming={false}
        updateWhenIdle
        keepBuffer={2}
        scrollWheelZoom={false}
        zoomControl={false}
        maxBounds={viewBounds || fallbackViewBounds || garutBounds || fallbackBounds || undefined}
        maxBoundsViscosity={1.0}
        attributionControl={false}
        whenCreated={(m) => {
          mapRef.current = m;
          const mb = fallbackBounds;
          const vb = viewBounds || fallbackViewBounds || mb;
          try {
            if (vb) m.setMaxBounds(vb);
            if (mb) {
              m.fitBounds(mb, {
                paddingTopLeft: [10, 140],
                paddingBottomRight: [10, 10],
                animate: false,
              });
            } else {
              m.setView(GARUT_CENTER, GARUT_ZOOM);
            }
          } catch {
            // ignore
          }
        }}
      >
        <ZoomControl position="topright" />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" detectRetina />

        {/* =========================
            MODE 1: REKAP KECAMATAN (default)
           ========================= */}
        {!showSchoolDots &&
          rekapForMarkers.map((kec) => {
            const center = kec.center || GARUT_CENTER;

            // ICON: angka + label kecamatan di atasnya, keduanya center di kecamatan
            const icon = makeKecamatanNumberIcon(kec.total, kec.displayName, styles);

            return (
              <Marker key={kec.kecKey} position={center} icon={icon}>
                <Popup>
                  <div className={styles.popup}>
                    <div className={styles.popupTitle}>{kec.displayName}</div>

                    <div className={styles.popupCounts}>
                      <strong>Total: {kec.total} sekolah</strong>
                    </div>

                    <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.4 }}>
                      <div>
                        Rusak Berat: <b>{Number(kec.rusakBerat || 0)}</b>
                      </div>
                      <div>
                        Rusak Sedang: <b>{Number(kec.rusakSedang || 0)}</b>
                      </div>
                      <div>
                        Kurang RKB: <b>{Number(kec.kurangRKB || 0)}</b>
                      </div>
                      <div>
                        Baik: <b>{Number(kec.baik || 0)}</b>
                      </div>

                      {Number(kec.rehab || 0) > 0 && (
                        <div>
                          Rehab: <b>{Number(kec.rehab || 0)}</b>
                        </div>
                      )}
                      {Number(kec.pembangunan || 0) > 0 && (
                        <div>
                          Pembangunan: <b>{Number(kec.pembangunan || 0)}</b>
                        </div>
                      )}

                      {Number(kec.tanpaKoordinat || 0) > 0 && (
                        <div style={{ marginTop: 6 }}>
                          Tanpa koordinat: <b>{Number(kec.tanpaKoordinat || 0)}</b>
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* =========================
            MODE 2: SEKOLAH (FULL FILTER)
           ========================= */}
        {showSchoolDots &&
          plottableSchools.map((s) => {
            const ll = getLatLngSafe(s);
            if (!ll) return null;

            const npsn = (s?.npsn || s?.NPSN || "").toString().trim();
            const name = s?.namaSekolah || s?.name || "Tanpa nama";
            const jenjangLabel =
              (s?.jenjang || s?.level || "").toString().toUpperCase() || "-";
            const kec = s?.kecamatan || s?.subdistrict || s?.district || "";
            const desa = s?.desa || s?.village || s?.village_name || "";
            const alamat = [desa, kec].filter(Boolean).join(", ");

            const [lat, lng] = ll;
            const gmUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

            return (
              <Marker
                key={`${npsn || name}-${lat}-${lng}`}
                position={ll}
                icon={schoolPinIcon(jenjangLabel)}
                zIndexOffset={1200}
              >
                <Popup>
                  <div className={styles.popup}>
                    <div className={styles.popupTitle}>{name}</div>

                    <div className={`${styles.popupCounts} ${styles.popupDetail}`}>
                      <div className={styles.popupDetailRow}>
                        <span className={styles.popupDetailLabel}>NPSN</span>
                        <span className={styles.popupDetailValue}>{npsn || "-"}</span>
                      </div>
                      <div className={styles.popupDetailRow}>
                        <span className={styles.popupDetailLabel}>Jenjang</span>
                        <span className={styles.popupDetailValue}>{jenjangLabel}</span>
                      </div>
                      <div className={styles.popupDetailRow}>
                        <span className={styles.popupDetailLabel}>Lokasi</span>
                        <span className={styles.popupDetailValue}>{alamat || "-"}</span>
                      </div>
                    </div>

                    <a
                      href={gmUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.popupGmButton}
                    >
                      Buka di Google Maps
                    </a>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* MODE SEKOLAH: marker agregat untuk sekolah tanpa koordinat */}
        {showSchoolDots && missingSchools.length > 0 && missingMarkerPos && (
          <Marker
            position={missingMarkerPos}
            icon={makeKecamatanNumberIcon(missingSchools.length, "Tanpa Koordinat", styles)}
            zIndexOffset={1100}
          >
            <Popup>
              <div className={styles.popup}>
                <div className={styles.popupTitle}>Tanpa Koordinat</div>
                <div className={styles.popupCounts}>
                  <strong>{missingSchools.length} sekolah</strong> belum memiliki lat/lng
                </div>
                <div style={{ marginTop: 6, fontSize: 12 }}>
                  Tidak bisa ditampilkan sebagai titik sekolah sebelum koordinat diisi.
                </div>
                <ul
                  style={{
                    margin: "8px 0 0 16px",
                    padding: 0,
                    maxHeight: 160,
                    overflow: "auto",
                  }}
                >
                  {missingSchools.slice(0, 25).map((x, i) => (
                    <li key={`${x.npsn}-${i}`}>{(x.name || "-").toString()}</li>
                  ))}
                </ul>
                {missingSchools.length > 25 && (
                  <div style={{ marginTop: 6 }}>+ {missingSchools.length - 25} lainnya</div>
                )}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

export default React.memo(SimpleMap);
