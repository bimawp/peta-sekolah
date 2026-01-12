// src/components/common/FilterBar/FilterBar.jsx
import React from "react";
import useGeoData from '@/hooks/useGeoData'; // <--- Panggil Hook Master Data
import styles from "./FilterBar.module.css";
// HAPUS atau comment baris ini karena kita tidak mau pakai data yang bisa 'menyusut'
// import { useHydratedData } from "../../../contexts/HydratedDataProvider"; 

export default function FilterBar({
  value,
  onChange,
  // options, // <--- Hapus/Abaikan props options untuk geo, kita pakai Master Data saja
  showDesa = true,
  showKondisi = true,
  extraActions = null,
}) {
  // 1. PANGGIL DATA MASTER (Wajib ada biar dropdown penuh terus)
  const { kecamatanList, getDesaByKecamatan } = useGeoData();

  // 2. Setup Default Value
  const v = value || { 
    jenjang: "(Semua Jenjang)", 
    kondisi: "(Semua Kondisi)", 
    kecamatan: "(Semua Kecamatan)", 
    desa: "(Semua Desa)" 
  };

  // 3. Ambil Desa sesuai Kecamatan yang DIPILIH (Real-time dari Master)
  const currentKecamatan = v.kecamatan === "(Semua Kecamatan)" ? null : v.kecamatan;
  const rawDesaList = getDesaByKecamatan(currentKecamatan);

  // 4. Susun Opsi Dropdown
  const opts = {
    jenjang: ["(Semua Jenjang)", "PAUD", "SD", "SMP", "PKBM"],
    kondisi: ["(Semua Kondisi)", "Baik", "Rusak Sedang", "Rusak Berat", "Kurang RKB"],
    
    // PERBAIKAN VITAL: Ambil langsung dari Master List (Pasti 42 Kecamatan)
    // Jangan pakai 'lists.kecamatan' atau 'options.kecamatan' lagi!
    kecamatan: ["(Semua Kecamatan)", ...kecamatanList],
    
    // PERBAIKAN VITAL: Ambil dari hasil helper hook
    desa: ["(Semua Desa)", ...rawDesaList]
  };

  const update = (patch) => onChange && onChange({ ...v, ...patch });

  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>
        <div className={styles.filterBar} data-test-id="filter-bar">
          
          {/* JENJANG */}
          <div className={styles.control}>
            <label className={styles.label}>Jenjang</label>
            <select
              className={styles.select}
              value={v.jenjang}
              onChange={(e) => update({ jenjang: e.target.value })}
            >
              {opts.jenjang.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>

          {/* KONDISI */}
          {showKondisi && (
            <div className={styles.control}>
              <label className={styles.label}>Kondisi</label>
              <select
                className={styles.select}
                value={v.kondisi}
                onChange={(e) => update({ kondisi: e.target.value })}
              >
                {opts.kondisi.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          )}

          {/* KECAMATAN */}
          <div className={styles.control}>
            <label className={styles.label}>Kecamatan</label>
            <select
              className={styles.select}
              value={v.kecamatan}
              onChange={(e) => update({ kecamatan: e.target.value, desa: "(Semua Desa)" })}
            >
              {opts.kecamatan.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>

          {/* DESA */}
          {showDesa && (
            <div className={styles.control}>
              <label className={styles.label}>Desa</label>
              <select
                className={styles.select}
                value={v.desa}
                disabled={v.kecamatan === "(Semua Kecamatan)"} // Disable kalau belum pilih kecamatan
                onChange={(e) => update({ desa: e.target.value })}
              >
                {opts.desa.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          )}

          <div className={styles.actions}>
            {extraActions}
          </div>
        </div>
      </div>
    </div>
  );
}