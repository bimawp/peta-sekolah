// ringan & defensif: terima array sekolah terfilter + full dataset kegiatan
self.onmessage = (e) => {
  try {
    const { filtered = [], all = [], kegiatan = [] } = e.data || {};

    // ---- Rekap intervensi dari kegiatan ----
    const pembangunanDilakukan = (kegiatan || []).filter(
      (k) => k?.Kegiatan === "Pembangunan Toilet"
    ).length;
    const rehabDilakukan = (kegiatan || []).filter(
      (k) => k?.Kegiatan === "Rehab Toilet" || k?.Kegiatan === "Rehab Ruang Toilet"
    ).length;

    // ---- Rekap dari seluruh sekolah (all) ----
    const sekolahTanpaToilet = (all || []).filter(
      (s) => Number(s?.totalToilet ?? 0) === 0
    ).length;
    const kebutuhanRehabilitasi = (all || []).filter(
      (s) => Number(s?.toiletRusakBerat ?? 0) > 0
    ).length;

    // ---- Agregasi untuk “filtered” (yang tampak di halaman) ----
    let totalToiletBaik = 0, totalToiletRusakSedang = 0, totalToiletRusakBerat = 0;
    for (const s of filtered) {
      totalToiletBaik        += Number(s?.toiletBaik ?? 0);
      totalToiletRusakSedang += Number(s?.toiletRusakSedang ?? 0);
      totalToiletRusakBerat  += Number(s?.toiletRusakBerat ?? 0);
    }
    const totalToiletCount = totalToiletBaik + totalToiletRusakSedang + totalToiletRusakBerat;

    const pieMap = (d) => ({ ...d, actualCount: d.value });

    // ---- Output siap pakai ChartsSection (mengikuti warna yang kamu pakai) ----
    const pembangunanPieData = (() => {
      const kebutuhanBelum = Math.max(0, sekolahTanpaToilet - pembangunanDilakukan);
      const total = Math.max(1, sekolahTanpaToilet);
      return [
        { name: "Kebutuhan Toilet (Belum dibangun)", value: kebutuhanBelum, percent: (kebutuhanBelum / total) * 100, color: "#FF6B6B" },
        { name: "Pembangunan dilakukan",              value: pembangunanDilakukan, percent: (pembangunanDilakukan / total) * 100, color: "#4ECDC4" },
      ].map(pieMap);
    })();

    const rehabilitasiPieData = (() => {
      const total = Math.max(1, kebutuhanRehabilitasi + rehabDilakukan);
      const arr = [
        { name: "Rusak Berat (Belum Direhab)", value: kebutuhanRehabilitasi, percent: (kebutuhanRehabilitasi / total) * 100, color: "#FF6B6B" },
        { name: "Rehab Dilakukan",             value: rehabDilakukan,        percent: (rehabDilakukan / total) * 100,        color: "#4ECDC4" },
      ].filter(d => d.value > 0).map(pieMap);
      return arr.length ? arr : [{ name: "Tidak Ada Data", value: 1, actualCount: 0, percent: 100, color: "#95A5A6" }];
    })();

    const kondisiToiletData = [
      { name: "Total Unit",           value: totalToiletCount,       color: "#667eea" },
      { name: "Unit Baik",            value: totalToiletBaik,        color: "#4ECDC4" },
      { name: "Unit Rusak Sedang",    value: totalToiletRusakSedang, color: "#FFD93D" },
      { name: "Unit Rusak Berat",     value: totalToiletRusakBerat,  color: "#FF6B6B" },
      { name: "Sekolah Tanpa Toilet", value: (filtered || []).filter((s) => Number(s?.totalToilet ?? 0) === 0).length, color: "#ff8787" },
    ];

    const kondisiPieData = totalToiletCount > 0
      ? [
          { name: "Baik",          value: totalToiletBaik,        percent: (totalToiletBaik / totalToiletCount) * 100,        color: "#4ECDC4" },
          { name: "Rusak Sedang",  value: totalToiletRusakSedang, percent: (totalToiletRusakSedang / totalToiletCount) * 100, color: "#FFD93D" },
          { name: "Rusak Berat",   value: totalToiletRusakBerat,  percent: (totalToiletRusakBerat / totalToiletCount) * 100,  color: "#FF6B6B" },
        ].map(pieMap)
      : [{ name: "Tidak Ada Data", value: 1, actualCount: 0, percent: 100, color: "#95A5A6" }];

    const intervensiToiletData = [
      { name: "Total Intervensi",   value: pembangunanDilakukan + rehabDilakukan, color: "#667eea" },
      { name: "Pembangunan Toilet", value: pembangunanDilakukan,                   color: "#4ECDC4" },
      { name: "Rehab Toilet",       value: rehabDilakukan,                         color: "#FFD93D" },
    ];

    postMessage({
      ok: true,
      data: {
        kondisiPieData,
        rehabilitasiPieData,
        pembangunanPieData,
        kondisiToiletData,
        intervensiToiletData,
      },
    });
  } catch (err) {
    postMessage({ ok: false, error: err?.message || String(err) });
  }
};
