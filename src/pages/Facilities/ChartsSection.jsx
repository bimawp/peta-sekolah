// src/pages/Facilities/ChartsSection.jsx
import React, { useMemo, memo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip, LabelList
} from "recharts";
import styles from "./FacilitiesPage.module.css";

/* ========= Helpers ========= */
const fmt = (n) => Number(n || 0).toLocaleString("id-ID");
const RAD = Math.PI / 180;

/** Label irisan pie: "1.234 (12,3%)" – persen dihitung dari value/total (bukan props.percent) */
const SliceValueLabel = (props) => {
  const { cx, cy, midAngle, outerRadius, value, total } = props;
  if (!total || !value) return null;

  const pct = (Number(value) / Number(total)) * 100;
  const r = (outerRadius || 0) + 18;
  const x = cx + r * Math.cos(-midAngle * RAD);
  const y = cy + r * Math.sin(-midAngle * RAD);

  return (
    <text
      x={x}
      y={y}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      className={styles.pieValueLabel}
    >
      {`${fmt(value)} (${pct.toFixed(1)}%)`}
    </text>
  );
};

/** Label angka di atas batang bar chart */
const BarValueLabel = (props) => {
  const { x, y, width, value } = props;
  const tx = (x || 0) + (width || 0) / 2;
  const ty = (y || 0) - 8;
  return (
    <text x={tx} y={ty} textAnchor="middle" className={styles.barValueLabel}>
      {fmt(value)}
    </text>
  );
};

/** Legend custom di kanan pie */
const RightLegend = memo(function RightLegend({ data }) {
  const total = useMemo(
    () => (data || []).reduce((s, d) => s + Number(d?.value || 0), 0),
    [data]
  );
  if (!data?.length) return null;

  return (
    <div className={styles.legendRight}>
      {(data || []).map((d, i) => {
        const v = Number(d?.value || 0);
        const pct = total ? (v / total) * 100 : 0;
        return (
          <div key={i} className={styles.legendItem}>
            <span
              className={styles.legendDot}
              style={{ backgroundColor: d?.color || "#999" }}
            />
            <div className={styles.legendText}>
              <div className={styles.legendName}>{d?.name || "-"}</div>
              <div className={styles.legendValue}>
                {fmt(v)} <span className={styles.legendPct}>({pct.toFixed(1)}%)</span>
              </div>
            </div>
          </div>
        );
      })}
      <div className={styles.legendTotal}>
        <span>Total</span>
        <strong>{fmt(total)}</strong>
      </div>
    </div>
  );
});

/** Tooltip PIE yang aman: hitung persen dari value/total */
function makePieTooltip(data) {
  const total = (data || []).reduce((s, d) => s + Number(d?.value || 0), 0);
  return function RecalcPieTooltip({ active, payload }) {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0]?.payload || {};
    const v = Number(item?.value || 0);
    const pct = total ? (v / total) * 100 : 0;
    return (
      <div className={styles.customTooltip}>
        <div className={styles.tooltipContent}>
          <span className={styles.tooltipLabel}>{item?.name ?? "-"}</span>
          <span className={styles.tooltipValue}>
            {fmt(v)} unit ({pct.toFixed(1)}%)
          </span>
        </div>
      </div>
    );
  };
}

/** Kartu Pie (split: pie kiri, legend kanan) */
const PieSplitCard = memo(function PieSplitCard({ title, data }) {
  // Paksa value numerik dan buang field percent dari hulu agar tidak bentrok
  const safe = useMemo(
    () =>
      (data || []).map((d) => ({
        ...d,
        value: Number(d?.value || 0),
        percent: undefined,
      })),
    [data]
  );
  const total = useMemo(
    () => safe.reduce((s, d) => s + Number(d.value || 0), 0),
    [safe]
  );
  const hasData = total > 0;
  const PieTooltip = useMemo(() => makePieTooltip(safe), [safe]);

  return (
    <div className={`${styles.card} ${styles.chartCard}`}>
      <header className={styles.chartHeader}><h3>{title}</h3></header>
      <div className={`${styles.chartWrapper} ${styles.chartSplit}`}>
        {!hasData ? (
          <div className={styles.chartEmpty}>
            <img
              className={styles.chartEmptyIcon}
              alt=""
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Ccircle cx='24' cy='24' r='20' fill='%23E2E8F0'/%3E%3C/svg%3E"
            />
            <p>Tidak ada data</p>
          </div>
        ) : (
          <>
            <div className={styles.splitLeft}>
              <ResponsiveContainer width="100%" height={360}>
                <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <Pie
                    data={safe}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    labelLine={false}
                    // Kirim total ke label agar bisa hitung persen sendiri
                    label={(p) => <SliceValueLabel {...p} total={total} />}
                    animationDuration={900}
                    animationBegin={0}
                  >
                    {safe.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color || "#8884d8"} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.splitRight}>
              <RightLegend data={safe} />
            </div>
          </>
        )}
      </div>
    </div>
  );
});

/** Tooltip BAR (tidak ada persen) */
const BarTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className={styles.customTooltip}>
      <div className={styles.tooltipContent}>
        <span className={styles.tooltipLabel}>{label}</span>
        <span className={styles.tooltipValue}>{fmt(payload[0].value)} unit</span>
      </div>
    </div>
  );
};

/** Kartu Bar */
const BarCard = memo(function BarCard({ title, data }) {
  const safe = useMemo(
    () => (data || []).map((d) => ({ ...d, value: Number(d?.value || 0) })),
    [data]
  );
  const hasAny = safe.some((d) => d.value > 0);

  return (
    <div className={`${styles.card} ${styles.chartCard}`}>
      <header className={styles.chartHeader}><h3>{title}</h3></header>
      <div className={styles.chartWrapper}>
        {!hasAny ? (
          <div className={styles.chartEmpty}>
            <img
              className={styles.chartEmptyIcon}
              alt=""
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Crect width='48' height='48' fill='%23E2E8F0'/%3E%3C/svg%3E"
            />
            <p>Tidak ada data</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <BarChart
              data={safe}
              margin={{ top: 28, right: 24, left: 12, bottom: 64 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                angle={-20}
                textAnchor="end"
                interval={0}
                height={64}
                tick={{ fontSize: 12, fill: "#64748b" }}
              />
              <YAxis
                allowDecimals={false}
                tickFormatter={fmt}
                tick={{ fontSize: 12, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<BarTooltip />} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={900}>
                {safe.map((entry, i) => (
                  <Cell key={i} fill={entry.color || "#3b82f6"} />
                ))}
                <LabelList dataKey="value" content={<BarValueLabel />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
});

export default function ChartsSection({
  kondisiPieData,
  rehabilitasiPieData,
  pembangunanPieData,
  kondisiToiletData,
  intervensiToiletData,
}) {
  return (
    <section className={styles.chartsSection}>
      {/* PIE: per-section (besar), legend di kanan */}
      <div className={styles.pieChartsGrid}>
        <PieSplitCard title="Kondisi Unit Toilet" data={kondisiPieData} />
        <PieSplitCard title="Status Rehabilitasi" data={rehabilitasiPieData} />
        <PieSplitCard title="Status Pembangunan" data={pembangunanPieData} />
      </div>

      {/* BAR: label angka di atas batang */}
      <div className={styles.barChartsGrid}>
        <BarCard title="Kondisi Unit Toilet (Batang)" data={kondisiToiletData} />
        <BarCard title="Kategori Intervensi" data={intervensiToiletData} />
      </div>
    </section>
  );
}
