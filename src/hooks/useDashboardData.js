// src/hooks/useDashboardData.js
// Versi Supabase (tanpa file JSON) – FINAL & TERINTEGRASI DETAILS

import { useState, useEffect } from "react";
import supabase from "@/services/supabaseClient";

const norm = (x) =>
  String(x ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();

const jenjangKeyFromCode = (code) => {
  const c = (code || "").toUpperCase();
  if (c === "PAUD") return "paud";
  if (c === "SD") return "sd";
  if (c === "SMP") return "smp";
  if (c === "PKBM") return "pkbm";
  return null;
};

const humanizeKegiatanName = (name) =>
  String(name || "")
    .replace(/([A-Z])/g, " $1")
    .replace(/\s+/g, " ")
    .trim();

const useDashboardData = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1) Ambil master + schools
        const [
          { data: typeRows, error: typeErr },
          { data: locRows, error: locErr },
          { data: staffRows, error: staffErr },
          { data: schoolRows, error: schoolErr },
        ] = await Promise.all([
          supabase.from("school_types").select("id, code"),
          supabase.from("locations").select("id, subdistrict, village"),
          supabase.from("staff_summary").select("school_id, role, count"),
          supabase
            .from("schools")
            .select(
              "id, npsn, name, student_count, st_male, st_female, school_type_id, location_id, village_name, details, class_condition, meta"
            )
            .order("id", { ascending: true })
            .range(0, 9999),
        ]);

        if (typeErr) throw typeErr;
        if (locErr) throw locErr;
        if (staffErr) console.warn("[useDashboardData] staff_summary error:", staffErr);
        if (schoolErr) throw schoolErr;

        // 2) Mapping master jenis sekolah
        const typeById = new Map();
        (typeRows || []).forEach((t) => {
          const code = norm(t?.code || "").toUpperCase();
          if (code) typeById.set(t.id, code);
        });

        // 3) Mapping lokasi (kalau locations kosong, tetap aman karena fallback ke meta/village_name)
        const locById = new Map();
        (locRows || []).forEach((l) => {
          locById.set(l.id, {
            subdistrict: norm(l?.subdistrict || ""),
            village: norm(l?.village || ""),
          });
        });

        // 4) Rekap jumlah guru per sekolah dari staff_summary (fallback)
        const teacherCountBySchool = new Map();
        (staffRows || []).forEach((row) => {
          const sid = row?.school_id;
          if (!sid) return;
          const n = Number(row?.count || 0) || 0;
          teacherCountBySchool.set(sid, (teacherCountBySchool.get(sid) || 0) + n);
        });

        // 5) Struktur utama
        const result = { paud: {}, sd: {}, smp: {}, pkbm: {} };

        // 6) Agregasi kegiatan dari details/meta (pengganti school_projects)
        const kegAgg = {
          PAUD: new Map(),
          SD: new Map(),
          SMP: new Map(),
          PKBM: new Map(),
        };

        (schoolRows || []).forEach((s) => {
          const detailsData = s?.details || {};
          const metaData = s?.meta || {};

          const typeCodeRaw =
            typeById.get(s.school_type_id) ||
            detailsData?.jenjang ||
            metaData?.jenjang ||
            metaData?.level ||
            "";

          const typeCode = String(typeCodeRaw).toUpperCase();
          const bucketKey = jenjangKeyFromCode(typeCode);
          if (!bucketKey) return;

          const loc = s.location_id ? locById.get(s.location_id) : null;

          const kecamatanName =
            norm((loc && loc.subdistrict) || detailsData?.kecamatan || metaData?.kecamatan) ||
            "Lainnya";

          const desaName =
            norm((loc && loc.village) || s?.village_name || detailsData?.desa || metaData?.desa) ||
            "Lainnya";

          // PRASARANA kelas: details.prasarana.classrooms -> fallback meta.prasarana.classrooms -> fallback class_condition
          const rawCC =
            detailsData?.prasarana?.classrooms ||
            metaData?.prasarana?.classrooms ||
            s?.class_condition ||
            {};

          const classCondition = {
            classrooms_good: Number(rawCC.classrooms_good ?? rawCC.good ?? 0) || 0,
            classrooms_moderate_damage:
              Number(rawCC.classrooms_moderate_damage ?? rawCC.moderate ?? rawCC.moderate_damage ?? 0) || 0,
            classrooms_heavy_damage:
              Number(rawCC.classrooms_heavy_damage ?? rawCC.heavy ?? rawCC.heavy_damage ?? 0) || 0,
            lacking_rkb: Number(rawCC.lacking_rkb ?? rawCC.kurang_rkb ?? 0) || 0,
          };

          // GURU: details.guru.jumlahGuru -> fallback meta.guru.jumlahGuru -> fallback staff_summary
          const teachers =
            Number(detailsData?.guru?.jumlahGuru) ||
            Number(metaData?.guru?.jumlahGuru) ||
            teacherCountBySchool.get(s.id) ||
            0;

          const schoolObj = {
            id: s.id,
            npsn: s.npsn,
            name: s.name,
            jenjang: typeCode,
            kecamatan: kecamatanName,
            village: desaName,
            student_count: Number(s.student_count || 0),
            class_condition: classCondition,
            teacher: { n_teachers: teachers },
            teachers,
            details: detailsData,
            meta: metaData, // tetap disertakan untuk kompatibilitas komponen lama
          };

          if (!result[bucketKey][kecamatanName]) result[bucketKey][kecamatanName] = [];
          result[bucketKey][kecamatanName].push(schoolObj);

          // Kegiatan dari details/meta
          const kegiatanList = detailsData?.kegiatanFisik || metaData?.kegiatanFisik || {};
          if (kegAgg[typeCode] && kegiatanList && typeof kegiatanList === "object") {
            Object.entries(kegiatanList).forEach(([name, volume]) => {
              const v = Number(volume) || 0;
              if (v <= 0) return;
              const m = kegAgg[typeCode];
              m.set(name, (m.get(name) || 0) + v);
            });
          }
        });

        const mapToArray = (m) =>
          Array.from(m.entries()).map(([name, volume]) => ({
            Kegiatan: humanizeKegiatanName(name),
            Lokal: Number(volume) || 0,
          }));

        const finalData = {
          ...result, // ✅ FIX: sebelumnya Anda tertulis ".result" (syntax error)
          kegiatanPaud: mapToArray(kegAgg.PAUD),
          kegiatanSd: mapToArray(kegAgg.SD),
          kegiatanSmp: mapToArray(kegAgg.SMP),
          kegiatanPkbm: mapToArray(kegAgg.PKBM),
        };

        if (!alive) return;
        setData(finalData);
      } catch (err) {
        console.error("Error Dashboard Data:", err);
        if (alive) setError(err?.message || String(err));
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, []);

  return { data, loading, error };
};

export default useDashboardData;
