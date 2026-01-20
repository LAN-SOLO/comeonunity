import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ communityId: string }>
}

// GET /api/communities/[communityId]/events
// List events
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { communityId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check membership
    const { data: member } = await supabase
      .from('community_members')
      .select('id, role')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this community' }, { status: 403 })
    }

    const isAdmin = member.role === 'admin' || member.role === 'moderator'

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('events')
      .select(`
        id,
        title,
        description,
        location,
        starts_at,
        ends_at,
        all_day,
        type,
        color,
        cover_image_url,
        max_attendees,
        rsvp_enabled,
        status,
        organizer:organizer_id (
          id,
          display_name,
          avatar_url
        )
      `, { count: 'exact' })
      .eq('community_id', communityId)
      .order('starts_at', { ascending: true })
      .range(offset, offset + limit - 1)

    // Non-admins can only see published events
    if (!isAdmin) {
      query = query.neq('status', 'draft')
    } else if (status) {
      query = query.eq('status', status)
    }

    // Filter by date range
    if (from) {
      query = query.gte('ends_at', from)
    }
    if (to) {
      query = query.lte('starts_at', to)
    }

    // Filter by type
    if (type) {
      query = query.eq('type', type)
    }

    const { data: events, error, count } = await query

    if (error) {
      console.error('Failed to fetch events:', error)
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    return NextResponse.json({
      events: events || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (err) {
    console.error('Events API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/communities/[communityId]/events
// Create an event (admin/moderator only)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { communityId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin/moderator status
    const { data: member } = await supabase
      .from('community_members')
      .select('id, role')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!member || (member.role !== 'admin' && member.role !== 'moderator')) {
      return NextResponse.json({ error: 'Admin or moderator access required' }, { status: 403 })
    }

    // Parse body
    const body = await request.json()
    const {
      title,
      description,
      location,
      starts_at,
      ends_at,
      all_day,
      type,
      color,
      cover_image_url,
      max_attendees,
      rsvp_enabled,
      rsvp_deadline,
      status: eventStatus,
    } = body

    // Validate required fields
    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!starts_at) {
      return NextResponse.json({ error: 'Start date is required' }, { status: 400 })
    }

    if (!ends_at) {
      return NextResponse.json({ error: 'End date is required' }, { status: 400 })
    }

    // Create event
    const { data: event, error } = await supabase
      .from('events')
      .insert({
        community_id: communityId,
        organizer_id: member.id,
        title: title.trim(),
        description: description?.trim() || null,
        location: location?.trim() || null,
        starts_at,
        ends_at,
        all_day: all_day ?? false,
        type: type || 'event',
        color: color || '#3B82F6',
        cover_image_url: cover_image_url || null,
        max_attendees: max_attendees || null,
        rsvp_enabled: rsvp_enabled ?? true,
        rsvp_deadline: rsvp_deadline || null,
        status: eventStatus || 'scheduled',
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create event:', error)
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
    }

    return NextResponse.json({ event }, { status: 201 })
  } catch (err) {
    console.error('Events API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
