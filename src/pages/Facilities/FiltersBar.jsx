// src/pages/Facilities/FiltersBar.jsx
import React from "react";
import styles from "./FacilitiesPage.module.css";

export default function FiltersBar({
  selectedJenjang, setSelectedJenjang,
  selectedKecamatan, setSelectedKecamatan,
  selectedDesa, setSelectedDesa,
  kecamatanOptions = [], desaOptions = [],
  totalFound = 0,
  onReset,
}) {
  return (
    <section className={`${styles.card} ${styles.filtersCard}`}>
      <div className={styles.cardHeader}><h2>Filter</h2></div>
      <div className={styles.filtersContent}>
        <div className={styles.filtersRow}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Filter Jenjang:</label>
            <select
              className={styles.filterSelect}
              value={selectedJenjang}
              onChange={(e) => setSelectedJenjang(e.target.value)}
            >
              <option>Semua Jenjang</option>
              <option>PAUD</option>
              <option>SD</option>
              <option>SMP</option>
              <option>PKBM</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Filter Kecamatan:</label>
            <select
              className={styles.filterSelect}
              value={selectedKecamatan}
              onChange={(e) => setSelectedKecamatan(e.target.value)}
            >
              <option>Semua Kecamatan</option>
              {kecamatanOptions.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Filter Desa:</label>
            <select
              className={styles.filterSelect}
              value={selectedDesa}
              onChange={(e) => setSelectedDesa(e.target.value)}
            >
              <option>Semua Desa</option>
              {desaOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.filterActions}>
          <button className={styles.resetFiltersButton} onClick={onReset}>
            Reset Semua Filter
          </button>
          <div className={styles.searchResultsInfo}>
            <span className={styles.resultsText}>
              {totalFound} sekolah sesuai filter
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
