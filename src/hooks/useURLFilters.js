// src/pages/Facilities/hooks/useURLFilters.js
import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function getParams(search) {
  const p = new URLSearchParams(search);
  return {
    jenjang: p.get("jenjang") || "Semua Jenjang",
    kecamatan: p.get("kecamatan") || "Semua Kecamatan",
    desa: p.get("desa") || "Semua Desa",
    q: p.get("q") || "",
    page: Math.max(1, parseInt(p.get("page") || "1", 10)),
    per: Math.max(5, parseInt(p.get("per") || "10", 10)),
  };
}

export default function useURLFilters(state, setState) {
  const location = useLocation();
  const navigate = useNavigate();

  // seed dari URL saat pertama kali mount
  useEffect(() => {
    setState((prev) => {
      const fromURL = getParams(location.search);
      return {
        ...prev,
        selectedJenjang: fromURL.jenjang,
        selectedKecamatan: fromURL.kecamatan,
        selectedDesa: fromURL.desa,
        searchQuery: fromURL.q,
        currentPage: fromURL.page,
        itemsPerPage: fromURL.per,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // tulis balik ke URL tiap filter berubah
  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (state.selectedJenjang && state.selectedJenjang !== "Semua Jenjang")
      p.set("jenjang", state.selectedJenjang);
    if (state.selectedKecamatan && state.selectedKecamatan !== "Semua Kecamatan")
      p.set("kecamatan", state.selectedKecamatan);
    if (state.selectedDesa && state.selectedDesa !== "Semua Desa")
      p.set("desa", state.selectedDesa);
    if (state.searchQuery) p.set("q", state.searchQuery);
    if (state.currentPage > 1) p.set("page", String(state.currentPage));
    if (state.itemsPerPage !== 10) p.set("per", String(state.itemsPerPage));
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [state.selectedJenjang, state.selectedKecamatan, state.selectedDesa, state.searchQuery, state.currentPage, state.itemsPerPage]);

  useEffect(() => {
    const newUrl = `${location.pathname}${query}`;
    if (newUrl !== `${location.pathname}${location.search}`) {
      navigate(newUrl, { replace: true });
    }
  }, [query, location.pathname, location.search, navigate]);
}
