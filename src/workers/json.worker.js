// src/workers/json.worker.js
self.onmessage = async (e) => {
  const { type, url, transform } = e.data || {};
  try {
    if (type === "load") {
      const res = await fetch(url, { cache: "force-cache" });
      const text = await res.text();
      const json = JSON.parse(text);

      let out = json;
      // Tambah transform bila perlu: "kecamatan-centroids", "index-schools", dll.
      if (transform === "noop") {
        out = json;
      }

      postMessage({ ok: true, data: out });
    } else {
      postMessage({ ok: false, error: "Unknown message type" });
    }
  } catch (err) {
    postMessage({ ok: false, error: err?.message || String(err) });
  }
};
