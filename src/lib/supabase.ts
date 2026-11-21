import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ||
  '';
const allowedEmailsRaw = (import.meta.env.VITE_TEAM_ALLOWED_EMAILS as string | undefined)?.trim() || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 20,
        },
      },
    })
  : null;

export const ALLOWED_TEAM_EMAILS: string[] = allowedEmailsRaw
  ? allowedEmailsRaw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  : [];

export function isEmailAllowedForTeam(email: string): boolean {
  if (ALLOWED_TEAM_EMAILS.length === 0) return true;
  return ALLOWED_TEAM_EMAILS.includes(email.trim().toLowerCase());
}
