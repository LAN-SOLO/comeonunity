import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ communityId: string; eventId: string }>
}

// GET /api/communities/[communityId]/events/[eventId]/rsvp
// Get RSVPs for an event
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { communityId, eventId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check membership
    const { data: member } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this community' }, { status: 403 })
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')

    // Get RSVPs
    let query = supabase
      .from('event_rsvps')
      .select(`
        id,
        status,
        guests,
        note,
        responded_at,
        member:member_id (
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('event_id', eventId)
      .order('responded_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: rsvps, error } = await query

    if (error) {
      console.error('Failed to fetch RSVPs:', error)
      return NextResponse.json({ error: 'Failed to fetch RSVPs' }, { status: 500 })
    }

    // Get counts by status
    const counts = {
      going: rsvps?.filter((r) => r.status === 'going').length || 0,
      maybe: rsvps?.filter((r) => r.status === 'maybe').length || 0,
      not_going: rsvps?.filter((r) => r.status === 'not_going').length || 0,
    }

    // Get user's RSVP
    const userRsvp = rsvps?.find((r) => (r.member as any)?.id === member.id)

    return NextResponse.json({
      rsvps: rsvps || [],
      counts,
      userRsvp: userRsvp || null,
    })
  } catch (err) {
    console.error('RSVP API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/communities/[communityId]/events/[eventId]/rsvp
// Create or update RSVP
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { communityId, eventId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check membership
    const { data: member } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this community' }, { status: 403 })
    }

    // Get event to check if RSVP is allowed
    const { data: event } = await supabase
      .from('events')
      .select('rsvp_enabled, rsvp_deadline, max_attendees, status, ends_at')
      .eq('id', eventId)
      .eq('community_id', communityId)
      .single()

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if event is cancelled or past
    if (event.status === 'cancelled') {
      return NextResponse.json({ error: 'Event is cancelled' }, { status: 400 })
    }

    if (new Date(event.ends_at) < new Date()) {
      return NextResponse.json({ error: 'Event has ended' }, { status: 400 })
    }

    // Check if RSVP is enabled
    if (!event.rsvp_enabled) {
      return NextResponse.json({ error: 'RSVP is not enabled for this event' }, { status: 400 })
    }

    // Check RSVP deadline
    if (event.rsvp_deadline && new Date(event.rsvp_deadline) < new Date()) {
      return NextResponse.json({ error: 'RSVP deadline has passed' }, { status: 400 })
    }

    // Parse body
    const body = await request.json()
    const { status, guests, note } = body

    if (!status || !['going', 'maybe', 'not_going'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Check max attendees if going
    if (status === 'going' && event.max_attendees) {
      const { count: currentCount } = await supabase
        .from('event_rsvps')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('status', 'going')
        .neq('member_id', member.id)

      if ((currentCount || 0) >= event.max_attendees) {
        return NextResponse.json({ error: 'Event is full' }, { status: 400 })
      }
    }

    // Upsert RSVP
    const { data: rsvp, error } = await supabase
      .from('event_rsvps')
      .upsert({
        event_id: eventId,
        member_id: member.id,
        status,
        guests: guests || 0,
        note: note || null,
        responded_at: new Date().toISOString(),
      }, {
        onConflict: 'event_id,member_id',
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to save RSVP:', error)
      return NextResponse.json({ error: 'Failed to save RSVP' }, { status: 500 })
    }

    return NextResponse.json({ rsvp })
  } catch (err) {
    console.error('RSVP API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/communities/[communityId]/events/[eventId]/rsvp
// Remove RSVP
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { communityId, eventId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check membership
    const { data: member } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this community' }, { status: 403 })
    }

    // Delete RSVP
    const { error } = await supabase
      .from('event_rsvps')
      .delete()
      .eq('event_id', eventId)
      .eq('member_id', member.id)

    if (error) {
      console.error('Failed to delete RSVP:', error)
      return NextResponse.json({ error: 'Failed to delete RSVP' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('RSVP API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
