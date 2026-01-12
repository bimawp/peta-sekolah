import React from "react";

/**
 * Loader super-ringan untuk fallback <Suspense>.
 * Tanpa CSS module supaya minim risiko error saat HMR.
 */
export default function SuspenseLoader({ label = "Memuat…", fullScreen = false }) {
  const wrapStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 16,
    minHeight: fullScreen ? "40vh" : 56,
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"',
    color:
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "#e5e5e5"
        : "#444",
  };

  const spinnerStyle = {
    width: 18,
    height: 18,
    borderRadius: 9999,
    border: "3px solid rgba(0,0,0,.08)",
    borderTopColor: "rgba(0,0,0,.55)",
    animation: "psSpin .8s linear infinite",
  };

  // Inject keyframes (idempotent)
  if (typeof document !== "undefined" && !document.getElementById("psSpinStyle")) {
    const style = document.createElement("style");
    style.id = "psSpinStyle";
    style.textContent = `
      @keyframes psSpin { to { transform: rotate(360deg); } }
      @media (prefers-color-scheme: dark){
        .ps-spinner-dark { border-color: rgba(255,255,255,.12) !important; border-top-color: rgba(255,255,255,.8) !important; }
      }
    `;
    document.head.appendChild(style);
  }

  const isDark =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  return (
    <div role="status" aria-live="polite" aria-busy="true" style={wrapStyle}>
      <div
        style={{
          ...spinnerStyle,
          ...(isDark
            ? {
                borderColor: "rgba(255,255,255,.12)",
                borderTopColor: "rgba(255,255,255,.8)",
              }
            : null),
        }}
      />
      <div style={{ fontSize: 14, letterSpacing: 0.2 }}>{label}</div>
    </div>
  );
}
