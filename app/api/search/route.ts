import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface Community {
  id: string
  slug: string
  name: string
}

interface Membership {
  community_id: string
  communities: Community | Community[] | null
}

// Helper to extract community from membership (Supabase returns array or object)
function getCommunity(m: Membership): Community | null {
  if (!m.communities) return null
  return Array.isArray(m.communities) ? m.communities[0] : m.communities
}

interface SearchResult {
  content_type: string
  content_id: string
  community_id: string
  title: string
  content: string
  metadata: Record<string, unknown>
  rank: number
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get search parameters
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')?.trim()
    const communityId = searchParams.get('community_id')
    const types = searchParams.get('types')?.split(',') || ['news', 'item', 'event', 'member', 'resource']
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] })
    }

    // Get user's communities
    const { data: memberships } = await supabase
      .from('community_members')
      .select('community_id, communities(id, slug, name)')
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ results: [] })
    }

    // Build community IDs array
    const typedMemberships = memberships as Membership[]
    let communityIds: string[]

    if (communityId) {
      // If community_id is provided, resolve it (could be slug or UUID)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(communityId)
      const membership = typedMemberships.find((m) => {
        const comm = getCommunity(m)
        return isUUID
          ? (m.community_id === communityId || comm?.id === communityId)
          : comm?.slug === communityId
      })

      if (!membership) {
        return NextResponse.json({ results: [] })
      }

      communityIds = [membership.community_id]
    } else {
      // Search across all user's communities
      communityIds = typedMemberships.map((m) => m.community_id)
    }

    // Call the search function
    const { data: results, error } = await supabase.rpc('search_content', {
      p_query: query,
      p_community_ids: communityIds,
      p_content_types: types,
      p_limit: limit,
    })

    if (error) {
      console.error('Search error:', error)
      // Fall back to basic search if RPC fails (e.g., migration not run yet)
      return await fallbackSearch(supabase, query, communityIds, types, limit, typedMemberships)
    }

    // Build community lookup map
    const communityMap = new Map<string, { name: string; slug: string }>()
    typedMemberships.forEach((m) => {
      const comm = getCommunity(m)
      if (comm) {
        communityMap.set(m.community_id, {
          name: comm.name,
          slug: comm.slug,
        })
      }
    })

    // Format results
    const formattedResults = (results || []).map((r: SearchResult) => {
      const community = communityMap.get(r.community_id)
      return {
        type: r.content_type,
        id: r.content_id,
        title: r.title,
        subtitle: getSubtitle(r),
        image: r.metadata?.image_url || r.metadata?.avatar_url || null,
        href: getHref(r, community?.slug || r.community_id),
        communityId: r.community_id,
        communityName: communityIds.length > 1 ? community?.name : undefined,
        communitySlug: community?.slug || r.community_id,
        metadata: r.metadata,
        rank: r.rank,
      }
    })

    return NextResponse.json({ results: formattedResults })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Fallback search using ILIKE when RPC is not available
/* eslint-disable @typescript-eslint/no-explicit-any */
async function fallbackSearch(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  query: string,
  communityIds: string[],
  types: string[],
  limit: number,
  memberships: Membership[]
) {
  const searchTerm = `%${query.toLowerCase()}%`
  const results: any[] = []

  // Build community filter
  const communityFilter = communityIds.length === 1
    ? `community_id.eq.${communityIds[0]}`
    : `community_id.in.(${communityIds.join(',')})`

  // Build community lookup map
  const communityMap = new Map<string, { name: string; slug: string }>()
  memberships.forEach((m) => {
    const comm = getCommunity(m)
    if (comm) {
      communityMap.set(m.community_id, {
        name: comm.name,
        slug: comm.slug,
      })
    }
  })

  const perTypeLimit = Math.ceil(limit / types.length)

  // Search all types in parallel
  const [membersResult, itemsResult, eventsResult, newsResult, resourcesResult] = await Promise.all([
    types.includes('member')
      ? supabase
          .from('community_members')
          .select('id, display_name, avatar_url, role, community_id')
          .or(communityFilter)
          .eq('status', 'active')
          .or(`display_name.ilike.${searchTerm},bio.ilike.${searchTerm}`)
          .limit(perTypeLimit)
      : Promise.resolve({ data: null }),
    types.includes('item')
      ? supabase
          .from('items')
          .select('id, name, category, status, community_id')
          .or(communityFilter)
          .neq('status', 'unavailable')
          .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .limit(perTypeLimit)
      : Promise.resolve({ data: null }),
    types.includes('event')
      ? supabase
          .from('events')
          .select('id, title, starts_at, location, community_id')
          .or(communityFilter)
          .neq('status', 'draft')
          .neq('status', 'cancelled')
          .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},location.ilike.${searchTerm}`)
          .limit(perTypeLimit)
      : Promise.resolve({ data: null }),
    types.includes('news')
      ? supabase
          .from('news')
          .select('id, title, category, published_at, community_id')
          .or(communityFilter)
          .eq('status', 'published')
          .or(`title.ilike.${searchTerm},content.ilike.${searchTerm},excerpt.ilike.${searchTerm}`)
          .order('published_at', { ascending: false })
          .limit(perTypeLimit)
      : Promise.resolve({ data: null }),
    types.includes('resource')
      ? supabase
          .from('resources')
          .select('id, name, type, community_id')
          .or(communityFilter)
          .eq('status', 'active')
          .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .limit(perTypeLimit)
      : Promise.resolve({ data: null }),
  ])

  const members = membersResult.data
  const items = itemsResult.data
  const events = eventsResult.data
  const news = newsResult.data
  const resources = resourcesResult.data

  // Process members
  members?.forEach((m: any) => {
    const community = communityMap.get(m.community_id)
    results.push({
      type: 'member',
      id: m.id,
      title: m.display_name || 'Unknown',
      subtitle: m.role,
      image: m.avatar_url,
      href: `/c/${community?.slug || m.community_id}/members/${m.id}`,
      communityId: m.community_id,
      communityName: communityIds.length > 1 ? community?.name : undefined,
      communitySlug: community?.slug || m.community_id,
    })
  })

  // Process items
  items?.forEach((i: any) => {
    const community = communityMap.get(i.community_id)
    results.push({
      type: 'item',
      id: i.id,
      title: i.name,
      subtitle: `${i.category} • ${i.status}`,
      href: `/c/${community?.slug || i.community_id}/items/${i.id}`,
      communityId: i.community_id,
      communityName: communityIds.length > 1 ? community?.name : undefined,
      communitySlug: community?.slug || i.community_id,
    })
  })

  // Process events
  events?.forEach((e: any) => {
    const community = communityMap.get(e.community_id)
    const date = new Date(e.starts_at)
    results.push({
      type: 'event',
      id: e.id,
      title: e.title,
      subtitle: `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${e.location ? ` • ${e.location}` : ''}`,
      href: `/c/${community?.slug || e.community_id}/calendar/${e.id}`,
      communityId: e.community_id,
      communityName: communityIds.length > 1 ? community?.name : undefined,
      communitySlug: community?.slug || e.community_id,
    })
  })

  // Process news
  news?.forEach((n: any) => {
    const community = communityMap.get(n.community_id)
    results.push({
      type: 'news',
      id: n.id,
      title: n.title,
      subtitle: n.category,
      href: `/c/${community?.slug || n.community_id}/news/${n.id}`,
      communityId: n.community_id,
      communityName: communityIds.length > 1 ? community?.name : undefined,
      communitySlug: community?.slug || n.community_id,
    })
  })

  // Process resources
  resources?.forEach((r: any) => {
    const community = communityMap.get(r.community_id)
    results.push({
      type: 'resource',
      id: r.id,
      title: r.name,
      subtitle: r.type,
      href: `/c/${community?.slug || r.community_id}/resources/${r.id}`,
      communityId: r.community_id,
      communityName: communityIds.length > 1 ? community?.name : undefined,
      communitySlug: community?.slug || r.community_id,
    })
  })

  return NextResponse.json({ results: results.slice(0, limit) })
}

function getSubtitle(result: any): string {
  switch (result.content_type) {
    case 'member':
      return result.metadata?.role || 'Member'
    case 'item':
      return `${result.metadata?.category || 'Item'} • ${result.metadata?.status || 'available'}`
    case 'event':
      if (result.metadata?.starts_at) {
        const date = new Date(result.metadata.starts_at)
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        return result.metadata?.location ? `${dateStr} • ${result.metadata.location}` : dateStr
      }
      return result.metadata?.location || 'Event'
    case 'news':
      return result.metadata?.category || 'News'
    case 'resource':
      return result.metadata?.type || 'Resource'
    default:
      return ''
  }
}

function getHref(result: any, communitySlug: string): string {
  switch (result.content_type) {
    case 'member':
      return `/c/${communitySlug}/members/${result.content_id}`
    case 'item':
      return `/c/${communitySlug}/items/${result.content_id}`
    case 'event':
      return `/c/${communitySlug}/calendar/${result.content_id}`
    case 'news':
      return `/c/${communitySlug}/news/${result.content_id}`
    case 'resource':
      return `/c/${communitySlug}/resources/${result.content_id}`
    default:
      return `/c/${communitySlug}`
  }
}
