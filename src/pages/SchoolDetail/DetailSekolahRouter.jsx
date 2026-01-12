// src/pages/DetailSekolah/DetailSekolahRouter.jsx
import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import SchoolDetailPaud from "../../components/schools/SchoolDetail/Paud/SchoolDetailPaud";
import SchoolDetailSd from "../../components/schools/SchoolDetail/Sd/SchoolDetailSd";
import SchoolDetailSmp from "../../components/schools/SchoolDetail/Smp/SchoolDetailSmp";
import SchoolDetailPkbm from "../../components/schools/SchoolDetail/Pkbm/SchoolDetailPkbm";

export default function DetailSekolahRouter() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const npsn = sp.get("npsn")?.trim();

  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState(null);
  const [err, setErr] = useState("");

  const toKey = (v) => (v == null ? "" : String(v).trim());

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!npsn) {
        setErr("Parameter npsn tidak ditemukan.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setErr("");

        // Ambil dataset lokal
        const [paud, sd, smp, pkbm] = await Promise.all([
          fetch("/data/paud.json").then((r) => r.json()),
          fetch("/data/sd_new.json").then((r) => r.json()),
          fetch("/data/smp.json").then((r) => r.json()),
          fetch("/data/pkbm.json").then((r) => r.json()),
        ]);

        const flat = (obj, jenjang) =>
          Object.entries(obj || {}).flatMap(([kec, arr]) =>
            (arr || []).map((s) => ({ ...s, kecamatan: kec, jenjang }))
          );

        const all = [
          ...flat(paud, "PAUD"),
          ...flat(sd, "SD"),
          ...flat(smp, "SMP"),
          ...flat(pkbm, "PKBM"),
        ];

        const found = all.find((s) => toKey(s.npsn) === toKey(npsn));
        if (!alive) return;

        if (!found) {
          setErr(`Sekolah dengan NPSN ${npsn} tidak ditemukan.`);
        } else {
          setSchool(found);
        }
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Gagal memuat data sekolah.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [npsn]);

  const onBack = () => {
    const from = sp.get("from");
    if (from === "facilities") {
      navigate("/lainnya"); // atau "/facilities" sesuai rute kamu
    } else {
      navigate(-1);
    }
  };

  if (loading) return <div style={{ padding: 16 }}>Memuat detail sekolah…</div>;
  if (err)
    return (
      <div style={{ padding: 16 }}>
        <p style={{ color: "#b91c1c", marginBottom: 12 }}>{err}</p>
        <button onClick={onBack}>Kembali</button>
      </div>
    );
  if (!school)
    return (
      <div style={{ padding: 16 }}>
        <p>Data tidak tersedia.</p>
        <button onClick={onBack}>Kembali</button>
      </div>
    );

  switch (school.jenjang) {
    case "PAUD":
      return <SchoolDetailPaud schoolData={school} onBack={onBack} />;
    case "SD":
      return <SchoolDetailSd schoolData={school} onBack={onBack} />;
    case "SMP":
      return <SchoolDetailSmp schoolData={school} onBack={onBack} />;
    case "PKBM":
      return <SchoolDetailPkbm schoolData={school} onBack={onBack} />;
    default:
      return (
        <div style={{ padding: 16 }}>
          <p>Jenjang tidak dikenali.</p>
          <button onClick={onBack}>Kembali</button>
        </div>
      );
  }
}