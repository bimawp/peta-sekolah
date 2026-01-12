// src/services/utils/calculationUtils.js

/**
 * Menghitung total statistik dari kumpulan data sekolah.
 * @param {Array} schools - Array objek sekolah dari API.
 * @returns {Object} - Objek yang berisi semua total yang dihitung.
 */
export const calculateTotals = (schools = []) => {
  if (!Array.isArray(schools)) {
    console.error("calculateTotals expects an array, but received:", schools);
    return {}; // Mengembalikan objek kosong jika input tidak valid
  }

  const totals = {
    totalSchools: schools.length,
    totalStudents: 0,
    classroomTotals: {
      total: 0,
      good: 0,
      moderateDamage: 0,
      heavyDamage: 0,
      lacking: 0,
    },
    byLevel: {},
  };

  schools.forEach(school => {
    // Akumulasi jumlah siswa
    totals.totalStudents += school.student_count || 0;

    // Inisialisasi data jenjang jika belum ada
    if (!totals.byLevel[school.level]) {
      totals.byLevel[school.level] = {
        count: 0,
        students: 0,
      };
    }
    totals.byLevel[school.level].count += 1;
    totals.byLevel[school.level].students += school.student_count || 0;

    // Akumulasi kondisi ruang kelas
    const conditions = school.class_conditions?.[0] || {};
    const good = conditions.classrooms_good || 0;
    const moderate = conditions.classrooms_moderate_damage || 0;
    const heavy = conditions.classrooms_heavy_damage || 0;
    const lacking = conditions.lacking_rkb || 0;

    totals.classroomTotals.good += good;
    totals.classroomTotals.moderateDamage += moderate;
    totals.classroomTotals.heavyDamage += heavy;
    totals.classroomTotals.lacking += lacking;
    totals.classroomTotals.total += good + moderate + heavy;
  });

  return totals;
};