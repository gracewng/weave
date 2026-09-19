import { createClient as createSupabase, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

let cached: SupabaseClient | null = null;

/** Service-role client. SERVER ONLY. Bypasses RLS — use for llm_calls, gmail_tokens, cron. */
export function createAdminClient(): SupabaseClient | null {
  if (!env.supabaseUrl || !env.supabaseServiceKey) return null;
  if (!cached) cached = createSupabase(env.supabaseUrl, env.supabaseServiceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return cached;
}
