// src/pages/Facilities/_ChartsSection.jsx
import React, { useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList,
  PieChart, Pie, Cell, Legend
} from "recharts";

export default function ChartsSection({ paud = [], sd = [], smp = [], pkbm = [] }) {
  // contoh data ringkas agregat (sesuaikan dengan struktur aslimu bila diperlukan)
  const barData = useMemo(() => ([
    { name: "PAUD", value: paud.length },
    { name: "SD",   value: sd.length },
    { name: "SMP",  value: smp.length },
    { name: "PKBM", value: pkbm.length },
  ]), [paud, sd, smp, pkbm]);

  const pieData = barData;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value">
              <LabelList dataKey="value" position="top" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90}>
              {pieData.map((_, i) => <Cell key={i} />)}
            </Pie>
            <Legend />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
