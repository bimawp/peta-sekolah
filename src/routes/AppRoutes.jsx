import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from '../pages/Dashboard/Dashboard';
import NotFound from '../pages/NotFound/NotFound';
import Map from '../pages/Map/Map';  // import Map

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/map" element={<Map />} />   {/* Route baru untuk Map */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
