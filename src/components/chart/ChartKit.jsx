// src/components/charts/ChartKit.jsx
import React, { lazy, Suspense } from "react";

// Import modul besar secara lazy agar tidak ikut initial bundle
const Recharts = lazy(() => import("./ChartKitImpl"));

export default function ChartKit(props) {
  return (
    <Suspense fallback={<div style={{height:180}} aria-busy="true" />}>
      <Recharts {...props} />
    </Suspense>
  );
}
