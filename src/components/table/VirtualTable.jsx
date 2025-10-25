// src/components/table/VirtualTable.jsx
import React, { useMemo, useCallback, useRef, useEffect } from "react";

/**
 * Tabel tervirtualisasi (tanpa lib eksternal)
 * - Render hanya baris yang terlihat (viewport)
 * - Kolom "non-fixed" sekarang punya minWidth sehingga tidak "dempet"
 * - Otomatis memunculkan scroll horizontal jika total lebar kolom > viewport
 *
 * Props:
 *  - columns: [{ key, title, width?: number, render?, headerProps? }]
 *      • width (number) = px tetap (fixed)
 *      • tanpa width = kolom fleksibel, pakai flexColMinWidth (default 180)
 *  - data: any[]
 *  - rowHeight?: number (default 44)
 *  - height?: number (default 420)
 *  - headerSticky?: boolean
 *  - headerExtra?: ReactNode
 *  - onRowClick?: (row) => void
 *  - emptyContent?: ReactNode
 *  - flexColMinWidth?: number (default 180)
 */
export default function VirtualTable({
  columns = [],
  data = [],
  rowHeight = 44,
  height = 420,
  headerSticky = true,
  headerExtra = null,
  onRowClick,
  emptyContent = null,
  flexColMinWidth = 180,
}) {
  const scrollYRef = useRef(0);
  const viewportRef = useRef(null);
  const [state, setState] = React.useState({ start: 0, end: 0, viewportRows: 0 });

  // hitung total lebar tabel: jumlah width fixed + jumlah kolom fleksibel * flexColMinWidth
  const layout = useMemo(() => {
    let fixedTotal = 0;
    let flexCount = 0;
    for (const c of columns) {
      if (Number.isFinite(c.width)) fixedTotal += c.width;
      else flexCount += 1;
    }
    const minTableWidth = fixedTotal + flexCount * flexColMinWidth;
    return { fixedTotal, flexCount, minTableWidth };
  }, [columns, flexColMinWidth]);

  const totalRows = data.length;
  const totalHeight = totalRows * rowHeight;

  const recompute = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const viewportRows = Math.max(1, Math.floor(height / rowHeight));
    const buffer = 6;
    const start = Math.max(0, Math.floor(scrollYRef.current / rowHeight) - buffer);
    const end = Math.min(totalRows - 1, start + viewportRows + buffer * 2);
    setState({ start, end, viewportRows });
  }, [height, rowHeight, totalRows]);

  useEffect(() => { recompute(); }, [recompute, data, height, rowHeight]);

  const onScrollY = useCallback((e) => {
    scrollYRef.current = e.currentTarget.scrollTop;
    recompute();
  }, [recompute]);

  const visibleRows = useMemo(() => {
    if (totalRows === 0) return [];
    return data.slice(state.start, state.end + 1);
  }, [data, state, totalRows]);

  const topPad = state.start * rowHeight;
  const bottomPad = totalHeight - topPad - visibleRows.length * rowHeight;

  // Styles
  const s = {
    outer: {
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      background: "#fff",
      overflow: "hidden",
    },
    // wrapper X: supaya bisa scroll horizontal
    xScroll: {
      overflowX: "auto",
    },
    head: (minW) => ({
      display: "flex",
      alignItems: "center",
      position: headerSticky ? "sticky" : "relative",
      top: 0,
      zIndex: 2,
      background:
        "linear-gradient(135deg, var(--primary-dark, #145C3C), var(--primary-color, #1E7F4F))",
      color: "#fff",
      borderBottom: "2px solid var(--accent-color, #F2B705)",
      fontWeight: 800,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      minWidth: minW,
    }),
    headCell: {
      padding: "12px 10px",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      fontSize: 13,
      borderRight: "1px solid rgba(255,255,255,.1)",
      boxSizing: "border-box",
    },
    yScroll: {
      height,
      overflowY: "auto",
      // Tidak set overflowX di sini — scroll X ada di wrapper di atasnya
    },
    // content meniru lebar header (minWidth) agar baris tidak “ngecil”
    content: (minW) => ({
      minWidth: minW,
    }),
    row: {
      display: "flex",
      alignItems: "center",
      height: rowHeight,
      borderBottom: "1px solid var(--border-light, #F1F5F9)",
      background: "var(--bg-card, #fff)",
      transition: "transform .15s ease",
    },
    cell: {
      padding: "10px 12px",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      fontSize: 14,
      color: "var(--text-primary, #0F172A)",
      borderRight: "1px solid #F8FAFC",
      boxSizing: "border-box",
    },
    pad: { height: 0 },
  };

  const headCellStyle = (col) =>
    Number.isFinite(col.width)
      ? { ...s.headCell, flex: `0 0 ${col.width}px`, width: col.width }
      : { ...s.headCell, flex: `0 0 ${flexColMinWidth}px`, width: flexColMinWidth };

  const cellStyle = (col) =>
    Number.isFinite(col.width)
      ? { ...s.cell, flex: `0 0 ${col.width}px`, width: col.width }
      : { ...s.cell, flex: `0 0 ${flexColMinWidth}px`, width: flexColMinWidth };

  return (
    <div style={s.outer}>
      {/* wrapper horizontal scroll untuk header + body */}
      <div style={s.xScroll}>
        {/* Header */}
        <div style={s.head(layout.minTableWidth)}>
          {columns.map((col, i) => (
            <div key={col.key || i} style={headCellStyle(col)} {...(col.headerProps || {})}>
              {col.title}
            </div>
          ))}
          {headerExtra && (
            <div style={{ marginLeft: "auto", paddingRight: 10, fontWeight: 600 }}>
              {headerExtra}
            </div>
          )}
        </div>

        {/* Body (scroll vertikal) */}
        <div style={s.yScroll} ref={viewportRef} onScroll={onScrollY}>
          <div style={s.content(layout.minTableWidth)}>
            {totalRows === 0 ? (
              emptyContent || (
                <div style={{ padding: 16, color: "#64748B" }}>Tidak ada data</div>
              )
            ) : (
              <>
                {/* padding atas */}
                <div style={{ ...s.pad, height: topPad }} />
                {/* baris terlihat */}
                {visibleRows.map((row, idx) => {
                  const realIndex = state.start + idx;
                  return (
                    <div
                      key={row?.npsn ?? realIndex}
                      style={s.row}
                      className="vt-row"
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                      {columns.map((col, ci) => (
                        <div key={col.key || ci} style={cellStyle(col)}>
                          {col.render ? col.render(row, realIndex) : row[col.key]}
                        </div>
                      ))}
                    </div>
                  );
                })}
                {/* padding bawah */}
                <div style={{ ...s.pad, height: bottomPad }} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
