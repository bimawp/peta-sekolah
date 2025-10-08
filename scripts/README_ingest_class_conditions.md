# Ingest `class_conditions` dari JSON sumber (peta-sekolah.vercel.app)

Skrip ini menarik data kondisi ruang langsung dari JSON yang sama dengan yang kamu pakai untuk `schools`/`kegiatan`, lalu **mengisi tabel `class_conditions`** di Supabase agar angka chart sama dengan sumber acuan.

## Langkah cepat

1. **Pasang kredensial**  
   Buat `.env` di root:
   ```dotenv
   SUPABASE_URL=https://<your-project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
