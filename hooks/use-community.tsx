'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Community {
  id: string
  name: string
  slug: string
  description: string | null
  type: string
  logo_url: string | null
  primary_color: string
  plan: string
  status: string
}

interface CommunityMember {
  id: string
  community_id: string
  user_id: string
  role: 'admin' | 'moderator' | 'member'
  display_name: string | null
  avatar_url: string | null
  status: string
}

interface CommunityContextType {
  communities: Community[]
  currentCommunity: Community | null
  currentMember: CommunityMember | null
  isLoading: boolean
  error: string | null
  setCurrentCommunity: (community: Community | null) => void
  refreshCommunities: () => Promise<void>
  isAdmin: boolean
  isModerator: boolean
}

const CommunityContext = createContext<CommunityContextType | undefined>(undefined)

export function CommunityProvider({ children }: { children: ReactNode }) {
  const [communities, setCommunities] = useState<Community[]>([])
  const [currentCommunity, setCurrentCommunity] = useState<Community | null>(null)
  const [currentMember, setCurrentMember] = useState<CommunityMember | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  const fetchCommunities = useCallback(async () => {
    const supabase = createClient()

    try {
      if (isMountedRef.current) {
        setIsLoading(true)
        setError(null)
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !isMountedRef.current) {
        if (isMountedRef.current) {
          setCommunities([])
          setCurrentCommunity(null)
          setCurrentMember(null)
        }
        return
      }

      // Get user's communities through their memberships
      const { data: memberships, error: membershipError } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user.id)
        .eq('status', 'active')

      if (membershipError) {
        // Only log if it's not a network error (those are expected when offline)
        if (membershipError.code !== 'NETWORK_ERROR') {
          console.error('Error fetching memberships:', membershipError.message || membershipError.code || 'Unknown error')
        }
        return
      }

      if (!isMountedRef.current) return

      if (!memberships || memberships.length === 0) {
        setCommunities([])
        return
      }

      // Fetch the actual communities
      const communityIds = memberships.map(m => m.community_id)
      const { data: communityData, error: communityError } = await supabase
        .from('communities')
        .select('id, name, slug, description, type, logo_url, primary_color, plan, status')
        .in('id', communityIds)
        .eq('status', 'active')

      if (communityError) {
        if (communityError.code !== 'NETWORK_ERROR') {
          console.error('Error fetching communities:', communityError.message || communityError.code || 'Unknown error')
        }
        return
      }

      if (!isMountedRef.current) return

      setCommunities(communityData || [])
    } catch (err) {
      // Silently fail - tables may not exist yet or request was aborted
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  // Initial fetch and auth subscription
  useEffect(() => {
    isMountedRef.current = true
    const supabase = createClient()

    fetchCommunities()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      if (isMountedRef.current) {
        fetchCommunities()
      }
    })

    return () => {
      isMountedRef.current = false
      subscription.unsubscribe()
    }
  }, [fetchCommunities])

  // Fetch member info when community changes
  useEffect(() => {
    if (!currentCommunity) {
      setCurrentMember(null)
      return
    }

    let isMounted = true
    const supabase = createClient()

    const fetchMemberInfo = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !isMounted) return

        const { data: member } = await supabase
          .from('community_members')
          .select('id, community_id, user_id, role, display_name, avatar_url, status')
          .eq('community_id', currentCommunity.id)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()

        if (member && isMounted) {
          setCurrentMember({
            ...member,
            role: member.role as 'admin' | 'moderator' | 'member',
          })
        }
      } catch (err) {
        // Silently fail - tables may not exist yet or request was aborted
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }
      }
    }

    fetchMemberInfo()

    return () => {
      isMounted = false
    }
  }, [currentCommunity?.id])

  const isAdmin = currentMember?.role === 'admin'
  const isModerator = currentMember?.role === 'admin' || currentMember?.role === 'moderator'

  return (
    <CommunityContext.Provider
      value={{
        communities,
        currentCommunity,
        currentMember,
        isLoading,
        error,
        setCurrentCommunity,
        refreshCommunities: fetchCommunities,
        isAdmin,
        isModerator,
      }}
    >
      {children}
    </CommunityContext.Provider>
  )
}

export function useCommunity() {
  const context = useContext(CommunityContext)
  if (context === undefined) {
    throw new Error('useCommunity must be used within a CommunityProvider')
  }
  return context
}
