import { createClient } from '@supabase/supabase-js'

/**
 * Admin Supabase client using the service role key
 *
 * IMPORTANT: This client bypasses Row Level Security (RLS).
 * Only use this for:
 * - Server-side admin operations
 * - Background jobs
 * - Audit logging
 * - Operations that need to bypass RLS
 *
 * NEVER expose this client or the service role key to the client-side.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase admin credentials')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Type helper for the admin client
 */
export type AdminClient = ReturnType<typeof createAdminClient>
