// src/hooks/useSchoolDetail.js
import { useEffect, useState } from "react";
import { getSchoolDetailByNpsn } from "../services/api/schoolApi";

export function useSchoolDetail(npsn) {
  const [state, setState] = useState({
    data: null,
    loading: !!npsn,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    if (!npsn) {
      setState({ data: null, loading: false, error: new Error("NPSN kosong") });
      return;
    }
    (async () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      const { data, error } = await getSchoolDetailByNpsn(npsn);
      if (!cancelled) setState({ data, loading: false, error });
    })();
    return () => {
      cancelled = true;
    };
  }, [npsn]);

  return state;
}
