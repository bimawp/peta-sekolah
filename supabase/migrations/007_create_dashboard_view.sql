-- Membuat view yang menggabungkan data dari beberapa tabel
CREATE OR REPLACE VIEW public.dashboard_stats AS
SELECT
  s.id AS school_id,
  s.name AS school_name,
  s.npsn,
  s.type AS school_type,
  s.level AS school_level,
  s.village,
  -- Mengambil nama kepala sekolah
  k.name AS principal_name,
  k.status AS principal_status,
  -- Menghitung total siswa
  s.student_count,
  -- Menghitung kondisi ruang kelas
  cc.classrooms_good,
  cc.classrooms_moderate_damage,
  cc.classrooms_heavy_damage,
  cc.lacking_rkb,
  cc.total_mh AS total_damaged_classrooms,
  -- Menghitung total toilet
  t.total AS total_toilets
FROM
  public.schools s
  LEFT JOIN public.kepsek k ON s.id = k.school_id
  LEFT JOIN public.class_conditions cc ON s.id = cc.school_id
  LEFT JOIN public.toilets t ON s.id = t.school_id;

-- Terapkan juga keamanan pada VIEW ini
ALTER VIEW public.dashboard_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read dashboard stats"
ON public.dashboard_stats
FOR SELECT
TO authenticated
USING (true);