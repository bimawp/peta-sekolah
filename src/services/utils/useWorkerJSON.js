// src/utils/useWorkerJSON.js
import { useEffect, useRef, useState } from "react";

export function useWorkerJSON({ url, transform } = {}) {
  const workerRef = useRef(null);
  const [state, setState] = useState({ loading: !!url, data: null, error: null });

  useEffect(() => {
    if (!url) return;
    const worker = new Worker(new URL("../workers/json.worker.js", import.meta.url), { type: "module" });
    workerRef.current = worker;
    worker.onmessage = (e) => {
      const { ok, data, error } = e.data || {};
      if (ok) setState({ loading: false, data, error: null });
      else setState({ loading: false, data: null, error: error || "Worker error" });
    };
    worker.postMessage({ type: "load", url, transform });
    return () => worker.terminate();
  }, [url, transform]);

  return state;
}
