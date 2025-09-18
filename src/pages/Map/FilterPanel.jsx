// src/pages/Map/FilterPanel.jsx - KODE LENGKAP PERBAIKAN

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setJenjang,
  setKecamatan,
  setStatus,
  setSearchTerm,
  resetFilters,
} from '../../store/slices/filterSlice'; // <-- Import actions dari Redux
// Hapus import useContext dan FilterContext

const FilterPanel = () => {
  const dispatch = useDispatch();
  
  // Baca state filter langsung dari Redux store
  const { jenjang, kecamatan, status, searchTerm } = useSelector(
    (state) => state.filters
  );

  const handleJenjangChange = (e) => {
    dispatch(setJenjang(e.target.value));
  };

  const handleKecamatanChange = (e) => {
    dispatch(setKecamatan(e.target.value));
  };
  
  const handleStatusChange = (e) => {
    dispatch(setStatus(e.target.value));
  };

  const handleSearchChange = (e) => {
    dispatch(setSearchTerm(e.target.value));
  };

  const handleReset = () => {
    dispatch(resetFilters());
  };

  return (
    <div className="filter-panel">
      {/* Search Input */}
      <input
        type="text"
        placeholder="Cari sekolah..."
        value={searchTerm}
        onChange={handleSearchChange}
      />

      {/* Filter Jenjang */}
      <select value={jenjang} onChange={handleJenjangChange}>
        <option value="semua">Semua Jenjang</option>
        <option value="PAUD">PAUD</option>
        <option value="SD">SD</option>
        <option value="SMP">SMP</option>
        <option value="PKBM">PKBM</option>
      </select>

      {/* Filter Kecamatan (contoh) */}
      <select value={kecamatan} onChange={handleKecamatanChange}>
        <option value="semua">Semua Kecamatan</option>
        {/* Opsi kecamatan bisa di-load dinamis */}
      </select>
      
      {/* Filter Status */}
      <select value={status} onChange={handleStatusChange}>
        <option value="semua">Semua Status</option>
        <option value="negeri">Negeri</option>
        <option value="swasta">Swasta</option>
      </select>

      <button onClick={handleReset}>Reset Filter</button>
    </div>
  );
};

export default FilterPanel;