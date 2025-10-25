// src/components/common/SuspenseLoader/SuspenseLoader.jsx
import React from "react";

export default function SuspenseLoader() {
  return (
    <div style={{
      minHeight: "40vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      fontSize: 14
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        border: "3px solid #e5e7eb", borderTopColor: "#6366f1",
        animation: "spin 1s linear infinite"
      }}/>
      <span>Memuat…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
