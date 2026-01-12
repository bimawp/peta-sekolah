// src/pages/Facilities/ChartSkeleton.jsx
import React, { useEffect } from "react";

export default function ChartSkeleton({ height = 280 }) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const id = "chart-skeleton-shimmer";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.innerHTML = `
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}`;
    document.head.appendChild(style);
  }, []);

  return (
    <div
      style={{
        height,
        borderRadius: 12,
        background:
          "linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 37%, #F1F5F9 63%)",
        backgroundSize: "400% 100%",
        animation: "shimmer 1.2s infinite",
      }}
      aria-busy="true"
      aria-label="Memuat grafik..."
    />
  );
}
