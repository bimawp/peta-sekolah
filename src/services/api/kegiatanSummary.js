// src/services/api/kegiatanSummary.js
import { supabase } from '@/services/supabaseClient';

/** =======================================================
 *  FETCHERS (ambil data dari view yg kita buat)
 *  ======================================================= */
export async function fetchKegiatanSummary() {
  const { data, error } = await supabase
    .from('kegiatan_summary')
    .select('*');
  if (error) throw error;
  return data || [];
}

export async function fetchKegiatanSummaryByJenjang() {
  const { data, error } = await supabase
    .from('kegiatan_summary_by_jenjang')
    .select('*');
  if (error) throw error;
  return data || [];
}

// Opsional: versi legacy (kalau kamu aktifkan view legacy)
export async function fetchKegiatanSummaryLegacy() {
  const { data, error } = await supabase
    .from('kegiatan_summary_legacy')
    .select('*');
  if (error) throw error;
  return data || [];
}

export async function fetchKegiatanSummaryByJenjangLegacy() {
  const { data, error } = await supabase
    .from('kegiatan_summary_by_jenjang_legacy')
    .select('*');
  if (error) throw error;
  return data || [];
}

/** =======================================================
 *  ADAPTER untuk data CHART (tanpa mengubah komponen)
 *  - Menghasilkan dua mode:
 *    1) berbasis LOKAL  (sum lokal)     -> “*_Lokals”
 *    2) berbasis SEKOLAH (count unique) -> “*_Schools”
 *  Kamu tinggal mengikat ke props komponen yang sudah ada.
 *  ======================================================= */
export function computeIntervensiDatasets(summary = [], byJenjang = []) {
  // Normalisasi: pastikan record ada untuk Rehab & Pembangunan
  const get = (arr, key) => (arr.find(r => r.kegiatan === key) || { sekolah: 0, total_lokal: 0 });

  const rehab = get(summary, 'Rehab');
  const pembangunan = get(summary, 'Pembangunan');

  // ---- PIE (LOKAL) -> array [Rehab, Pembangunan]
  const pieIntervensiLokals = [rehab.total_lokal || 0, pembangunan.total_lokal || 0];

  // ---- PIE (SEKOLAH) -> array [Rehab, Pembangunan]
  const pieIntervensiSchools = [rehab.sekolah || 0, pembangunan.sekolah || 0];

  // ---- BAR (LOKAL) -> { total, pembangunan, rehab }
  const totalLokals = (summary || []).reduce((acc, r) => acc + (r.total_lokal || 0), 0);
  const barIntervensiLokals = {
    total: totalLokals,
    pembangunan: pembangunan.total_lokal || 0,
    rehab: rehab.total_lokal || 0,
  };

  // ---- BAR (SEKOLAH) -> { total, pembangunan, rehab }
  const totalSchools = (summary || []).reduce((acc, r) => acc + (r.sekolah || 0), 0);
  const barIntervensiSchools = {
    total: totalSchools,
    pembangunan: pembangunan.sekolah || 0,
    rehab: rehab.sekolah || 0,
  };

  // ---- Breakdown per jenjang (LOKAL & SEKOLAH)
  // Bentuk: { PAUD: { Rehab:{lokal, sekolah}, Pembangunan:{lokal, sekolah} }, ... }
  const perJenjang = {};
  (byJenjang || []).forEach(r => {
    if (!perJenjang[r.jenjang]) {
      perJenjang[r.jenjang] = {
        Rehab: { lokal: 0, sekolah: 0 },
        Pembangunan: { lokal: 0, sekolah: 0 },
      };
    }
    perJenjang[r.jenjang][r.kegiatan] = {
      lokal: r.total_lokal || 0,
      sekolah: r.sekolah || 0,
    };
  });

  return {
    // mode berbasis lokal (buat pie & bar “lokal”)
    pieIntervensiLokals,
    barIntervensiLokals,

    // mode berbasis jumlah sekolah (buat pie & bar “sekolah”)
    pieIntervensiSchools,
    barIntervensiSchools,

    // breakdown per jenjang (bisa untuk table/tooltip)
    intervensiByJenjang: perJenjang,
  };
}

/** =======================================================
 *  CONVENIENCE: satu fungsi ambil & hitung semua
 *  ======================================================= */
export async function loadAllIntervensiDatasets({ useLegacy = false } = {}) {
  const [sum, byJenjang] = await Promise.all([
    useLegacy ? fetchKegiatanSummaryLegacy() : fetchKegiatanSummary(),
    useLegacy ? fetchKegiatanSummaryByJenjangLegacy() : fetchKegiatanSummaryByJenjang(),
  ]);
  return computeIntervensiDatasets(sum, byJenjang);
}
