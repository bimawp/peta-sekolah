// src/pages/Facilities/ChartsSection.jsx
import React, { useMemo, memo } from "react";
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
  LabelList,
} from "recharts";
import styles from "./FacilitiesPage.module.css";

/* ========= Helpers ========= */
const fmt = (n) => Number(n || 0).toLocaleString("id-ID");
const RAD = Math.PI / 180;

/** Color helper untuk menentukan warna teks yang kontras dengan warna irisan */
const parseColorToRgb = (color) => {
  if (!color || typeof color !== "string") return null;
  const c = color.trim();

  // #RGB atau #RRGGBB
  if (c[0] === "#") {
    const hex = c.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      if ([r, g, b].some((v) => Number.isNaN(v))) return null;
      return { r, g, b };
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if ([r, g, b].some((v) => Number.isNaN(v))) return null;
      return { r, g, b };
    }
    return null;
  }

  // rgb() / rgba()
  const m = c.match(
    /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/i
  );
  if (m) {
    const r = Number(m[1]);
    const g = Number(m[2]);
    const b = Number(m[3]);
    if ([r, g, b].some((v) => Number.isNaN(v))) return null;
    return { r, g, b };
  }

  return null;
};

const relativeLuminance = ({ r, g, b }) => {
  const toLin = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const R = toLin(r);
  const G = toLin(g);
  const B = toLin(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
};

const getPieLabelColors = (sliceFill) => {
  const rgb = parseColorToRgb(sliceFill);
  if (!rgb) return { fill: "#FFFFFF", stroke: "rgba(0,0,0,.45)" };
  const lum = relativeLuminance(rgb);
  if (lum > 0.52) return { fill: "#111827", stroke: "rgba(255,255,255,.90)" };
  return { fill: "#FFFFFF", stroke: "rgba(0,0,0,.45)" };
};

/**
 * ✅ Label PIE: selalu 2 baris (persen + jumlah)
 * ✅ Font irisan kecil DISAMAKAN dengan lainnya (min 12, tebal)
 * ✅ Irisan tipis diposisikan lebih dekat outerRadius supaya muat
 */
const SliceValueLabel = (props) => {
  const {
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    value,
    total,
    fill,
    payload,
  } = props || {};

  const v = Number(payload?.actualCount ?? payload?.value ?? value ?? 0);
  const t = Number(total || 0);
  if (!t || !v) return null;

  const pct = (v / t) * 100;

  // Sudut irisan
  const angleDeg = Math.abs((endAngle ?? 0) - (startAngle ?? 0));

  // Radius label: makin tipis, makin dekat outerRadius (lebih lega)
  const ir = Number(innerRadius || 0);
  const or = Number(outerRadius || 0);
  const radiusFactor =
    angleDeg < 10 ? 0.985 : angleDeg < 16 ? 0.93 : angleDeg < 24 ? 0.80 : 0.62;

  const r = ir + (or - ir) * radiusFactor;

  const x = Number(cx || 0) + r * Math.cos(-Number(midAngle || 0) * RAD);
  const y = Number(cy || 0) + r * Math.sin(-Number(midAngle || 0) * RAD);

  const sliceColor = fill || payload?.color || payload?.fill;
  const colors = getPieLabelColors(sliceColor);

  const pctText = pct < 0.1 ? "<0.1%" : `${pct.toFixed(1)}%`;
  const valueText = fmt(v);

  // ✅ font disamakan (min 12) untuk semua irisan
  const fontSize = 12;
  const gap = fontSize + 2;

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      className={styles.pieValueLabel}
      style={{
        fill: colors.fill,
        stroke: colors.stroke,
        fontSize,
        fontWeight: 800,
        strokeWidth: 3,
        paintOrder: "stroke",
        pointerEvents: "none",
      }}
    >
      <tspan x={x} dy={-2}>
        {pctText}
      </tspan>
      <tspan x={x} dy={gap}>
        {valueText}
      </tspan>
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
      {(data || []).map((d, idx) => {
        const v = Number(d?.value || 0);
        const pct = total ? (v / total) * 100 : 0;
        return (
          <div key={`${d?.name || "item"}-${idx}`} className={styles.legendItem}>
            <span
              className={styles.legendDot}
              style={{ background: d?.color || "#8884d8" }}
            />
            <div className={styles.legendText}>
              <div className={styles.legendName}>{d?.name ?? "-"}</div>
              <div className={styles.legendValue}>
                {fmt(v)}{" "}
                <span className={styles.legendPct}>({pct.toFixed(1)}%)</span>
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
const PieSplitCard = memo(function PieSplitCard({
  title,
  data,
  // renderLabelInside, // sengaja tidak dipakai supaya irisan kecil tidak jadi kecil lagi
  customPieTooltip,
}) {
  const safe = useMemo(
    () =>
      (data || []).map((d) => ({
        ...d,
        value: Number(d?.value || 0),
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
      <header className={styles.chartHeader}>
        <h3>{title}</h3>
      </header>

      <div className={`${styles.chartWrapper} ${styles.chartSplit}`}>
        {!hasData ? (
          <div className={styles.chartEmpty}>
            <img
              className={styles.chartEmptyIcon}
              alt=""
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Ccircle cx='24' cy='24' r='20' fill='%23E2E8F0'/%3E%3C/svg%3E"
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
                    // ✅ sedikit diperbesar untuk membantu irisan kecil muat label
                    outerRadius={150}
                    labelLine={false}
                    // ✅ PAKSA pakai label lokal agar irisan kecil ikut besar
                    label={(p) => <SliceValueLabel {...p} total={total} />}
                    animationDuration={900}
                    animationBegin={0}
                  >
                    {safe.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color || "#8884d8"} />
                    ))}
                  </Pie>

                  <Tooltip content={customPieTooltip ? customPieTooltip : <PieTooltip />} />
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

/** Kartu Bar */
const BarCard = memo(function BarCard({ title, data }) {
  const safe = useMemo(
    () => (data || []).map((d) => ({ ...d, value: Number(d?.value || 0) })),
    [data]
  );
  const hasAny = safe.some((d) => d.value > 0);

  return (
    <div className={`${styles.card} ${styles.chartCard}`}>
      <header className={styles.chartHeader}>
        <h3>{title}</h3>
      </header>

      <div className={styles.chartWrapper}>
        {!hasAny ? (
          <div className={styles.chartEmpty}>
            <img
              className={styles.chartEmptyIcon}
              alt=""
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Ccircle cx='24' cy='24' r='20' fill='%23E2E8F0'/%3E%3C/svg%3E"
            />
            <p>Tidak ada data</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={safe} margin={{ top: 22, right: 12, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" interval={0} tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
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
  renderLabelInside, // tetap diterima agar tidak merusak pemanggilan, tapi tidak dipakai
  customPieTooltip,
}) {
  return (
    <section className={styles.chartsSection}>
      <div className={styles.pieChartsGrid}>
        <PieSplitCard
          title="Kondisi Unit Toilet"
          data={kondisiPieData}
          renderLabelInside={renderLabelInside}
          customPieTooltip={customPieTooltip}
        />
        <PieSplitCard
          title="Status Rehabilitasi"
          data={rehabilitasiPieData}
          renderLabelInside={renderLabelInside}
          customPieTooltip={customPieTooltip}
        />
        <PieSplitCard
          title="Status Pembangunan"
          data={pembangunanPieData}
          renderLabelInside={renderLabelInside}
          customPieTooltip={customPieTooltip}
        />
      </div>

      <div className={styles.barChartsGrid}>
        <BarCard title="Kondisi Unit Toilet (Batang)" data={kondisiToiletData} />
        <BarCard title="Kategori Intervensi" data={intervensiToiletData} />
      </div>
    </section>
  );
}
