// src/workers/enrichKegiatan.worker.js
/* eslint-disable no-restricted-globals */
self.onmessage = (e) => {
  const { paud, sd, smp, pkbm } = e.data || {};
  const all = [
    ...(Array.isArray(paud) ? paud : []),
    ...(Array.isArray(sd) ? sd : []),
    ...(Array.isArray(smp) ? smp : []),
    ...(Array.isArray(pkbm) ? pkbm : []),
  ];

  const kegiatanMap = {};
  for (const kegiatan of all) {
    if (!kegiatan || !kegiatan.npsn) continue;
    const npsn = String(kegiatan.npsn);
    const lokalCount = parseInt(kegiatan.Lokal) || 0;
    const ref = (kegiatanMap[npsn] ||= { rehabRuangKelas: 0, pembangunanRKB: 0 });
    if (kegiatan.Kegiatan?.includes('Rehab')) ref.rehabRuangKelas += lokalCount;
    if (kegiatan.Kegiatan?.includes('Pembangunan')) ref.pembangunanRKB += lokalCount;
  }
  postMessage({ kegiatanMap });
};
