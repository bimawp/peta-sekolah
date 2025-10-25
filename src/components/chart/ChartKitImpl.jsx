// src/components/charts/ChartKitImpl.jsx
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";

// File ini meng-ekspos kembali komponen Recharts.
// Tujuan: bisa diimport via path internal (bukan 'recharts' langsung) sehingga
// modul berat tidak ikut initial bundle.

export {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LabelList,
};

// Komponen dummy opsional agar impor default tidak error jika ada yang pakai:
export default function ChartKitImpl() {
  return <div />;
}
