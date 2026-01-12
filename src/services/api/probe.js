// src/services/api/probe.js
import supabase from '../supabaseClient';

/**
 * Jalankan di browser console:
 *   await window.__probe('20262010')
 * Ganti argumen dengan NPSN target.
 *
 * Ini bakal:
 * - cari school (by npsn)
 * - baca setiap tabel terkait pakai school_id dan npsn (kalau kolom npsn ada)
 * - log jumlah baris + contoh 1 baris
 * - bilangin kolom apa aja yang tersedia
 */
async function probeByNpsn(npsn) {
  console.log('=== PROBE START === NPSN =', npsn);

  // 1) Ambil sekolah
  const { data: school, error: schoolErr } = await supabase
    .from('schools')
    .select('id,npsn,name,jenjang,level,kecamatan,village,lat,lng,student_count,updated_at')
    .eq('npsn', npsn)
    .maybeSingle();

  if (schoolErr) {
    console.error('[schools] error:', schoolErr);
    return;
  }
  if (!school) {
    console.warn('schools: TIDAK DITEMUKAN untuk npsn', npsn);
    return;
  }
  console.log('schools:', school);

  const sid = school.id;

  // helper: cek satu tabel dg 2 cara (by school_id & by npsn) + log kolom
  async function checkTable(table, select = '*', hasNpsn = true) {
    console.log(`\n[${table}] ===`);
    try {
      const { data: bySid, error: e1 } = await supabase
        .from(table)
        .select(select)
        .eq('school_id', sid);
      if (e1) console.error(`[${table}] by school_id error:`, e1);
      console.log(`[${table}] by school_id:`, { count: bySid?.length || 0, sample: bySid?.[0] || null });

      if (hasNpsn) {
        const { data: byNpsn, error: e2 } = await supabase
          .from(table)
          .select(select)
          .eq('npsn', npsn);
        if (e2) console.error(`[${table}] by npsn error:`, e2);
        console.log(`[${table}] by npsn:`, { count: byNpsn?.length || 0, sample: byNpsn?.[0] || null });
      } else {
        console.log(`[${table}] tidak dicek by npsn (diduga tidak ada kolom npsn)`);
      }

      // list kolom yang ada dari sample
      const sample = (bySid && bySid[0]) || null;
      if (sample) {
        console.log(`[${table}] columns:`, Object.keys(sample));
      } else {
        console.log(`[${table}] columns: (no sample)`);
      }
    } catch (e) {
      console.error(`[${table}] fatal:`, e);
    }
  }

  // 2) Cek tabel satu2
  await checkTable('class_conditions');
  await checkTable('library');
  await checkTable('laboratory');
  await checkTable('teacher_room');
  await checkTable('toilets');
  await checkTable('furniture_computer');
  await checkTable('official_residences');
  await checkTable('kegiatan');          // di sini kita cari 'kegiatan' & 'lokal'
  await checkTable('building_status');

  // SD/PAUD spesial (kalau ada)
  await checkTable('classes_sd', '*', false); // biasanya TIDAK punya kolom npsn
  await checkTable('rombel', '*', false);     // biasanya TIDAK punya kolom npsn
  await checkTable('uks');                    // kadang ada kolom npsn, kadang tidak
  await checkTable('ape', '*');               // khusus PAUD (kalau ada)
  await checkTable('playground_area', '*');   // khusus PAUD (kalau ada)

  console.log('\n=== PROBE END ===');
}

// expose ke window
if (typeof window !== 'undefined') {
  window.__probe = probeByNpsn;
}

export default {};
