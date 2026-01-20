import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ communityId: string; eventId: string }>
}

// GET /api/communities/[communityId]/events/[eventId]
// Get a single event
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
      .select('id, role')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this community' }, { status: 403 })
    }

    const isAdmin = member.role === 'admin' || member.role === 'moderator'

    // Get event
    const { data: event, error } = await supabase
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
        rsvp_deadline,
        status,
        cancelled_reason,
        created_at,
        updated_at,
        organizer:organizer_id (
          id,
          display_name,
          avatar_url,
          role
        )
      `)
      .eq('id', eventId)
      .eq('community_id', communityId)
      .single()

    if (error || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if user can view this event
    if (event.status === 'draft' && !isAdmin) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json({ event })
  } catch (err) {
    console.error('Event API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/communities/[communityId]/events/[eventId]
// Update an event
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { communityId, eventId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin/moderator status or event organizer
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

    // Get current event
    const { data: existingEvent } = await supabase
      .from('events')
      .select('organizer_id')
      .eq('id', eventId)
      .eq('community_id', communityId)
      .single()

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const isAdmin = member.role === 'admin' || member.role === 'moderator'
    const isOrganizer = existingEvent.organizer_id === member.id

    if (!isAdmin && !isOrganizer) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Parse body
    const body = await request.json()

    // Build update object
    const updates: Record<string, any> = {}
    const allowedFields = [
      'title',
      'description',
      'location',
      'starts_at',
      'ends_at',
      'all_day',
      'type',
      'color',
      'cover_image_url',
      'max_attendees',
      'rsvp_enabled',
      'rsvp_deadline',
      'status',
      'cancelled_reason',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    // Update event
    const { data: event, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', eventId)
      .eq('community_id', communityId)
      .select()
      .single()

    if (error) {
      console.error('Failed to update event:', error)
      return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
    }

    return NextResponse.json({ event })
  } catch (err) {
    console.error('Event API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/communities/[communityId]/events/[eventId]
// Delete an event
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { communityId, eventId } = await params
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

    // Delete event
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('community_id', communityId)

    if (error) {
      console.error('Failed to delete event:', error)
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Event API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
