/**
 * config/supabase.js
 *
 * Exports two Supabase clients:
 *
 *   supabaseAdmin  — service-role key, bypasses RLS.
 *                    Used exclusively in repository layer for
 *                    server-side data access.  NEVER expose to
 *                    client or embed in tokens.
 *
 *   supabasePublic — anon key, respects RLS.
 *                    Reserved for any client-facing queries
 *                    that should honour row-level security.
 *
 * Both clients use the @supabase/supabase-js v2 createClient
 * with connection pooling settings aligned to Supabase's
 * recommended configuration for server workloads.
 */

import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

// ── Service-role client (server-only) ──────────────────────
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      // Disable auto session handling — this client runs server-side
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        // Identify server-side requests in Supabase logs
        'x-app-version': '1.0.0',
      },
    },
  }
);

// ── Public (anon) client — respects RLS ───────────────────
export const supabasePublic = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);
