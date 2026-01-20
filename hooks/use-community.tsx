'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
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

  const supabase = createClient()

  const fetchCommunities = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setCommunities([])
        setCurrentCommunity(null)
        setCurrentMember(null)
        return
      }

      // Get user's communities through their memberships
      const { data: memberships, error: membershipError } = await supabase
        .from('community_members')
        .select(`
          id,
          community_id,
          user_id,
          role,
          display_name,
          avatar_url,
          status,
          community:communities (
            id,
            name,
            slug,
            description,
            type,
            logo_url,
            primary_color,
            plan,
            status
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')

      if (membershipError) {
        throw membershipError
      }

      const userCommunities = memberships
        ?.filter(m => m.community)
        .map(m => m.community as unknown as Community) || []

      setCommunities(userCommunities)

      // If there's a current community, update member info
      if (currentCommunity) {
        const membership = memberships?.find(m => m.community_id === currentCommunity.id)
        if (membership) {
          setCurrentMember({
            id: membership.id,
            community_id: membership.community_id,
            user_id: membership.user_id,
            role: membership.role as 'admin' | 'moderator' | 'member',
            display_name: membership.display_name,
            avatar_url: membership.avatar_url,
            status: membership.status,
          })
        }
      }
    } catch {
      // Silently fail - tables may not exist yet
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch member info when community changes
  const fetchMemberInfo = async (communityId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: member } = await supabase
        .from('community_members')
        .select('id, community_id, user_id, role, display_name, avatar_url, status')
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (member) {
        setCurrentMember({
          ...member,
          role: member.role as 'admin' | 'moderator' | 'member',
        })
      }
    } catch {
      // Silently fail - tables may not exist yet
    }
  }

  useEffect(() => {
    fetchCommunities()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchCommunities()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (currentCommunity) {
      fetchMemberInfo(currentCommunity.id)
    } else {
      setCurrentMember(null)
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
