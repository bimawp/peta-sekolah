import { useEffect, useRef, useState } from "react";

/**
 * Kalkulasi data chart di Web Worker agar UI tetap halus.
 * @param {{ filtered: any[], all: any[], kegiatan: any[] }} params
 * @returns {{ loading: boolean, data: {kondisiPieData: any[], rehabilitasiPieData: any[], pembangunanPieData: any[], kondisiToiletData: any[], intervensiToiletData: any[]}, error: string|null }}
 */
export default function useChartWorker({ filtered, all, kegiatan }) {
  const workerRef = useRef(null);
  const [state, setState] = useState({
    loading: true,
    data: {
      kondisiPieData: [],
      rehabilitasiPieData: [],
      pembangunanPieData: [],
      kondisiToiletData: [],
      intervensiToiletData: [],
    },
    error: null,
  });

  useEffect(() => {
    // inisiasi worker sekali
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL("../workers/charts.worker.js", import.meta.url),
        { type: "module" }
      );
    }
    const w = workerRef.current;

    // set loading & kirim payload ringkas (hindari object besar seperti originalData)
    setState((s) => ({ ...s, loading: true, error: null }));

    const filteredSlim = (filtered || []).map((s) => ({
      toiletBaik: Number(s?.toiletBaik || 0),
      toiletRusakSedang: Number(s?.toiletRusakSedang || 0),
      toiletRusakBerat: Number(s?.toiletRusakBerat || 0),
      totalToilet: Number(s?.totalToilet || 0),
    }));

    const allSlim = (all || []).map((s) => ({
      totalToilet: Number(s?.totalToilet || 0),
      toiletRusakBerat: Number(s?.toiletRusakBerat || 0),
    }));

    const handler = (e) => {
      const { ok, data, error } = e.data || {};
      if (ok) {
        setState({ loading: false, data, error: null });
      } else {
        setState((prev) => ({
          loading: false,
          data: prev.data,
          error: error || "Worker error",
        }));
      }
    };

    w.addEventListener("message", handler);
    w.postMessage({ filtered: filteredSlim, all: allSlim, kegiatan: kegiatan || [] });

    return () => {
      w.removeEventListener("message", handler);
    };
  }, [filtered, all, kegiatan]);

  return state;
}
