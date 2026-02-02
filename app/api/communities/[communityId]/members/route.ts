import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ communityId: string }>
}

// GET /api/communities/[communityId]/members
// List all members of a community
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { communityId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a member of this community
    const { data: membership } = await supabase
      .from('community_members')
      .select('id, role')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this community' }, { status: 403 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')
    const skills = searchParams.get('skills')?.split(',').filter(Boolean)
    const availableOnly = searchParams.get('available') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('community_members')
      .select(`
        id,
        display_name,
        avatar_url,
        bio,
        unit_number,
        email,
        phone,
        show_phone,
        show_email,
        skills,
        skills_description,
        available_for_help,
        role,
        joined_at,
        last_active_at
      `, { count: 'exact' })
      .eq('community_id', communityId)
      .eq('status', 'active')
      .order('display_name')
      .range(offset, offset + limit - 1)

    // Apply search filter
    if (search) {
      query = query.or(`display_name.ilike.%${search}%,bio.ilike.%${search}%,unit_number.ilike.%${search}%`)
    }

    // Apply availability filter
    if (availableOnly) {
      query = query.eq('available_for_help', true)
    }

    const { data: members, error, count } = await query

    if (error) {
      console.error('Failed to fetch members:', error)
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }

    // Filter by skills (done in JavaScript since Supabase array contains is limited)
    let filteredMembers = members || []
    if (skills && skills.length > 0) {
      filteredMembers = filteredMembers.filter((member) =>
        member.skills?.some((skill: string) => skills.includes(skill))
      )
    }

    // Process members to respect privacy settings
    const processedMembers = filteredMembers.map((member) => ({
      ...member,
      phone: member.show_phone ? member.phone : undefined,
      email: member.show_email ? member.email : undefined,
    }))

    return NextResponse.json({
      members: processedMembers,
      total: count || 0,
      limit,
      offset,
    })
  } catch (err) {
    console.error('Members API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
