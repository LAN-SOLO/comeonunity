import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/users - List users with filters
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
    const role = searchParams.get('role') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Use admin client for cross-user queries
    const adminClient = createAdminClient()

    // Build query
    let query = adminClient
      .from('user_profiles')
      .select(`
        id,
        platform_role,
        status,
        suspended_reason,
        created_at
      `, { count: 'exact' })

    // Apply filters
    if (search) {
      // We need to join with auth.users to search by email
      // For now, filter by ID prefix (limited functionality)
      query = query.ilike('id', `${search}%`)
    }

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    if (role !== 'all') {
      query = query.eq('platform_role', role)
    }

    // Get profiles with pagination
    const { data: profiles, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Failed to fetch users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Get auth user data and community counts
    const userIds = profiles?.map(p => p.id) || []

    // Get user emails from auth.users via admin API
    const { data: authUsers } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000, // This is a limitation, but works for smaller user bases
    })

    // Create email lookup map
    const emailMap = new Map<string, { email: string; last_sign_in_at: string | null }>()
    authUsers?.users?.forEach(u => {
      emailMap.set(u.id, { email: u.email || '', last_sign_in_at: u.last_sign_in_at || null })
    })

    // Get community membership counts
    const { data: memberCounts } = await adminClient
      .from('community_members')
      .select('user_id')
      .in('user_id', userIds)
      .eq('status', 'active')

    const countMap = new Map<string, number>()
    memberCounts?.forEach(m => {
      countMap.set(m.user_id, (countMap.get(m.user_id) || 0) + 1)
    })

    // Merge data
    const users = profiles?.map(p => ({
      id: p.id,
      email: emailMap.get(p.id)?.email || 'Unknown',
      platform_role: p.platform_role,
      status: p.status,
      suspended_reason: p.suspended_reason,
      created_at: p.created_at,
      last_sign_in_at: emailMap.get(p.id)?.last_sign_in_at,
      communities_count: countMap.get(p.id) || 0,
    }))

    // If searching by email, filter the results
    const filteredUsers = search
      ? users?.filter(u => u.email.toLowerCase().includes(search.toLowerCase()))
      : users

    return NextResponse.json({
      users: filteredUsers || [],
      total: count || 0,
      page,
      limit,
    })
  } catch (err) {
    console.error('Admin users API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
