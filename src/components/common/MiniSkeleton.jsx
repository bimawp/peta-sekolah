import React from "react";

export default function MiniSkeleton({ height = 140, radius = 12 }) {
  return (
    <div
      style={{
        height,
        borderRadius: radius,
        background:
          "linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 37%, #f3f4f6 63%)",
        backgroundSize: "400% 100%",
        animation: "shimmer 1.2s ease-in-out infinite",
      }}
    />
  );
}

/* CSS global (tambahkan sekali saja di global.css):
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
*/
