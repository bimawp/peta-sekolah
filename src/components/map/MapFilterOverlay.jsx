// src/components/map/MapFilterOverlay.jsx
import React, { useMemo } from "react";
import styles from "./MapFilterOverlay.module.css";

const norm = (v) => (v ?? "").toString().trim().toLowerCase();

export default function MapFilterOverlay({ data = [], value, onChange }) {
  const v = value ?? {
    jenjang: "Semua Jenjang",
    kecamatan: "Semua Kecamatan",
    desa: "Semua Desa",
    kondisi: "Semua Kondisi",
  };

  // Opsi dropdown disusun dari data peta yang sedang ditampilkan
  const { jenjang, kecamatan, desa } = useMemo(() => {
    const jen = new Set();
    const kec = new Set();
    const desaByKec = new Map();

    for (const s of data) {
      const j = (s.jenjang || s.level || s.jenjang2 || "").toString().trim();
      const k = (s.kecamatan || "").toString().trim();
      const d = (s.desa || s.village || "").toString().trim();
      if (j) jen.add(j);
      if (k) {
        kec.add(k);
        if (d) {
          if (!desaByKec.has(k)) desaByKec.set(k, new Set());
          desaByKec.get(k).add(d);
        }
      }
    }

    return {
      jenjang: Array.from(jen).sort(),
      kecamatan: Array.from(kec).sort(),
      desa:
        v.kecamatan && v.kecamatan !== "Semua Kecamatan"
          ? Array.from(desaByKec.get(v.kecamatan) || []).sort()
          : [],
    };
  }, [data, v.kecamatan]);

  return (
    <div className={styles.overlay}>
      <div className={styles.field}>
        <label className={styles.label}><span className={styles.labelIcon}>🎓</span>Jenjang</label>
        <select
          className={styles.select}
          value={v.jenjang}
          onChange={(e) => onChange({ jenjang: e.target.value })}
        >
          <option>Semua Jenjang</option>
          {jenjang.map((j) => (
            <option key={j} value={j}>{j}</option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label}><span className={styles.labelIcon}>🏘️</span>Kecamatan</label>
        <select
          className={styles.select}
          value={v.kecamatan}
          onChange={(e) => onChange({ kecamatan: e.target.value, desa: "Semua Desa" })}
        >
          <option>Semua Kecamatan</option>
          {kecamatan.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label}><span className={styles.labelIcon}>🏠</span>Desa</label>
        <select
          className={styles.select}
          disabled={v.kecamatan === "Semua Kecamatan"}
          value={v.desa}
          onChange={(e) => onChange({ desa: e.target.value })}
        >
          <option>Semua Desa</option>
          {desa.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label}><span className={styles.labelIcon}>🧱</span>Kondisi</label>
        <select
          className={styles.select}
          value={v.kondisi}
          onChange={(e) => onChange({ kondisi: e.target.value })}
        >
          {["Semua Kondisi", "Baik", "Rusak Sedang", "Rusak Berat", "Kurang RKB"].map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// Helper publik, jika mau dipakai di tempat lain
export function filterByJKD(rows = [], f = {}) {
  // “Kondisi” dipisah — tidak diwajibkan. Ini hanya filter dasar JKD.
  const j = f?.jenjang, k = f?.kecamatan, d = f?.desa;
  return rows.filter((r) => {
    if (j && j !== "Semua Jenjang" && (r.jenjang || r.level || r.jenjang2) !== j) return false;
    if (k && k !== "Semua Kecamatan" && norm(r.kecamatan) !== norm(k)) return false;
    if (d && d !== "Semua Desa" && norm(r.desa || r.village) !== norm(d)) return false;
    return true;
  });
}

export function applyKondisi(rows = [], kondisi) {
  if (!kondisi || kondisi === "Semua Kondisi") return rows;
  const kondisiOf = (row) => {
    const berat = Number(row?.kondisiKelas?.rusakBerat || 0);
    const sedang = Number(row?.kondisiKelas?.rusakSedang || 0);
    const kurang = Number(row?.kurangRKB || 0);
    if (berat > 0) return "Rusak Berat";
    if (sedang > 0) return "Rusak Sedang";
    if (kurang > 0) return "Kurang RKB";
    return "Baik";
  };
  return rows.filter((r) => kondisiOf(r) === kondisi);
}
