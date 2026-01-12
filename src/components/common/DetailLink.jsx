// src/components/common/DetailLink.jsx
import React from "react";
import { Link } from "react-router-dom";

/**
 * Link detail yang aman untuk semua baris sekolah.
 * Wajib punya npsn. Jenjang akan dipilih dari jenjang/level mana pun yang ada.
 */
export default function DetailLink({ npsn, jenjang, level, className = "" }) {
  const _jenjang = jenjang || level || "SD"; // fallback default supaya URL tidak kosong
  const url = `/detail-sekolah?npsn=${encodeURIComponent(npsn)}&jenjang=${encodeURIComponent(_jenjang)}`;

  return (
    <Link to={url} className={className} title="Lihat detail sekolah">
      👁️ Detail
    </Link>
  );
}
