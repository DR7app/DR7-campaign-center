import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// @ts-ignore - import.meta.env shape varies
const url = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
// @ts-ignore
const anonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  console.warn(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local — auth and data calls will fail.'
  );
}

export const supabase: SupabaseClient = createClient(url ?? 'http://invalid', anonKey ?? 'invalid', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const isSupabaseConfigured = Boolean(url && anonKey);
