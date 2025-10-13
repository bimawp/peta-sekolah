// src/pages/NotFound.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const nav = useNavigate();
  return (
    <div style={{ padding: 24 }}>
      <h1>404 — Page Not Found</h1>
      <p>Halaman yang kamu tuju tidak ditemukan.</p>
      <button onClick={() => nav(-1)} style={{ marginTop: 12 }}>
        ⬅️ Kembali
      </button>
    </div>
  );
}
