'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'

/**
 * Hook to sync the user's theme preference from the database
 * This runs once when the user logs in to apply their saved theme preference
 */
export function useThemeSync() {
  const { setTheme } = useTheme()
  const hasSynced = useRef(false)

  useEffect(() => {
    // Only sync once per session
    if (hasSynced.current) return

    let isMounted = true
    const supabase = createClient()

    const syncTheme = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !isMounted) return

        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('theme_preference')
          .eq('id', user.id)
          .single()

        // Silently fail if table doesn't exist or query fails
        if (error || !isMounted) return

        if (profile?.theme_preference) {
          setTheme(profile.theme_preference)
          hasSynced.current = true
        }
      } catch (error) {
        // Silently ignore all errors - table may not exist
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }
      }
    }

    syncTheme()

    return () => {
      isMounted = false
    }
  }, [setTheme])
}

/**
 * Component that syncs theme on mount
 * Add this to your app layout to automatically sync theme preferences
 */
export function ThemeSyncProvider({ children }: { children: React.ReactNode }) {
  useThemeSync()
  return <>{children}</>
}
