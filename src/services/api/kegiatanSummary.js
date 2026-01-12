// src/services/api/kegiatanSummary.js
import supabase from "@/services/supabaseClient";

/** =======================================================
 *  Helpers (normalisasi output RPC -> bentuk yang konsisten)
 *  ======================================================= */

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const pick = (obj, keys, def = undefined) => {
  for (const k of keys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null) return obj[k];
  }
  return def;
};

const asArray = (data) => {
  if (Array.isArray(data)) return data;
  if (!data) return [];
  // antisipasi kalau RPC mengembalikan object json berisi list
  if (Array.isArray(data.rows)) return data.rows;
  if (Array.isArray(data.data)) return data.data;
  return [];
};

function normJenjang(x) {
  const s = String(x || "").trim().toUpperCase();
  if (!s) return "LAINNYA";
  if (s === "PAUD" || s === "SD" || s === "SMP" || s === "PKBM") return s;
  return s;
}

function normKegiatan(x) {
  return String(x || "").trim();
}

/**
 * Pastikan setiap row punya minimal:
 * { jenjang, kegiatan, total_lokal, sekolah }
 *
 * Catatan:
 * - Nama kolom RPC Anda mungkin berbeda. Karena itu saya siapkan fallback keys.
 * - Jika RPC Anda sudah mengembalikan {jenjang,kegiatan,total_lokal,sekolah}, mapping ini aman.
 */
function normalizeKegiatanRow(r) {
  const jenjang = normJenjang(
    pick(r, ["jenjang", "level", "school_level", "kode_jenjang"], "LAINNYA")
  );

  const kegiatan = normKegiatan(
    pick(r, ["kegiatan", "activity", "jenis_kegiatan", "kegiatan_fisik"], "")
  );

  const total_lokal = toNum(
    pick(r, ["total_lokal", "total_anggaran", "total_budget", "total", "nilai", "jumlah"], 0)
  );

  const sekolah = toNum(
    pick(r, ["sekolah", "jumlah_sekolah", "total_sekolah", "school_count", "schools"], 0)
  );

  return { jenjang, kegiatan, total_lokal, sekolah, _raw: r };
}

function groupByJenjang(rows = []) {
  const out = {};
  for (const r of rows || []) {
    const j = normJenjang(r.jenjang);
    if (!out[j]) out[j] = [];
    out[j].push(r);
  }
  return out;
}

function aggregateSummaryFromByJenjang(byJenjangRows = []) {
  const rows = Array.isArray(byJenjangRows) ? byJenjangRows : [];
  const byKegiatan = new Map();

  for (const r of rows) {
    const k = normKegiatan(r.kegiatan);
    if (!k) continue;

    const prev = byKegiatan.get(k) || { kegiatan: k, total_lokal: 0, sekolah: 0 };
    prev.total_lokal += toNum(r.total_lokal);
    prev.sekolah += toNum(r.sekolah);
    byKegiatan.set(k, prev);
  }

  return Array.from(byKegiatan.values());
}

/** =======================================================
 *  FETCHERS (sesuai Supabase Anda: pakai RPC yang tersedia)
 *  ======================================================= */

export async function fetchKegiatanSummaryByJenjang() {
  const { data, error } = await supabase.rpc("rpc_kegiatan_summary_by_jenjang");
  if (error) throw error;

  const rows = asArray(data).map(normalizeKegiatanRow);

  // buang row tanpa kegiatan (kalau ada)
  return rows.filter((r) => !!r.kegiatan);
}

/**
 * Karena tidak ada view `kegiatan_summary`,
 * summary kita bentuk dari hasil RPC by-jenjang (diaggregate lintas jenjang).
 */
export async function fetchKegiatanSummary() {
  const byJenjang = await fetchKegiatanSummaryByJenjang();
  return aggregateSummaryFromByJenjang(byJenjang);
}

/**
 * Legacy:
 * Anda bilang tidak dipakai, tapi saya jadikan alias supaya import lama tidak pecah.
 * (Datanya tetap berasal dari RPC terbaru).
 */
export async function fetchKegiatanSummaryLegacy() {
  return fetchKegiatanSummary();
}

export async function fetchKegiatanSummaryByJenjangLegacy() {
  return fetchKegiatanSummaryByJenjang();
}

/** =======================================================
 *  ADAPTER untuk data CHART (tanpa mengubah komponen)
 *  ======================================================= */

function findKegiatanRow(summary = [], label) {
  const key = String(label || "").toLowerCase();

  // Perluas matching supaya tidak ketat "rehab" saja
  const synonyms =
    key === "rehab"
      ? ["rehab", "rehabil", "rehabilitasi"]
      : key === "pembangunan"
      ? ["pembangunan", "bangun", "pembang", "new"]
      : [key];

  const found =
    (summary || []).find((r) => {
      const k = String(r.kegiatan || "").toLowerCase();
      return synonyms.some((s) => k.includes(s));
    }) || { kegiatan: label, total_lokal: 0, sekolah: 0 };

  return found;
}

export function computeIntervensiDatasets(summaryRows = [], byJenjangRows = []) {
  const summary = aggregateSummaryFromByJenjang(summaryRows); // aman meski sudah summary
  const perJenjang = groupByJenjang(byJenjangRows);

  const rehab = findKegiatanRow(summary, "rehab");
  const pembangunan = findKegiatanRow(summary, "pembangunan");

  const pieIntervensiLokals = [toNum(rehab.total_lokal), toNum(pembangunan.total_lokal)];
  const pieIntervensiSchools = [toNum(rehab.sekolah), toNum(pembangunan.sekolah)];

  const totalLokals = (summary || []).reduce((acc, r) => acc + toNum(r.total_lokal), 0);
  const barIntervensiLokals = {
    total: totalLokals,
    pembangunan: toNum(pembangunan.total_lokal),
    rehab: toNum(rehab.total_lokal),
  };

  const totalSchools = (summary || []).reduce((acc, r) => acc + toNum(r.sekolah), 0);
  const barIntervensiSchools = {
    total: totalSchools,
    pembangunan: toNum(pembangunan.sekolah),
    rehab: toNum(rehab.sekolah),
  };

  return {
    summary,
    pieIntervensiLokals,
    pieIntervensiSchools,
    barIntervensiLokals,
    barIntervensiSchools,
    intervensiByJenjang: perJenjang,
  };
}

/** =======================================================
 *  CONVENIENCE: ambil & hitung semua (1x panggil RPC)
 *  ======================================================= */
export async function loadAllIntervensiDatasets({ useLegacy = false } = {}) {
  // useLegacy dipertahankan untuk kompatibilitas,
  // tapi sumber tetap dari RPC terbaru.
  const byJenjang = useLegacy
    ? await fetchKegiatanSummaryByJenjangLegacy()
    : await fetchKegiatanSummaryByJenjang();

  const summary = aggregateSummaryFromByJenjang(byJenjang);
  return computeIntervensiDatasets(summary, byJenjang);
}
