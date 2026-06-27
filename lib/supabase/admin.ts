import { createClient as createSbClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder',
    { auth: { persistSession: false } }
  )
}
