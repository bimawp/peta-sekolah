// src/hooks/useHydratedSchools.js
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Tujuan hook:
 * - Meng-augment list sekolah mentah (rawSchools) dengan field turunan:
 *   { computed_condition: "Baik|Rusak Sedang|Rusak Berat|Kurang RKB" }
 *
 * Sumber augment (opsional):
 *  1) /data/all_schools_processed.json
 *  2) /data/sd_new.json, /data/smp.json, /data/paud.json, /data/pkbm.json
 *     + fallback path lain agar robust.
 *
 * PENTING (sesuai DB Supabase Anda):
 * - Karena rawSchools dari Supabase sudah punya class_condition (jsonb),
 *   hook ini juga bisa mengisi computed_condition langsung dari s.class_condition
 *   tanpa bergantung pada file JSON statis.
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

  const name = normAgg(s?.nama || s?.name || s?.namaSekolah || s?.nama_sekolah || "");
  const desa = norm(
    s?.desa ||
      s?.village ||
      s?.village_name ||
      s?.villageName ||
      s?.nama_desa ||
      ""
  );
  const kec = kecKey(s?.kecamatan || s?.kecamatan_name || s?.kecamatanName || "");
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

// Parsing angka fleksibel untuk data JSONB campuran
function toNum(x) {
  if (x == null) return 0;
  if (typeof x === "number") return Number.isFinite(x) ? x : 0;
  const s = String(x).trim();
  if (!s) return 0;
  // dukung "1.234" / "1,234" / "1,5"
  const normalized = s.replace(/\./g, "").replace(",", ".");
  const v = Number(normalized);
  return Number.isFinite(v) ? v : 0;
}

// Hitung label kondisi dari class_condition (sesuai variasi key di data Anda)
function conditionFromClassCond(cc = {}) {
  if (!cc || typeof cc !== "object") return "";

  const good = toNum(cc.classrooms_good ?? cc.good ?? cc.baik);
  const mod = toNum(
    cc.classrooms_moderate_damage ??
      cc.moderate_damage ??
      cc.moderate ??
      cc.rusak_sedang ??
      cc.rusakSedang ??
      cc.rusak_ringan ??
      cc.rusakRingan
  );
  const heavy = toNum(
    cc.classrooms_heavy_damage ??
      cc.heavy_damage ??
      cc.heavy ??
      cc.rusak_berat ??
      cc.rusakBerat
  );

  // Di data Anda sering ada: kurangRkb, rkbTambahan
  const rkb = toNum(
    cc.lacking_rkb ??
      cc.kurang_rkb ??
      cc.kurangRkb ??
      cc.kurangRKB ??
      cc.rkb_tambahan ??
      cc.rkbTambahan
  );

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
      const cc = row.class_condition || row.classCondition || row.classConditionJson || {};
      const cond = conditionFromClassCond(cc);

      const npsn = (row.npsn || row.NPSN || "").toString().trim();
      let key = "";

      if (npsn) {
        key = `NPSN:${npsn}`;
      } else {
        const name = normAgg(row.nama || row.name || row.namaSekolah || row.nama_sekolah || "");
        const desa = norm(
          row.desa || row.village || row.village_name || row.villageName || row.nama_desa || ""
        );
        const kec = kecKey(kecamatanName || row.kecamatan || row.kecamatan_name || "");
        key = `NKD:${name}|${desa}|${kec}`;
      }

      // hanya simpan kalau ada label (biar tidak “nimpain” label dari sumber lain)
      if (cond) idx[key] = { computed_condition: cond };
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

    const baik = toNum(r.kondisi_baik ?? r.baik);
    const sedang = toNum(r.kondisi_rusak_sedang ?? r.sedang);
    const berat = toNum(r.kondisi_rusak_berat ?? r.berat);
    const rkb = toNum(r.kebutuhan_rkb ?? r.kurang_rkb ?? r.kurangRkb);

    let cond = "";
    if (rkb > 0) cond = "Kurang RKB";
    else if (berat > 0) cond = "Rusak Berat";
    else if (sedang > 0) cond = "Rusak Sedang";
    else if (baik > 0) cond = "Baik";

    if (cond) idx[`NPSN:${npsn}`] = { computed_condition: cond };
  }

  return idx;
}

export function useHydratedSchools(rawSchools) {
  const [condIndex, setCondIndex] = useState({});
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const ac = new AbortController();

    // support base path saat deploy (subfolder)
    const base = (import.meta?.env?.BASE_URL || "/").replace(/\/+$/, "/");
    const p = (u) => (u.startsWith("/") ? u : `/${u}`);

    (async () => {
      try {
        // optional agregasi kalau file ini tersedia
        const processed = await tryFetchJson(
          [p(`${base}data/all_schools_processed.json`).replace("//data", "/data")],
          ac.signal
        );
        const idxProcessed = buildIndexFromAllProcessed(processed || []);

        // empat dataset jenjang (dengan fallback)
        const sd = await tryFetchJson(
          [
            p(`${base}data/sd_new.json`).replace("//data", "/data"),
            p(`${base}data/sd.json`).replace("//data", "/data"),
            "/sd.json",
          ],
          ac.signal
        );

        const smp = await tryFetchJson(
          [
            p(`${base}data/smp.json`).replace("//data", "/data"),
            "/smp.json",
          ],
          ac.signal
        );

        const paud = await tryFetchJson(
          [
            p(`${base}data/paud.json`).replace("//data", "/data"),
            "/paud.json",
          ],
          ac.signal
        );

        const pkbm = await tryFetchJson(
          [
            p(`${base}data/pkbm.json`).replace("//data", "/data"),
            "/pkbm.json",
          ],
          ac.signal
        );

        const next = {
          ...idxProcessed,
          ...buildIndexFromGroupedDataset(sd || {}),
          ...buildIndexFromGroupedDataset(smp || {}),
          ...buildIndexFromGroupedDataset(paud || {}),
          ...buildIndexFromGroupedDataset(pkbm || {}),
        };

        if (mountedRef.current) {
          // Effect ini hanya jalan sekali; set saja agar index pasti terisi jika ada.
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

  /**
   * Gabungkan rawSchools + computed_condition:
   * Prioritas:
   * 1) jika rawSchools sudah punya computed_condition => pakai itu
   * 2) jika ada match di condIndex => pakai condIndex
   * 3) fallback dari s.class_condition (jsonb Supabase Anda) => derive langsung
   */
  return useMemo(() => {
    if (!Array.isArray(rawSchools) || rawSchools.length === 0) return rawSchools || [];

    const hasIndex = condIndex && Object.keys(condIndex).length > 0;

    return rawSchools.map((s) => {
      if (s && typeof s === "object" && s.computed_condition) return s;

      // 2) index dari file JSON (jika tersedia)
      if (hasIndex) {
        const k = schoolKey(s);
        const extra = condIndex[k];
        if (extra && extra.computed_condition) return { ...s, ...extra };
      }

      // 3) fallback dari class_condition (DB Supabase: schools.class_condition jsonb)
      const derived = conditionFromClassCond(s?.class_condition || s?.classCondition || {});
      return derived ? { ...s, computed_condition: derived } : s;
    });
  }, [rawSchools, condIndex]);
}
