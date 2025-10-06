// src/App.jsx

import React from 'react';
import { HydratedDataProvider } from "./contexts/HydratedDataProvider";
import AppRoutes from './routes/AppRoutes';
import './App.css';

export default function App() {
  return (
    <HydratedDataProvider>
      <AppRoutes />
    </HydratedDataProvider>
  );
}