// Supabase client. Reads the PUBLIC anon key only — never put the service_role
// key in a VITE_ variable (it would ship to every browser). Safety comes from
// Row Level Security on your tables, not from hiding this key.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

/** null when env vars are missing, so the app still runs on local demo data. */
export const supabase: SupabaseClient | null = url && anon ? createClient(url, anon) : null;
export const isBackendConfigured = supabase !== null;
