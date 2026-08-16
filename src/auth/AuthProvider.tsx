import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { authRedirectTo, isCloudConfigured, supabase } from '../lib/supabase'

interface Auth {
  /** false when no Supabase credentials are configured — the app runs local-only. */
  cloud: boolean
  session: Session | null
  /** Still restoring a stored session; render nothing rather than flashing the sign-in screen. */
  loading: boolean
  sendLink: (email: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<Auth>({
  cloud: false,
  session: null,
  loading: false,
  sendLink: async () => ({ error: null }),
  signOut: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isCloudConfigured)

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    // Fires on sign-in, sign-out, and silent token refresh — including when the tailor
    // returns via the emailed link.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const value: Auth = {
    cloud: isCloudConfigured,
    session,
    loading,
    sendLink: async (email) => {
      if (!supabase) return { error: null }
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: authRedirectTo(),
          // Sign-ups are invite-only: accounts are created from the Supabase dashboard, so a
          // scraped anon key cannot be used to register users or burn the email quota.
          shouldCreateUser: false,
        },
      })
      return { error: error?.message ?? null }
    },
    signOut: async () => {
      await supabase?.auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
