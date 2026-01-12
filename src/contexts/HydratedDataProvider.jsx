// src/contexts/HydratedDataProvider.jsx
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { fetchAllData } from "../services/dataSource";
import { useHydratedSchools } from "../hooks/useHydratedSchools";

const Ctx = createContext(null);

export function HydratedDataProvider({ children }) {
  const [rawSchools, setRawSchools] = useState([]);
  const [geo, setGeo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { schools, geoData } = await fetchAllData();
      setRawSchools(schools);
      setGeo(geoData);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const schools = useHydratedSchools(rawSchools);

  const lists = useMemo(() => {
    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean))).sort();
    return {
      jenjang: uniq(schools.map(s => s.jenjang)),
      kecamatan: uniq(schools.map(s => s.kecamatan)),
      desa: uniq(schools.map(s => s.desa || s.village)),
      kondisi: ["Baik","Rusak Sedang","Rusak Berat","Kurang RKB"]
    };
  }, [schools]);

  const value = useMemo(() => ({ loading, error, schools, geo, lists, refetch }), [loading, error, schools, geo, lists, refetch]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHydratedData() {
  return useContext(Ctx) || { loading: true, error: null, schools: [], geo: null, lists: { jenjang:[], kecamatan:[], desa:[], kondisi:[] }, refetch: () => {} };
}
