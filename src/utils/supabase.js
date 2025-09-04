import { createClient } from "@supabase/supabase-js";

// Ambil URL dan Key dari .env
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Buat client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
