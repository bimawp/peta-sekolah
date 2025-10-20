// src/components/map/InlineMapFilters.jsx
import React, { useMemo } from "react";

const KONDISI = ["Semua Kondisi","Baik","Rusak Sedang","Rusak Berat","Kurang RKB"];
const norm = (v) => (v ?? "").toString().trim().toLowerCase();

export default function InlineMapFilters({ data = [], value, onChange }) {
  const v = value ?? {};

  // Bentuk opsi dari data marker yg SUDAH ada (client-side)
  const { kecamatan, desa, jenjang } = useMemo(() => {
    const kecSet = new Set();
    const desaByKec = new Map();
    const jenSet = new Set();

    for (const s of Array.isArray(data) ? data : []) {
      const kec = (s.kecamatan ?? s.kecamatan_norm ?? "").toString().trim();
      const des = (s.village ?? s.desa ?? s.desa_norm ?? "").toString().trim();
      const jen = (s.jenjang ?? s.level ?? s.jenjang2 ?? "").toString().trim();
      if (kec) {
        kecSet.add(kec);
        if (des) {
          if (!desaByKec.has(kec)) desaByKec.set(kec, new Set());
          desaByKec.get(kec).add(des);
        }
      }
      if (jen) jenSet.add(jen);
    }

    const kecamatan = Array.from(kecSet).sort();
    const desa =
      v.kecamatan && v.kecamatan !== "Semua Kecamatan"
        ? Array.from(desaByKec.get(v.kecamatan) ?? []).sort()
        : [];
    const jenjang = Array.from(jenSet).sort();
    return { kecamatan, desa, jenjang };
  }, [data, v.kecamatan]);

  const box = {
    position: "absolute",
    top: 12, left: 12, right: 12, zIndex: 1000,
    display: "grid", gridTemplateColumns: "1.2fr 1.2fr 1fr 1fr", gap: 8,
    background: "rgba(255,255,255,.97)", backdropFilter: "blur(6px)",
    borderRadius: 12, padding: 10, boxShadow: "0 6px 18px rgba(0,0,0,.08)"
  };
  const select = { width: "100%", height: 34, borderRadius: 8, padding: "0 10px", border: "1px solid #e5e7eb" };
  const label  = { fontSize: 12, opacity: .8, marginBottom: 6 };

  return (
    <div style={box}>
      <div>
        <div style={label}>Kecamatan</div>
        <select
          style={select}
          value={v.kecamatan || "Semua Kecamatan"}
          onChange={(e)=> onChange({ kecamatan: e.target.value, desa: "Semua Desa" })}
        >
          <option>Semua Kecamatan</option>
          {kecamatan.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>

      <div>
        <div style={label}>Desa</div>
        <select
          style={select}
          disabled={!v.kecamatan || v.kecamatan === "Semua Kecamatan"}
          value={v.desa || "Semua Desa"}
          onChange={(e)=> onChange({ desa: e.target.value })}
        >
          <option>Semua Desa</option>
          {desa.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div>
        <div style={label}>Jenjang</div>
        <select
          style={select}
          value={v.jenjang || "Semua Jenjang"}
          onChange={(e)=> onChange({ jenjang: e.target.value })}
        >
          <option>Semua Jenjang</option>
          {(jenjang).map(j => <option key={j} value={j}>{j}</option>)}
        </select>
      </div>

      <div>
        <div style={label}>Kondisi</div>
        <select
          style={select}
          value={v.kondisi || "Semua Kondisi"}
          onChange={(e)=> onChange({ kondisi: e.target.value })}
        >
          {KONDISI.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>
    </div>
  );
}

// Helper untuk menyaring marker sesuai filter
export function filterMarkers(rows = [], f = {}) {
  const kond = (r) => {
    const heavy = r.classrooms_heavy_damage ?? r.rusak_berat ?? r.r_berat ?? 0;
    const mod   = r.classrooms_moderate_damage ?? r.rusak_sedang ?? r.r_sedang ?? 0;
    const lack  = r.lacking_rkb ?? r.kurang_rkb ?? r.kebutuhan_rkb ?? r.kebutuhan_rkb_perkiraan ?? 0;
    if (heavy > 0) return "Rusak Berat";
    if (mod   > 0) return "Rusak Sedang";
    if (lack  > 0) return "Kurang RKB";
    return "Baik";
  };

  return rows.filter((r) => {
    if (f.kecamatan && f.kecamatan !== "Semua Kecamatan" &&
        norm(r.kecamatan ?? r.kecamatan_norm) !== norm(f.kecamatan)) return false;
    if (f.desa && f.desa !== "Semua Desa" &&
        norm(r.village ?? r.desa ?? r.desa_norm) !== norm(f.desa)) return false;
    if (f.jenjang && f.jenjang !== "Semua Jenjang" &&
        (r.jenjang ?? r.level ?? r.jenjang2) !== f.jenjang) return false;
    if (f.kondisi && f.kondisi !== "Semua Kondisi" &&
        kond(r) !== f.kondisi) return false;
    return true;
  });
}
