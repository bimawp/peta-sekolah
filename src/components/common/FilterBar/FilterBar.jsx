// src/components/common/FilterBar/FilterBar.jsx
import React from "react";
import styles from "./FilterBar.module.css";
import { useHydratedData } from "../../../contexts/HydratedDataProvider";

export default function FilterBar({
  value,
  onChange,
  options,
  showDesa = true,
  showKondisi = true,
  extraActions = null,
}) {
  const { lists } = useHydratedData();
  const opts = {
    jenjang: options?.jenjang || ["(Semua Jenjang)", "PAUD", "SD", "SMP", "PKBM"],
    kondisi: options?.kondisi || ["(Semua Kondisi)", "Baik", "Rusak Sedang", "Rusak Berat", "Kurang RKB"],
    kecamatan: ["(Semua Kecamatan)", ...((options?.kecamatan || lists.kecamatan) ?? [])],
    desa: ["(Semua Desa)", ...((options?.desa || lists.desa) ?? [])]
  };

  const v = value || { jenjang:"(Semua Jenjang)", kondisi:"(Semua Kondisi)", kecamatan:"(Semua Kecamatan)", desa:"(Semua Desa)" };

  const update = (patch) => onChange && onChange({ ...v, ...patch });

  return (
    <div className={styles.filterBar} data-test-id="filter-bar">
      <div className={styles.control}>
        <label className={styles.label}>Jenjang</label>
        <select className={styles.select} value={v.jenjang} onChange={(e)=>update({ jenjang: e.target.value })}>
          {opts.jenjang.map(o => <option key={o}>{o}</option>)}
        </select>
      </div>

      {showKondisi && (
        <div className={styles.control}>
          <label className={styles.label}>Kondisi</label>
          <select className={styles.select} value={v.kondisi} onChange={(e)=>update({ kondisi: e.target.value })}>
            {opts.kondisi.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
      )}

      <div className={styles.control}>
        <label className={styles.label}>Kecamatan</label>
        <select className={styles.select} value={v.kecamatan} onChange={(e)=>update({ kecamatan: e.target.value, desa: "(Semua Desa)" })}>
          {opts.kecamatan.map(o => <option key={o}>{o}</option>)}
        </select>
      </div>

      {showDesa && (
        <div className={styles.control}>
          <label className={styles.label}>Desa</label>
          <select className={styles.select} value={v.desa} disabled={v.kecamatan?.startsWith?.("(Semua")} onChange={(e)=>update({ desa: e.target.value })}>
            {opts.desa.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
      )}

      <div className={styles.actions}>
        {extraActions}
      </div>
    </div>
  );
}
