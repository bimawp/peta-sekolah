// src/components/common/SuspenseLoader/SuspenseLoader.jsx - FILE BARU

import React from 'react';
import './SuspenseLoader.css';

const SuspenseLoader = () => {
  return (
    <div className="suspense-loader">
      <div className="spinner"></div>
      <p>Memuat Halaman...</p>
    </div>
  );
};

export default SuspenseLoader;