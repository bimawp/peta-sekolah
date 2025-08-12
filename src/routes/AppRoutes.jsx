import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from '../pages/Dashboard/Dashboard';
import Budget from '../pages/Budget/BudgetPage';
import NotFound from '../pages/NotFound/NotFound';
import Map from '../pages/Map/Map';  // import Map

const AppRoutes = () => {
  return (
    <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/detail-sekolah" element={<Map />} />
        <Route path="/anggaran" element={<Budget />} />
        
    </Routes>
  );
};

export default AppRoutes;
