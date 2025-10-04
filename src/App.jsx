// src/App.jsx

import React from 'react';
import AppRoutes from './routes/AppRoutes'; // Langsung gunakan AppRoutes
import './App.css';

function App() {
  // Tidak perlu ada provider apa pun di sini lagi.
  // Langsung render komponen yang berisi semua rute aplikasi Anda.
  return <AppRoutes />;
}

export default App;