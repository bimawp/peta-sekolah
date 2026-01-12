// src/pages/Map/Map.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import SimpleMap from "@/components/common/Map/SimpleMap.jsx";
import styles from "./Map.module.css";
import { kecKey, uniqueBy, getLatLngSafe } from "@/components/common/Map/mapUtils";
import { onIdle } from "@/services/utils/idle";
import { useWorkerJSON } from "@/services/utils/useWorkerJSON";
import supabase from "@/services/supabaseClient";

const DEFAULT_CENTER = [-7.214, 107.903];
const DEFAULT_ZOOM = 11;

const norm = (x) =>
  String(x ?? "")
    .normalize("NFKD")
    .replace(/\s+/g, " ")
    .trim();

export default function MapPage() {
  const [supabaseSchools, setSupabaseSchools] = useState([]);
  const [kecRekap, setKecRekap] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const firstLoadedRef = useRef(false);

  // cache supaya ganti filter tidak selalu “loading”
  const cacheRef = useRef({
    rekap: new Map(),
    schools: new Map(),
  });

  const { loading: kecLoading, data: kecamatanGeo, error: kecErr } = useWorkerJSON({
    url: "/data/kecamatan.geojson",
  });

  const { loading: desaLoading, data: desaGeo, error: desaErr } = useWorkerJSON({
    url: "/data/desa.geojson",
  });

  const [kecamatanMaster, setKecamatanMaster] = useState([]);
  const [kecToDesa, setKecToDesa] = useState(new Map());

  const [selectedJenjang, setSelectedJenjang] = useState("Semua Jenjang");
  const [selectedKecamatan, setSelectedKecamatan] = useState("Semua Kecamatan");
  const [selectedDesa, setSelectedDesa] = useState("Semua Desa");
  const [selectedKondisi, setSelectedKondisi] = useState("Semua Kondisi");

  // build master kecamatan + mapping desa
  useEffect(() => {
    if (!kecamatanGeo || !desaGeo) return;

    const propsKec = [
      "district",
      "District",
      "kecamatan",
      "Kecamatan",
      "NAMKEC",
      "NAMKec",
      "name",
      "Name",
      "NAMOBJ",
      "WADMKC",
    ];

    const extractKecamatanNames = (geojson) => {
      const gj = geojson && geojson.type ? geojson : null;
      if (!gj || !Array.isArray(gj.features)) return [];
      const set = new Set();
      for (const f of gj.features) {
        const p = f?.properties || {};
        let v = "";
        for (const k of propsKec) {
          if (p[k]) {
            v = p[k];
            break;
          }
        }
        if (v) set.add(norm(v));
      }
      return Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
    };

    const buildDesaKecMasters = (geojson) => {
      const gj = geojson && geojson.type ? geojson : null;
      const kecToDesa = new Map();
      if (!gj || !Array.isArray(gj.features)) return { kecToDesa };

      const desaKeys = [
        "village",
        "Village",
        "DESA",
        "desa",
        "NAMA_DESA",
        "NAMOBJ",
        "name",
        "Name",
        "KELURAHAN",
        "kelurahan",
      ];
      const kecKeys = [
        "district",
        "District",
        "kecamatan",
        "Kecamatan",
        "NAMA_KEC",
        "NAMKEC",
        "NAMKec",
        "KECAMATAN",
        "WADMKC",
      ];

      for (const f of gj.features) {
        const p = f?.properties || {};
        let desa = "";
        let kec = "";
        for (const k of desaKeys) if (p[k]) { desa = p[k]; break; }
        for (const k of kecKeys) if (p[k]) { kec = p[k]; break; }
        if (!desa || !kec) continue;

        const kecName = norm(kec);
        if (!kecToDesa.has(kecName)) kecToDesa.set(kecName, new Set());
        kecToDesa.get(kecName).add(norm(desa));
      }
      return { kecToDesa };
    };

    setKecamatanMaster(extractKecamatanNames(kecamatanGeo));
    setKecToDesa(buildDesaKecMasters(desaGeo).kecToDesa);
  }, [kecamatanGeo, desaGeo]);

  // Prefetch geojson di idle
  useEffect(() => {
    onIdle(() => {
      fetch("/data/kecamatan.geojson").catch(() => {});
      fetch("/data/desa.geojson").catch(() => {});
    });
  }, []);

  const isAll = (v) => {
    const s = String(v ?? "").trim().toLowerCase();
    if (!s) return true;
    if (s.startsWith("semua")) return true;
    if (s.startsWith("(semua")) return true;
    if (s.includes("pilih")) return true;
    return false;
  };

  const jenjangFiltered = !isAll(selectedJenjang);
  const kecamatanFiltered = !isAll(selectedKecamatan);
  const desaFiltered = !isAll(selectedDesa);
  const kondisiFiltered = !isAll(selectedKondisi);

  // Full filter HANYA: jenjang + kecamatan + desa
  const hasFullFilter = jenjangFiltered && kecamatanFiltered && desaFiltered;

  const makeKey = (mode, p) =>
    `${mode}|j=${p.j ?? ""}|k=${p.k ?? ""}|d=${p.d ?? ""}|c=${p.c ?? ""}`;

  useEffect(() => {
    let alive = true;

    async function fetchData() {
      try {
        if (!firstLoadedRef.current) setLoading(true);
        setErr(null);

        const pJenjang = jenjangFiltered ? selectedJenjang : null;
        const pKecamatan = kecamatanFiltered ? selectedKecamatan : null;
        const pDesa = desaFiltered ? selectedDesa : null;
        const pKondisi = kondisiFiltered ? selectedKondisi : null;

        if (!hasFullFilter) {
          // MODE REKAP KECAMATAN
          const cacheKey = makeKey("rekap", { j: pJenjang, k: pKecamatan, d: null, c: pKondisi });
          const cached = cacheRef.current.rekap.get(cacheKey);
          if (cached && alive) {
            setSupabaseSchools([]);
            setKecRekap(cached);
            if (!firstLoadedRef.current) firstLoadedRef.current = true;
            return;
          }

          const { data, error } = await supabase.rpc("rpc_map_kecamatan_rekap", {
            p_jenjang: pJenjang,
            p_kecamatan: pKecamatan,
            p_kondisi: pKondisi,
          });

          if (!alive) return;
          if (error) throw error;

          const rows = Array.isArray(data) ? data : [];
          cacheRef.current.rekap.set(cacheKey, rows);

          setSupabaseSchools([]);
          setKecRekap(rows);

          if (!firstLoadedRef.current) firstLoadedRef.current = true;
        } else {
          // MODE SEKOLAH (FULL FILTER)
          const cacheKey = makeKey("schools", { j: pJenjang, k: pKecamatan, d: pDesa, c: pKondisi });
          const cached = cacheRef.current.schools.get(cacheKey);
          if (cached && alive) {
            setKecRekap([]);
            setSupabaseSchools(cached);
            if (!firstLoadedRef.current) firstLoadedRef.current = true;
            return;
          }

          const { data, error } = await supabase.rpc("rpc_map_schools", {
            p_jenjang: pJenjang,
            p_kecamatan: pKecamatan,
            p_desa: pDesa,
            p_kondisi: pKondisi,
            p_only_with_coords: false,
          });

          if (!alive) return;
          if (error) throw error;

          setKecRekap([]);

          const mapped = Array.isArray(data)
            ? data.map((s) => ({
                ...s,
                id: s?.id ?? null,
                npsn: String(s?.npsn || "").trim(),
                namaSekolah: s?.nama_sekolah || s?.name || "",
                kecamatan: s?.kecamatan || s?.subdistrict || s?.district || "",
                desa: s?.desa || s?.village || s?.village_name || "",
                lat: s?.lat != null ? Number(s.lat) : null,
                lng: s?.lng != null ? Number(s.lng) : null,
                jenjang:
                  String(s?.jenjang || s?.level || "")
                    .toUpperCase()
                    .trim() || "LAINNYA",
              }))
            : [];

          cacheRef.current.schools.set(cacheKey, mapped);
          setSupabaseSchools(mapped);

          if (!firstLoadedRef.current) firstLoadedRef.current = true;
        }
      } catch (error) {
        console.error("Gagal memuat data peta:", error);
        if (alive) setErr(error);
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchData();
    return () => {
      alive = false;
    };
  }, [
    selectedJenjang,
    selectedKecamatan,
    selectedDesa,
    selectedKondisi,
    jenjangFiltered,
    kecamatanFiltered,
    desaFiltered,
    kondisiFiltered,
    hasFullFilter,
  ]);

  const schoolsForMap = useMemo(
    () => uniqueBy(supabaseSchools, (s) => `${kecKey(s.kecamatan)}__${s.npsn}`),
    [supabaseSchools]
  );

  const coordCounts = useMemo(() => {
    let total = 0;
    let withCoords = 0;
    let noCoords = 0;
    for (const s of schoolsForMap) {
      total += 1;
      const ll = getLatLngSafe(s);
      if (ll) withCoords += 1;
      else noCoords += 1;
    }
    return { total, withCoords, noCoords };
  }, [schoolsForMap]);

  const kecamatanOptions = useMemo(() => {
    const list = kecamatanMaster.map((k) => norm(k));
    return ["Semua Kecamatan", ...list];
  }, [kecamatanMaster]);

  const desaOptions = useMemo(() => {
    if (!kecamatanFiltered) return ["Semua Desa"];
    const normKec = norm(selectedKecamatan);
    const desaSet = kecToDesa.get(normKec);
    if (!desaSet) return ["Semua Desa"];
    const list = Array.from(desaSet).sort((a, b) => a.localeCompare(b, "id"));
    return ["Semua Desa", ...list];
  }, [selectedKecamatan, kecToDesa, kecamatanFiltered]);

  useEffect(() => {
    if (!desaOptions.includes(selectedDesa)) setSelectedDesa("Semua Desa");
  }, [selectedDesa, desaOptions]);

  const handleReset = useCallback(() => {
    setSelectedJenjang("Semua Jenjang");
    setSelectedKecamatan("Semua Kecamatan");
    setSelectedDesa("Semua Desa");
    setSelectedKondisi("Semua Kondisi");
  }, []);

  const geoError = kecErr || desaErr;

  const mapFilters = useMemo(
    () => ({
      jenjang: selectedJenjang,
      kecamatan: selectedKecamatan,
      desa: selectedDesa,
      kondisi: selectedKondisi,
    }),
    [selectedJenjang, selectedKecamatan, selectedDesa, selectedKondisi]
  );

  const statsOverride = useMemo(() => {
    if (!hasFullFilter) {
      const totalSekolah = (kecRekap || []).reduce(
        (sum, r) => sum + Number(r?.total ?? r?.count ?? 0),
        0
      );
      const noCoords = (kecRekap || []).reduce(
        (sum, r) => sum + Number(r?.tanpa_koordinat ?? r?.tanpaKoordinat ?? r?.no_coords ?? 0),
        0
      );
      return {
        kecamatanCount: kecamatanFiltered ? 1 : (kecRekap?.length || kecamatanMaster.length),
        sekolahCount: totalSekolah,
        sekolahNoCoords: noCoords,
      };
    }
    return {
      kecamatanCount: 1,
      sekolahCount: coordCounts.total,
      sekolahWithCoords: coordCounts.withCoords,
      sekolahNoCoords: coordCounts.noCoords,
    };
  }, [hasFullFilter, kecRekap, kecamatanFiltered, kecamatanMaster.length, coordCounts]);

  if ((loading && !firstLoadedRef.current) || kecLoading || desaLoading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h1 className={styles.title}>Peta Sekolah Kabupaten Garut</h1>
          <p className={styles.subtitle}>Memuat data peta, harap tunggu sebentar...</p>
        </div>
        <div className={styles.content}>
          <div className={styles.sidebar}>
            <div className={styles.filterGroup}>
              <div className={styles.skeletonFilter} />
              <div className={styles.skeletonFilter} />
              <div className={styles.skeletonFilter} />
            </div>
            <div className={styles.skeletonStats} />
          </div>
          <div className={styles.mapContainer}>
            <div className={styles.mapSkeleton} />
          </div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h1 className={styles.title}>Peta Sekolah Kabupaten Garut</h1>
          <p className={styles.subtitle}>Terjadi kesalahan saat memuat data peta.</p>
        </div>
        <div className={styles.errorBox}>
          <p>Detail error: {String(err.message || err)}</p>
        </div>
      </div>
    );
  }

  if (geoError) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h1 className={styles.title}>Peta Sekolah Kabupaten Garut</h1>
          <p className={styles.subtitle}>Terjadi kesalahan saat memuat data batas wilayah.</p>
        </div>
        <div className={styles.errorBox}>
          <p>Detail error: {String(geoError.message || geoError)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h1 className={styles.title}>Peta Sekolah Kabupaten Garut</h1>
        <p className={styles.subtitle}>Visualisasi persebaran sekolah berdasarkan jenjang dan wilayah.</p>
      </div>

      <div className={styles.content}>
        <div className={styles.sidebar}>
          <div className={styles.filterGroup}>
            <div className={styles.filterItem}>
              <label className={styles.filterLabel}>Jenjang</label>
              <select
                className={styles.filterSelect}
                value={selectedJenjang}
                onChange={(e) => setSelectedJenjang(e.target.value)}
              >
                <option value="Semua Jenjang">Semua Jenjang</option>
                <option value="PAUD">PAUD</option>
                <option value="SD">SD</option>
                <option value="SMP">SMP</option>
                <option value="PKBM">PKBM</option>
              </select>
            </div>

            <div className={styles.filterItem}>
              <label className={styles.filterLabel}>Kecamatan</label>
              <select
                className={styles.filterSelect}
                value={selectedKecamatan}
                onChange={(e) => setSelectedKecamatan(e.target.value)}
              >
                {kecamatanOptions.map((kec) => (
                  <option key={kec} value={kec}>
                    {kec}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterItem}>
              <label className={styles.filterLabel}>Desa</label>
              <select
                className={styles.filterSelect}
                value={selectedDesa}
                onChange={(e) => setSelectedDesa(e.target.value)}
                disabled={!kecamatanFiltered}
              >
                {desaOptions.map((desa) => (
                  <option key={desa} value={desa}>
                    {desa}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterItem}>
              <label className={styles.filterLabel}>Kondisi</label>
              <select
                className={styles.filterSelect}
                value={selectedKondisi}
                onChange={(e) => setSelectedKondisi(e.target.value)}
              >
                <option value="Semua Kondisi">Semua Kondisi</option>
                <option value="Baik">Baik</option>
                <option value="Rusak Sedang">Rusak Sedang</option>
                <option value="Rusak Berat">Rusak Berat</option>
                <option value="Kurang RKB">Kurang RKB</option>
              </select>
            </div>

            <button className={styles.resetButton} onClick={handleReset}>
              Reset Filter
            </button>
          </div>

          <div className={styles.statsCard}>
            <h2 className={styles.statsTitle}>Ringkasan</h2>
            <div className={styles.statsRow}>
              <span className={styles.statsLabel}>Kecamatan</span>
              <span className={styles.statsValue}>{statsOverride.kecamatanCount ?? "-"}</span>
            </div>
            <div className={styles.statsRow}>
              <span className={styles.statsLabel}>Sekolah</span>
              <span className={styles.statsValue}>{statsOverride.sekolahCount ?? "-"}</span>
            </div>
            {statsOverride.sekolahWithCoords != null && (
              <div className={styles.statsRow}>
                <span className={styles.statsLabel}>Tersedia Koordinat</span>
                <span className={styles.statsValue}>{statsOverride.sekolahWithCoords}</span>
              </div>
            )}
            {statsOverride.sekolahNoCoords != null && (
              <div className={styles.statsRow}>
                <span className={styles.statsLabel}>Belum Ada Koordinat</span>
                <span className={styles.statsValue}>{statsOverride.sekolahNoCoords}</span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.mapContainer}>
          <SimpleMap
            schools={hasFullFilter ? schoolsForMap : []}
            initialCenter={DEFAULT_CENTER}
            initialZoom={DEFAULT_ZOOM}
            statsOverride={statsOverride}
            kecamatanGeo={kecamatanGeo}
            desaGeo={desaGeo}
            filters={mapFilters}
            hasFullFilter={hasFullFilter}
            kecamatanRekapOverride={hasFullFilter ? null : kecRekap}
          />
        </div>
      </div>
    </div>
  );
}
