// src/components/table/VirtualTable.jsx
import React, { useMemo, useRef, useCallback } from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List } from "react-window";

/**
 * VirtualTable
 * ----------------------------------------------------
 * Props:
 * - rows: Array<any>
 * - columns: Array<{
 *     key: string
 *     title: string
 *     width?: string | number // "120px" | "1fr" | "2fr" | number(px)
 *     render?: (value, row) => ReactNode
 *   }>
 * - rowHeight?: number (default 44)
 * - includeDetailButton?: boolean
 * - onDetailHover?: (row) => void
 * - onDetailClick?: (row) => void
 *
 * Catatan:
 * - Sorting/pagination ditangani di parent (supaya komponen ini tetap kecil & cepat).
 * - Width mendukung kombinasi px & fr; fr akan mengisi sisa ruang container.
 */

const HEADER_H = 56;
const GAP_X = 0; // pakai 0 biar align seperti <table>

function parseWidth(w) {
  if (w == null) return { type: "fr", value: 1 };
  if (typeof w === "number") return { type: "px", value: w };
  const s = String(w).trim();
  if (s.endsWith("px")) return { type: "px", value: parseFloat(s) || 0 };
  if (s.endsWith("fr")) return { type: "fr", value: parseFloat(s) || 1 };
  const n = Number(s);
  if (!Number.isNaN(n)) return { type: "px", value: n };
  return { type: "fr", value: 1 };
}

function useComputedWidths(columns, containerW, withDetail) {
  return useMemo(() => {
    const meta = columns.map((c) => parseWidth(c.width));
    const fixedSum =
      meta.reduce((acc, m) => acc + (m.type === "px" ? m.value : 0), 0) +
      (withDetail ? 128 : 0);
    const frSum = meta.reduce((acc, m) => acc + (m.type === "fr" ? m.value : 0), 0);
    const remain = Math.max(0, containerW - fixedSum - GAP_X * (columns.length - 1));
    const frUnit = frSum > 0 ? remain / frSum : 0;

    const widths = meta.map((m) => (m.type === "px" ? m.value : Math.max(80, Math.floor(m.value * frUnit))));
    return withDetail ? [...widths, 128] : widths;
  }, [columns, containerW, withDetail]);
}

const HeaderCell = React.memo(function HeaderCell({ w, title }) {
  return (
    <div
      style={{
        width: w,
        minWidth: w,
        maxWidth: w,
        padding: "12px 14px",
        fontSize: 13,
        fontWeight: 800,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "#fff",
        background: "linear-gradient(135deg,#145C3C,#1E7F4F)",
        borderBottom: "3px solid #F2B705",
        position: "relative",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
      title={title}
    >
      {title}
    </div>
  );
});

const Cell = React.memo(function Cell({ w, children }) {
  return (
    <div
      style={{
        width: w,
        minWidth: w,
        maxWidth: w,
        padding: "12px 14px",
        fontSize: 15,
        color: "var(--text-primary, #0F172A)",
        borderBottom: "1px solid var(--border-light, #E2E8F0)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        background: "var(--bg-card, #fff)",
      }}
    >
      {children}
    </div>
  );
});

const DetailButton = React.memo(function DetailButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        background: "linear-gradient(135deg, var(--primary-color,#1E7F4F), var(--primary-light,#56B789))",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        fontWeight: 700,
        fontSize: 14,
        cursor: "pointer",
        boxShadow: "0 1px 2px rgba(0,0,0,.08)",
      }}
    >
      <span style={{ fontSize: 16 }}>👁️</span> Detail
    </button>
  );
});

export default function VirtualTable({
  rows = [],
  columns = [],
  rowHeight = 44,
  includeDetailButton = false,
  onDetailHover,
  onDetailClick,
}) {
  const listRef = useRef(null);

  const RowRenderer = useCallback(
    ({ index, style, data }) => {
      const row = data.rows[index];
      const widths = data.widths;

      return (
        <div
          style={{
            ...style,
            display: "flex",
            gap: GAP_X,
            alignItems: "stretch",
            background: index % 2 === 0 ? "var(--bg-card, #fff)" : "var(--bg-hover, #F8FAFC)",
            transition: "transform .15s ease-out, box-shadow .15s ease-out, background .15s ease-out",
          }}
          onMouseEnter={() => onDetailHover && onDetailHover(row)}
        >
          {data.columns.map((col, i) => {
            const v = row[col.key];
            return (
              <Cell key={`${index}-${col.key}`} w={widths[i]}>
                {col.render ? col.render(v, row) : (v ?? "-")}
              </Cell>
            );
          })}
          {includeDetailButton && (
            <Cell w={widths[widths.length - 1]}>
              <DetailButton onClick={() => onDetailClick && onDetailClick(row)} />
            </Cell>
          )}
        </div>
      );
    },
    [includeDetailButton, onDetailClick, onDetailHover]
  );

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        border: "1px solid var(--border-light, #E2E8F0)",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "var(--shadow-md, 0 4px 6px rgba(0,0,0,.06))",
      }}
    >
      <AutoSizer disableHeight>
        {({ width }) => {
          const widths = useComputedWidths(columns, width, includeDetailButton);
          const header = (
            <div
              style={{
                display: "flex",
                gap: GAP_X,
                position: "sticky",
                top: 0,
                zIndex: 2,
                height: HEADER_H,
                boxShadow: "0 2px 8px rgba(0,0,0,.08)",
              }}
            >
              {columns.map((c, i) => (
                <HeaderCell key={c.key} w={widths[i]} title={c.title} />
              ))}
              {includeDetailButton && <HeaderCell w={widths[widths.length - 1]} title="Detail" />}
            </div>
          );

          const bodyH = `calc(100% - ${HEADER_H}px)`;

          return (
            <>
              {header}
              <div style={{ height: bodyH }}>
                <List
                  ref={listRef}
                  height={typeof window !== "undefined" ? document.querySelector(":root") ? undefined : undefined : undefined}
                  itemCount={rows.length}
                  itemSize={rowHeight}
                  width={width}
                  style={{ willChange: "transform" }}
                  itemData={{ rows, columns, widths }}
                >
                  {RowRenderer}
                </List>
              </div>
            </>
          );
        }}
      </AutoSizer>
    </div>
  );
}
