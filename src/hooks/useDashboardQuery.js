// src/hooks/useDashboardQuery.js
import { useQuery } from '@tanstack/react-query'; // Pastikan sudah install: npm install @tanstack/react-query
import { supabase } from '@/services/supabaseClient'; // Sesuaikan path jika perlu

// --- Fungsi Fetcher Terpisah ---
const fetchDashboardData = async () => {
    // 1. Ambil Statistik Utama (misal dari RPC atau view)
    //    Gantilah 'get_dashboard_stats' dengan nama RPC/view Anda.
    const { data: statsData, error: statsError } = await supabase
        .rpc('get_dashboard_stats'); // Asumsi RPC ini mengembalikan { total_paud, total_sd, total_smp, total_pkbm, total_guru, dll }
    if (statsError) {
        console.error("Error fetching dashboard stats:", statsError);
        throw new Error("Gagal mengambil statistik dashboard.");
    }

    // 2. Ambil Rekap Kegiatan (misal dari view)
    //    Gantilah 'kegiatan_summary_by_jenjang' dengan nama view Anda.
    const { data: kegiatanSummaryData, error: kegiatanError } = await supabase
        .from('kegiatan_summary_by_jenjang') // Asumsi view ini punya kolom: jenjang, kegiatan, total_lokal
        .select('jenjang, kegiatan, total_lokal');
    if (kegiatanError) {
        console.error("Error fetching kegiatan summary:", kegiatanError);
        throw new Error("Gagal mengambil rekap kegiatan.");
    }

    // 3. Ambil Rekap Kondisi Kelas (misal dari view)
    //    Gantilah 'kelas_kondisi_summary_by_jenjang' dengan nama view Anda.
    const { data: kondisiSummaryData, error: kondisiError } = await supabase
        .from('kelas_kondisi_summary_by_jenjang') // Asumsi view: jenjang, baik, sedang, berat, kurang_rkb, total_kelas
        .select('jenjang, baik, sedang, berat, kurang_rkb, total_kelas');
    if (kondisiError) {
        console.error("Error fetching kondisi summary:", kondisiError);
        throw new Error("Gagal mengambil rekap kondisi kelas.");
    }

    // 4. Ambil Data Sekolah (HANYA jika diperlukan untuk top kecamatan/desa)
    //    Lebih baik jika Top Kecamatan/Desa juga dihitung di view Supabase.
    //    Jika tetap perlu fetch semua:
    const { data: schoolsData, error: schoolsError } = await supabase
        .from('schools') // Pilih kolom yang *benar-benar* dibutuhkan
        .select('npsn, name, village, kecamatan, jenjang, level, class_conditions(classrooms_heavy_damage, classrooms_moderate_damage, lacking_rkb)'); // Contoh join
    if (schoolsError) {
        console.error("Error fetching schools data for ranking:", schoolsError);
        throw new Error("Gagal mengambil data sekolah untuk ranking.");
    }

    // 5. Ambil Daftar Kecamatan Unik (jika belum ada di stats)
    const { data: kecamatanList, error: kecError } = await supabase
        .rpc('get_unique_kecamatan'); // Asumsi ada RPC ini
     if (kecError) {
        console.error("Error fetching kecamatan list:", kecError);
        // Fallback atau throw error
     }


    // Kembalikan objek data terstruktur
    return {
        stats: statsData || {},
        kegiatanSummary: kegiatanSummaryData || [],
        kondisiSummary: kondisiSummaryData || [],
        schoolsForRanking: schoolsData || [], // Hanya jika benar-benar perlu
        allKecamatan: kecamatanList || [], // Dari RPC atau stats
    };
};

// --- Custom Hook ---
export function useDashboardQuery() {
    return useQuery({
        queryKey: ['dashboardData'], // Kunci unik cache
        queryFn: fetchDashboardData,
        staleTime: 1000 * 60 * 5, // Data fresh selama 5 menit
        cacheTime: 1000 * 60 * 30, // Disimpan di cache selama 30 menit
        refetchOnWindowFocus: false,
    });
}