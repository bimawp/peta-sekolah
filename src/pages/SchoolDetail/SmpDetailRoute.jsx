// src/pages/SchoolDetail/SmpDetailRoute.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '@/services/supabaseClient';
import SchoolDetailSmp from '@/components/schools/SchoolDetail/Smp/SchoolDetailSmp';

const toNum = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  const v = params.get(name);
  return v && String(v).trim() !== '' ? v : null;
}

const zeroBox = () => ({ good: 0, moderate_damage: 0, heavy_damage: 0, total_mh: 0, total_all: 0 });

export default function SmpDetailRoute() {
  const navigate = useNavigate();
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [schoolData, setSchoolData] = useState(null);

  const npsn = useMemo(() => getQueryParam('npsn'), []);

  const handleBack = useCallback(() => {
    // balik ke halaman sebelumnya; kalau tidak ada, ke /detail-sekolah
    if (window.history.length > 1) window.history.back();
    else navigate('/detail-sekolah');
  }, [navigate]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!npsn) {
          setError('Gagal memuat: Parameter npsn tidak ditemukan di URL (?npsn=...)');
          setLoading(false);
          return;
        }

        // Ambil 1 sekolah by npsn + semua relasi terkait
        const { data: school, error: err } = await supabase
          .from('schools')
          .select(`
            id, npsn, name, address, village, kecamatan, type, level,
            student_count, lat, lng,
            class_conditions (*),
            library (*),
            laboratory (*),
            teacher_room (*),
            toilets (*),
            furniture_computer (*),
            official_residences (*)
          `)
          .eq('npsn', npsn)
          .single();

        if (err) throw err;
        if (!school) throw new Error('Sekolah tidak ditemukan');

        // ====== MAPPING KE STRUKTUR YANG DIHARAPKAN KOMPONENMU ======
        // 1) Koordinat (komponenmu pakai schoolData.coordinates[0]=lat, [1]=lng)
        //    Komponenmu membuat URL pakai "lat,lng" di Google Maps -> susun [lat, lng]
        const lat = Number(school?.lat);
        const lng = Number(school?.lng);
        const hasCoord = Number.isFinite(lat) && Number.isFinite(lng);
        const coordinates = hasCoord ? [lat, lng] : null;

        // 2) Class condition (komponenmu akses: class_condition.classrooms_* / lacking_rkb)
        const cc = Array.isArray(school.class_conditions) ? school.class_conditions[0] : school.class_conditions;
        const class_condition = {
          classrooms_good:            toNum(cc?.classrooms_good),
          classrooms_moderate_damage: toNum(cc?.classrooms_moderate_damage),
          classrooms_heavy_damage:    toNum(cc?.classrooms_heavy_damage),
          total_room:                 toNum(cc?.total_room),
          lacking_rkb:                toNum(cc?.lacking_rkb),
        };

        // 3) Library -> dijadikan single box sesuai field di komponenmu
        const lib = Array.isArray(school.library) ? school.library[0] : school.library;
        const library = lib ? {
          good:            toNum(lib.good),
          moderate_damage: toNum(lib.moderate_damage),
          heavy_damage:    toNum(lib.heavy_damage),
          total_mh:        toNum(lib.moderate_damage) + toNum(lib.heavy_damage),
          total_all:       toNum(lib.total) ?? (toNum(lib.good) + toNum(lib.moderate_damage) + toNum(lib.heavy_damage)),
        } : zeroBox();

        // 4) Laboratory — di DB biasanya satu tabel "laboratory" dengan kolom lab_type.
        //    Komponenmu mengharapkan beberapa box terpisah:
        //    - laboratory_comp       (komputer)
        //    - laboratory_langua     (bahasa)
        //    - laboratory_ipa        (ipa)
        //    - laboratory_fisika     (fisika)
        //    - laboratory_biologi    (biologi)
        const labArr = Array.isArray(school.laboratory) ? school.laboratory : (school.laboratory ? [school.laboratory] : []);
        const findLab = (keywords) => {
          const item = labArr.find(l => {
            const t = String(l?.lab_type || '').toLowerCase();
            return keywords.some(k => t.includes(k));
          });
          if (!item) return zeroBox();
          return {
            good:            toNum(item.good),
            moderate_damage: toNum(item.moderate_damage),
            heavy_damage:    toNum(item.heavy_damage),
            total_mh:        toNum(item.moderate_damage) + toNum(item.heavy_damage),
            total_all:       toNum(item.total_all) ?? (toNum(item.good) + toNum(item.moderate_damage) + toNum(item.heavy_damage)),
          };
        };
        const laboratory_comp    = findLab(['komputer', 'computer', 'ict', 'ti']);
        const laboratory_langua  = findLab(['bahasa', 'language']);
        const laboratory_ipa     = findLab(['ipa', 'science', 'sains']);
        const laboratory_fisika  = findLab(['fisika', 'physics']);
        const laboratory_biologi = findLab(['biologi', 'biology']);

        // 5) Teacher rooms / ruang lain — data di DB bisa tersebar (teacher_room / teacher_room.room_type)
        //    Komponenmu mengharapkan:
        //    - kepsek_room
        //    - teacher_room
        //    - administration_room
        const roomArr = Array.isArray(school.teacher_room) ? school.teacher_room : (school.teacher_room ? [school.teacher_room] : []);
        const findRoom = (keywords) => {
          const item = roomArr.find(r => {
            const t = String(r?.room_type || '').toLowerCase();
            return keywords.some(k => t.includes(k));
          });
          if (!item) return zeroBox();
          return {
            good:            toNum(item.good),
            moderate_damage: toNum(item.moderate_damage),
            heavy_damage:    toNum(item.heavy_damage),
            total_mh:        toNum(item.total_mh),
            total_all:       toNum(item.total_all) ?? (toNum(item.good) + toNum(item.moderate_damage) + toNum(item.heavy_damage)),
          };
        };
        const kepsek_room        = findRoom(['kepala sekolah', 'kepsek', 'principal']);
        const teacher_room_box   = findRoom(['guru', 'teachers']);
        const administration_room= findRoom(['tu', 'tata usaha', 'administrasi', 'administration']);

        // 6) Toilets — komponenmu ingin nested:
        //    teachers_toilet.male|female.{good,moderate_damage,heavy_damage,total_mh,total_all}
        //    students_toilet.male|female.{...}
        //    Di DB kamu punya table toilets (type, male, female, good, moderate_damage, heavy_damage, total)
        const toiletsArr = Array.isArray(school.toilets) ? school.toilets : (school.toilets ? [school.toilets] : []);
        // helper untuk bikin box gender dari baris toilet
        const toGenderBox = (row) => {
          if (!row) return { male: zeroBox(), female: zeroBox() };
          const maleBox = {
            good:            toNum(row?.male && row?.good ? row.good : row?.good_male),
            moderate_damage: toNum(row?.male && row?.moderate_damage ? row.moderate_damage : row?.moderate_damage_male),
            heavy_damage:    toNum(row?.male && row?.heavy_damage ? row.heavy_damage : row?.heavy_damage_male),
            total_mh:        0,
            total_all:       toNum(row?.male ?? 0)
          };
          maleBox.total_mh = maleBox.moderate_damage + maleBox.heavy_damage;

          const femaleBox = {
            good:            toNum(row?.female && row?.good ? row.good : row?.good_female),
            moderate_damage: toNum(row?.female && row?.moderate_damage ? row.moderate_damage : row?.moderate_damage_female),
            heavy_damage:    toNum(row?.female && row?.heavy_damage ? row.heavy_damage : row?.heavy_damage_female),
            total_mh:        0,
            total_all:       toNum(row?.female ?? 0)
          };
          femaleBox.total_mh = femaleBox.moderate_damage + femaleBox.heavy_damage;

          return { male: maleBox, female: femaleBox };
        };

        // cari baris bertipe “guru” dan “siswa”
        const toiletTeachers = toiletsArr.find(t => String(t?.type || '').toLowerCase().includes('guru'));
        const toiletStudents = toiletsArr.find(t => String(t?.type || '').toLowerCase().includes('siswa'));
        const teachers_toilet = toGenderBox(toiletTeachers);
        const students_toilet = toGenderBox(toiletStudents);

        // 7) Furniture & computer (komponenmu baca furniture_computer.*)
        const fc = Array.isArray(school.furniture_computer) ? school.furniture_computer[0] : school.furniture_computer;
        const furniture_computer = {
          tables:   toNum(fc?.tables),
          chairs:   toNum(fc?.chairs),
          boards:   toNum(fc?.boards),
          computer: toNum(fc?.computer),
        };

        // 8) official_residences (rumah dinas)
        const orow = Array.isArray(school.official_residences) ? school.official_residences[0] : school.official_residences;
        const official_residences = {
          total:           toNum(orow?.total),
          good:            toNum(orow?.good),
          moderate_damage: toNum(orow?.moderate_damage),
          heavy_damage:    toNum(orow?.heavy_damage),
        };

        // ====== SUSUN OBJEK SESUAI YANG DIHARAPKAN SchoolDetailSmp.jsx ======
        const mapped = {
          // header:
          name: school?.name || '-',
          npsn: school?.npsn || '-',
          address: school?.address || '-',
          village: school?.village || '-',
          kecamatan: school?.kecamatan || '-',
          student_count: toNum(school?.student_count),
          coordinates,

          // kondisi kelas
          class_condition,

          // perpustakaan
          library,

          // labs
          laboratory_comp,
          laboratory_langua,
          laboratory_ipa,
          laboratory_fisika,
          laboratory_biologi,

          // rooms
          kepsek_room,
          teacher_room: teacher_room_box,
          administration_room,

          // toilets
          teachers_toilet,
          students_toilet,

          // furniture & komputer
          furniture_computer,

          // rumah dinas
          official_residences,

          // bendera opsional untuk bar chart (komponenmu pakai getData([...,'pembangunanRKB'],0))
          pembangunanRKB: 0
        };

        if (!alive) return;
        setSchoolData(mapped);
        setLoading(false);
      } catch (e) {
        if (!alive) return;
        console.error('[SmpDetailRoute] error:', e);
        setError(e?.message || String(e));
        setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [npsn]);

  if (loading) {
    return (
      <div style={{ padding: 16 }}>
        <button onClick={handleBack} style={{ marginBottom: 12 }}>← Kembali</button>
        Memuat data sekolah...
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <button onClick={handleBack} style={{ marginBottom: 12 }}>← Kembali</button>
        <div style={{ color: 'crimson' }}>{error}</div>
      </div>
    );
  }

  return <SchoolDetailSmp schoolData={schoolData} onBack={handleBack} />;
}
