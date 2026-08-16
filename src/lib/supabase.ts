import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * The cloud is optional.
 *
 * With no credentials configured the app runs exactly as it did before Phase 3: local-only,
 * no login, fully usable. That matters for two reasons — the published site must keep working
 * between "auth ships" and "secrets are added to CI", and a tailor should never be locked out
 * of his own measurements because a config value is missing.
 */
export const isCloudConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = isCloudConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        // Keep the session in localStorage and refresh it silently, so signing in once on the
        // iPad lasts for months and survives being offline.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

/** Where the emailed sign-in link should land. Must match a Redirect URL in Supabase. */
export const authRedirectTo = () =>
  `${window.location.origin}${import.meta.env.BASE_URL}`
