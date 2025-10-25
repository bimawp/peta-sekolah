// src/pages/Facilities/ChartsSection.jsx
import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip, Legend, LabelList
} from "recharts";
import styles from "./FacilitiesPage.module.css";

export default function ChartsSection({
  kondisiPieData,
  rehabilitasiPieData,
  pembangunanPieData,
  kondisiToiletData,
  intervensiToiletData,
  customPieTooltip,
  customBarTooltip,
  renderLabelInside,
}) {
  return (
    <section className={styles.chartsSection}>
      <div className={styles.pieChartsGrid}>
        <div className={`${styles.card} ${styles.chartCard}`}>
          <header className={styles.chartHeader}><h3>Kondisi Unit Toilet</h3></header>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={kondisiPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="50%"
                  outerRadius={90}
                  labelLine={false}
                  label={renderLabelInside}
                >
                  {kondisiPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={customPieTooltip} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`${styles.card} ${styles.chartCard}`}>
          <header className={styles.chartHeader}><h3>Status Rehabilitasi</h3></header>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={rehabilitasiPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="50%"
                  outerRadius={90}
                  labelLine={false}
                  label={renderLabelInside}
                >
                  {rehabilitasiPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={customPieTooltip} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`${styles.card} ${styles.chartCard}`}>
          <header className={styles.chartHeader}><h3>Status Pembangunan</h3></header>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pembangunanPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="50%"
                  outerRadius={90}
                  labelLine={false}
                  label={renderLabelInside}
                >
                  {pembangunanPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={customPieTooltip} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className={styles.barChartsGrid}>
        <div className={`${styles.card} ${styles.chartCard}`}>
          <header className={styles.chartHeader}><h3>Kondisi Unit Toilet</h3></header>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={kondisiToiletData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 12 }} height={80} />
                <YAxis allowDecimals={false} />
                <Tooltip content={customBarTooltip} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="value" position="top" fontSize={12} />
                  {kondisiToiletData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`${styles.card} ${styles.chartCard}`}>
          <header className={styles.chartHeader}><h3>Kategori Intervensi</h3></header>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={intervensiToiletData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 12 }} height={80} />
                <YAxis allowDecimals={false} />
                <Tooltip content={customBarTooltip} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="value" position="top" fontSize={12} />
                  {intervensiToiletData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
