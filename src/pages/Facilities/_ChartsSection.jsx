// src/pages/Facilities/ChartsSection.jsx
import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const safeNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const computeDisplayTotal = (arr = []) => {
  // Jika ada "Tidak Ada Data" (value=1, actualCount=0), total yang benar adalah 0
  const hasNoData = (arr || []).some((d) => String(d?.name || "").toLowerCase().includes("tidak ada data"));
  if (hasNoData) return 0;

  // Prefer actualCount bila ada (Pie data Anda memakai actualCount)
  const hasActual = (arr || []).some((d) => d?.actualCount !== undefined && d?.actualCount !== null);
  if (hasActual) return (arr || []).reduce((a, d) => a + safeNum(d?.actualCount), 0);

  return (arr || []).reduce((a, d) => a + safeNum(d?.value), 0);
};

const formatInt = (n) => {
  const x = safeNum(n);
  return x.toLocaleString("id-ID");
};

export default function ChartsSection({
  kondisiPieData = [],
  rehabilitasiPieData = [],
  pembangunanPieData = [],
  kondisiToiletData = [],
  intervensiToiletData = [],
  customPieTooltip,
  customBarTooltip,
  renderLabelInside,
}) {
  const totalKondisi = useMemo(() => computeDisplayTotal(kondisiPieData), [kondisiPieData]);
  const totalRehab = useMemo(() => computeDisplayTotal(rehabilitasiPieData), [rehabilitasiPieData]);
  const totalBangun = useMemo(() => computeDisplayTotal(pembangunanPieData), [pembangunanPieData]);

  const totalBarKondisi = useMemo(() => {
    // Bar Kondisi Toilet: item "Total" sudah disediakan oleh FacilitiesPage
    const totalItem = (kondisiToiletData || []).find((d) => String(d?.name || "").toLowerCase() === "total");
    return totalItem ? safeNum(totalItem.value) : (kondisiToiletData || []).reduce((a, d) => a + safeNum(d?.value), 0);
  }, [kondisiToiletData]);

  const totalBarIntervensi = useMemo(() => {
    const totalItem = (intervensiToiletData || []).find((d) => String(d?.name || "").toLowerCase().includes("total"));
    return totalItem ? safeNum(totalItem.value) : (intervensiToiletData || []).reduce((a, d) => a + safeNum(d?.value), 0);
  }, [intervensiToiletData]);

  const PieSummary = ({ data, totalLabel }) => {
    const hasNoData = (data || []).some((d) => String(d?.name || "").toLowerCase().includes("tidak ada data"));
    if (hasNoData) {
      return (
        <div style={{ paddingTop: 10, fontSize: 13, opacity: 0.85 }}>
          Tidak ada data
        </div>
      );
    }

    const total = computeDisplayTotal(data);

    return (
      <div style={{ paddingTop: 10, fontSize: 13 }}>
        {(data || []).map((d, idx) => (
          <div
            key={`${d?.name || "item"}-${idx}`}
            style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "3px 0" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: d?.color || "#999",
                  display: "inline-block",
                }}
              />
              <span>{d?.name}</span>
            </div>

            <div style={{ fontWeight: 600 }}>
              {formatInt(d?.actualCount ?? d?.value)}
              {d?.percent != null ? ` (${Number(d.percent).toFixed(1)}%)` : ""}
            </div>
          </div>
        ))}

        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: "1px solid rgba(0,0,0,0.08)",
            display: "flex",
            justifyContent: "space-between",
            fontWeight: 700,
          }}
        >
          <span>Total</span>
          <span>
            {formatInt(total)}
            {totalLabel ? ` ${totalLabel}` : ""}
          </span>
        </div>
      </div>
    );
  };

  const BarCard = ({ title, subtitle, data }) => {
    const hasAny = (data || []).some((d) => safeNum(d?.value) > 0);
    return (
      <div style={{ width: "100%", height: 340 }}>
        <div style={{ padding: "10px 0 0" }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
          {subtitle ? <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{subtitle}</div> : null}
        </div>

        <div style={{ width: "100%", height: 300, marginTop: 6 }}>
          <ResponsiveContainer>
            <BarChart data={data || []} margin={{ top: 18, right: 10, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" interval={0} angle={0} tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip content={customBarTooltip ? customBarTooltip : undefined} />
              <Bar dataKey="value" isAnimationActive={false}>
                {(data || []).map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={entry?.color || undefined} />
                ))}
                <LabelList dataKey="value" position="top" formatter={(v) => formatInt(v)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {!hasAny ? (
          <div style={{ marginTop: -8, fontSize: 13, opacity: 0.8 }}>Tidak ada data</div>
        ) : null}
      </div>
    );
  };

  const PieCard = ({ title, data, totalLabel }) => {
    const hasNoData = (data || []).some((d) => String(d?.name || "").toLowerCase().includes("tidak ada data"));
    return (
      <div style={{ width: "100%" }}>
        <div style={{ fontSize: 14, fontWeight: 700, padding: "10px 0 0" }}>{title}</div>

        <div style={{ width: "100%", height: 260, marginTop: 6 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data || []}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={renderLabelInside ? (p) => renderLabelInside(p) : undefined}
                labelLine={false}
                isAnimationActive={false}
              >
                {(data || []).map((d, idx) => (
                  <Cell key={`cell-${idx}`} fill={d?.color || undefined} />
                ))}
              </Pie>
              <Legend />
              <Tooltip content={customPieTooltip ? customPieTooltip : undefined} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {hasNoData ? <PieSummary data={data} totalLabel={totalLabel} /> : <PieSummary data={data} totalLabel={totalLabel} />}
      </div>
    );
  };

  return (
    <section style={{ width: "100%" }}>
      {/* 3 Pie */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        <PieCard title="Kondisi Unit Toilet" data={kondisiPieData} totalLabel="unit" />
        <PieCard title="Status Rehabilitasi" data={rehabilitasiPieData} totalLabel="unit" />
        <PieCard title="Status Pembangunan" data={pembangunanPieData} totalLabel="sekolah" />
      </div>

      {/* 2 Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
          marginTop: 16,
        }}
      >
        <BarCard
          title="Kondisi Unit Toilet (Batang)"
          subtitle={totalBarKondisi ? `Total ${formatInt(totalBarKondisi)} unit` : ""}
          data={kondisiToiletData}
        />
        <BarCard
          title="Kategori Intervensi"
          subtitle={totalBarIntervensi ? `Total ${formatInt(totalBarIntervensi)} kegiatan` : ""}
          data={intervensiToiletData}
        />
      </div>
    </section>
  );
}
