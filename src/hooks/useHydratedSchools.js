// src/hooks/useHydratedSchools.js
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Tujuan hook:
 * - Meng-augment list sekolah mentah (rawSchools) dengan field turunan:
 *   { computed_condition: "Baik|Rusak Sedang|Rusak Berat|Kurang RKB" }
 * - Sumber augment:
 *   1) /data/all_schools_processed.json  (opsional)
 *   2) /data/sd_new.json, /data/smp.json, /data/paud.json, /data/pkbm.json
 * - Fallback path juga dicoba (mis. "/sd.json") agar robust di berbagai deploy.
 *
 * Catatan optimasi:
 * - Abort fetch saat unmount (menghindari setState setelah unmount).
 * - Hindari penulisan state kalau index tidak berubah ukurannya (mengurangi render).
 * - Normalisasi & keying konsisten (NPSN diutamakan; fallback NKD:name|desa|kec).
 */

// ===== Normalisasi ringan (lokal) =====
const up = (s) => (s ?? "").toString().toUpperCase();
const norm = (s) => up(s).trim().replace(/\s+/g, " ");
const normAgg = (s) => up(s).replace(/[^A-Z0-9]/g, "");
const kecKey = (name) =>
  up(name || "")
    .replace(/\bKEC(?:AMATAN)?\.?\b/g, "")
    .replace(/[^A-Z]/g, "");

// Key unik sekolah
const schoolKey = (s) => {
  const npsn = (s?.npsn || s?.NPSN || s?.id_npsn || "").toString().trim();
  if (npsn) return `NPSN:${npsn}`;
  const name = normAgg(s?.nama || s?.name || s?.namaSekolah || "");
  const desa = norm(s?.desa || s?.village || "");
  const kec = kecKey(s?.kecamatan || "");
  return `NKD:${name}|${desa}|${kec}`;
};

// Ambil JSON dengan mencoba beberapa URL (plus Abort)
async function tryFetchJson(urls, signal) {
  for (const u of urls) {
    try {
      const r = await fetch(u, { cache: "no-store", signal });
      if (r.ok) return await r.json();
    } catch {
      // abaikan dan lanjut ke URL berikut
    }
  }
  return null;
}

// Hitung label kondisi dari class_condition
function conditionFromClassCond(cc = {}) {
  const num = (x) => {
    const v = Number(String(x ?? 0).replace(",", "."));
    return Number.isFinite(v) ? v : 0;
  };
  const good = num(cc.classrooms_good ?? cc.good);
  const mod = num(cc.classrooms_moderate_damage ?? cc.moderate_damage);
  const heavy = num(cc.classrooms_heavy_damage ?? cc.heavy_damage);
  const rkb = num(cc.lacking_rkb ?? cc.lacking_RKB);
  if (rkb > 0) return "Kurang RKB";
  if (heavy > 0) return "Rusak Berat";
  if (mod > 0) return "Rusak Sedang";
  if (good > 0) return "Baik";
  return "";
}

// Dataset per jenjang: { "Kec. XXX": [ { npsn, name, village, class_condition } ] }
function buildIndexFromGroupedDataset(ds) {
  const idx = {};
  if (!ds || typeof ds !== "object") return idx;
  for (const [kecamatanName, arr] of Object.entries(ds)) {
    if (!Array.isArray(arr)) continue;
    for (const row of arr) {
      const cond = conditionFromClassCond(
        row.class_condition || row.classCondition || {}
      );
      const npsn = (row.npsn || row.NPSN || "").toString().trim();
      let key = "";
      if (npsn) key = `NPSN:${npsn}`;
      else {
        const name = normAgg(row.nama || row.name || row.namaSekolah || "");
        const desa = norm(row.desa || row.village || "");
        const kec = kecKey(kecamatanName || row.kecamatan || "");
        key = `NKD:${name}|${desa}|${kec}`;
      }
      idx[key] = { computed_condition: cond };
    }
  }
  return idx;
}

// Index dari all_schools_processed.json (flat array)
function buildIndexFromAllProcessed(arr) {
  const idx = {};
  if (!Array.isArray(arr)) return idx;
  for (const r of arr) {
    const npsn = (r.npsn || r.NPSN || "").toString().trim();
    if (!npsn) continue;
    const baik = Number(r.kondisi_baik || 0);
    const sedang = Number(r.kondisi_rusak_sedang || 0);
    const berat = Number(r.kondisi_rusak_berat || 0);
    const rkb = Number(r.kebutuhan_rkb || 0);
    let cond = "";
    if (rkb > 0) cond = "Kurang RKB";
    else if (berat > 0) cond = "Rusak Berat";
    else if (sedang > 0) cond = "Rusak Sedang";
    else if (baik > 0) cond = "Baik";
    idx[`NPSN:${npsn}`] = { computed_condition: cond };
  }
  return idx;
}

export function useHydratedSchools(rawSchools) {
  const [condIndex, setCondIndex] = useState({});
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const ac = new AbortController();

    (async () => {
      try {
        // optional agregasi kalau file ini tersedia
        const processed = await tryFetchJson(
          ["/data/all_schools_processed.json"],
          ac.signal
        );
        const idxProcessed = buildIndexFromAllProcessed(processed || []);

        // empat dataset jenjang (dengan fallback)
        const sd = await tryFetchJson(
          ["/data/sd_new.json", "/data/sd.json", "/sd.json"],
          ac.signal
        );
        const smp = await tryFetchJson(
          ["/data/smp.json", "/smp.json"],
          ac.signal
        );
        const paud = await tryFetchJson(
          ["/data/paud.json", "/paud.json"],
          ac.signal
        );
        const pkbm = await tryFetchJson(
          ["/data/pkbm.json", "/pkbm.json"],
          ac.signal
        );

        const next = {
          ...idxProcessed,
          ...buildIndexFromGroupedDataset(sd || {}),
          ...buildIndexFromGroupedDataset(smp || {}),
          ...buildIndexFromGroupedDataset(paud || {}),
          ...buildIndexFromGroupedDataset(pkbm || {}),
        };

        // Hindari setState bila tidak berubah signifikan
        if (
          mountedRef.current &&
          Object.keys(next).length !== Object.keys(condIndex).length
        ) {
          setCondIndex(next);
        }
      } catch {
        // diamkan; hook tetap jalan dengan tanpa augment
      }
    })();

    return () => {
      mountedRef.current = false;
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // load sekali: index bersifat global

  // Gabungkan rawSchools + computed_condition (jaga imutabilitas)
  return useMemo(() => {
    if (!Array.isArray(rawSchools) || !rawSchools.length) return rawSchools || [];
    if (!condIndex || !Object.keys(condIndex).length) return rawSchools;

    return rawSchools.map((s) => {
      const k = schoolKey(s);
      const extra = condIndex[k];
      return extra ? { ...s, ...extra } : s;
    });
  }, [rawSchools, condIndex]);
}
