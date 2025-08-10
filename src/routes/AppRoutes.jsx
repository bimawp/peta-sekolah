import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from '../pages/Dashboard/Dashboard';
import NotFound from '../pages/NotFound/NotFound';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      {/* Tambahkan route lain sesuai kebutuhan */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
