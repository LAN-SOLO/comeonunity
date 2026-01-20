import { SupabaseClient } from '@supabase/supabase-js'
import { redirect, notFound } from 'next/navigation'

/**
 * Check if a string looks like a valid UUID
 */
export function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

/**
 * Build a community query that handles both slugs and UUIDs
 * This avoids the PostgreSQL error when comparing a non-UUID string against a UUID column
 */
export function buildCommunityQuery(
  supabase: SupabaseClient,
  slugOrId: string,
  select: string = 'id, name, slug, description, type, logo_url, primary_color, plan, status'
) {
  let query = supabase
    .from('communities')
    .select(select)
    .eq('status', 'active')

  if (isUUID(slugOrId)) {
    query = query.or(`slug.eq.${slugOrId},id.eq.${slugOrId}`)
  } else {
    query = query.eq('slug', slugOrId)
  }

  return query
}

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

interface Membership {
  id: string
  role: 'admin' | 'moderator' | 'member'
  display_name: string | null
  joined_at: string
}

interface CommunityResult {
  community: Community
  membership: Membership
  isAdmin: boolean
  isModerator: boolean
}

/**
 * Get community by slug or ID, verifying user membership
 * Automatically redirects to slug URL if accessed by ID
 */
export async function getCommunityWithMembership(
  supabase: SupabaseClient,
  slugOrId: string,
  userId: string
): Promise<CommunityResult> {
  // First, find community by slug or ID
  const { data, error: communityError } = await buildCommunityQuery(supabase, slugOrId).single()
  const community = data as Community | null

  if (communityError || !community) {
    notFound()
  }

  // Redirect to canonical slug URL if accessed by ID
  if (slugOrId !== community.slug && slugOrId === community.id) {
    redirect(`/c/${community.slug}`)
  }

  // Verify membership
  const { data: membership, error: membershipError } = await supabase
    .from('community_members')
    .select('id, role, display_name, joined_at')
    .eq('community_id', community.id)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (membershipError || !membership) {
    notFound()
  }

  return {
    community: community as Community,
    membership: membership as Membership,
    isAdmin: membership.role === 'admin',
    isModerator: membership.role === 'admin' || membership.role === 'moderator',
  }
}

/**
 * Get community by slug or ID (without membership check)
 */
export async function getCommunity(
  supabase: SupabaseClient,
  slugOrId: string
): Promise<Community | null> {
  const { data: community } = await buildCommunityQuery(supabase, slugOrId).single()

  return community as Community | null
}
