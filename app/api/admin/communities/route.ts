import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/communities - List communities with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check platform admin role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('platform_role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'superadmin'].includes(profile.platform_role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const plan = searchParams.get('plan') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Use admin client for queries
    const adminClient = createAdminClient()

    // Build query
    let query = adminClient
      .from('communities')
      .select(`
        id,
        name,
        slug,
        status,
        plan,
        suspended_reason,
        created_at
      `, { count: 'exact' })

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`)
    }

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    if (plan !== 'all') {
      query = query.eq('plan', plan)
    }

    // Exclude deleted communities
    query = query.neq('status', 'deleted')

    // Get communities with pagination
    const { data: communities, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Failed to fetch communities:', error)
      return NextResponse.json({ error: 'Failed to fetch communities' }, { status: 500 })
    }

    // Get member and item counts
    const communityIds = communities?.map(c => c.id) || []

    const [memberCounts, itemCounts] = await Promise.all([
      adminClient
        .from('community_members')
        .select('community_id')
        .in('community_id', communityIds)
        .eq('status', 'active'),
      adminClient
        .from('items')
        .select('community_id')
        .in('community_id', communityIds),
    ])

    // Create count maps
    const memberCountMap = new Map<string, number>()
    memberCounts.data?.forEach(m => {
      memberCountMap.set(m.community_id, (memberCountMap.get(m.community_id) || 0) + 1)
    })

    const itemCountMap = new Map<string, number>()
    itemCounts.data?.forEach(i => {
      itemCountMap.set(i.community_id, (itemCountMap.get(i.community_id) || 0) + 1)
    })

    // Merge data
    const enrichedCommunities = communities?.map(c => ({
      ...c,
      members_count: memberCountMap.get(c.id) || 0,
      items_count: itemCountMap.get(c.id) || 0,
    }))

    return NextResponse.json({
      communities: enrichedCommunities || [],
      total: count || 0,
      page,
      limit,
    })
  } catch (err) {
    console.error('Admin communities API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
