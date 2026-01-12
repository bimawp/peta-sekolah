-- Mengaktifkan RLS pada tabel schools
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Hapus kebijakan lama/terbuka jika ada
DROP POLICY IF EXISTS "Public read access" ON public.schools;

-- KEBIJAKAN BARU:

-- 1. Izinkan pengguna yang sudah login (authenticated) untuk MEMBACA (SELECT) data sekolah.
CREATE POLICY "Allow authenticated users to read schools"
ON public.schools
FOR SELECT
TO authenticated
USING (true);

-- 2. Izinkan HANYA pengguna dengan peran 'admin' untuk MENAMBAH (INSERT) data sekolah.
-- Kebijakan ini menggunakan tabel 'profile' Anda untuk memeriksa peran.
CREATE POLICY "Allow admins to insert schools"
ON public.schools
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM public.profile WHERE user_id = auth.uid()) = 'admin'
);

-- 3. Izinkan HANYA 'admin' untuk MENGUBAH (UPDATE) data sekolah.
CREATE POLICY "Allow admins to update schools"
ON public.schools
FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM public.profile WHERE user_id = auth.uid()) = 'admin'
);

-- 4. Izinkan HANYA 'admin' untuk MENGHAPUS (DELETE) data sekolah.
CREATE POLICY "Allow admins to delete schools"
ON public.schools
FOR DELETE
TO authenticated
USING (
  (SELECT role FROM public.profile WHERE user_id = auth.uid()) = 'admin'
);