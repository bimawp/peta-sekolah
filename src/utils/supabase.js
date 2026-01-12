// src/utils/supabase.js
// Backward-compat: re-export Supabase client utama
// Dipakai misalnya oleh AdminProfile.jsx dan util lain di folder utils

export { default as supabase } from '@/services/supabaseClient';
export { default } from '@/services/supabaseClient';
