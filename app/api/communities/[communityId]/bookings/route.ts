import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ communityId: string }>
}

// GET /api/communities/[communityId]/bookings
// List bookings for the current user
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { communityId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get member ID
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const resourceId = searchParams.get('resource_id')
    const itemId = searchParams.get('item_id')
    const status = searchParams.get('status')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const all = searchParams.get('all') === 'true' && member.role === 'admin'

    // Build query
    let query = supabase
      .from('bookings')
      .select(`
        id,
        start_time,
        end_time,
        status,
        message,
        created_at,
        resource:resource_id (
          id,
          name,
          type,
          location,
          image_url
        ),
        item:item_id (
          id,
          name,
          images
        ),
        member:borrower_id (
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('community_id', communityId)
      .order('start_time', { ascending: false })

    // Filter by borrower unless admin requesting all
    if (!all) {
      query = query.eq('borrower_id', member.id)
    }

    if (resourceId) {
      query = query.eq('resource_id', resourceId)
    }

    if (itemId) {
      query = query.eq('item_id', itemId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (startDate) {
      query = query.gte('start_time', startDate)
    }

    if (endDate) {
      query = query.lte('start_time', endDate)
    }

    const { data: bookings, error } = await query

    if (error) {
      console.error('Failed to fetch bookings:', error)
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }

    return NextResponse.json({ bookings: bookings || [] })
  } catch (err) {
    console.error('Bookings API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/communities/[communityId]/bookings
// Create a new booking
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { communityId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get member ID
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

    // Parse body
    const body = await request.json()
    const { resource_id, item_id, start_time, end_time, message } = body

    // Must have either resource_id or item_id
    if (!resource_id && !item_id) {
      return NextResponse.json({ error: 'Resource or item ID is required' }, { status: 400 })
    }

    if (!start_time || !end_time) {
      return NextResponse.json({ error: 'Start and end times are required' }, { status: 400 })
    }

    // Determine if approval is required
    let requiresApproval = false

    if (resource_id) {
      const { data: resource } = await supabase
        .from('resources')
        .select('requires_approval, available')
        .eq('id', resource_id)
        .single()

      if (!resource) {
        return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
      }

      if (!resource.available) {
        return NextResponse.json({ error: 'Resource is not available' }, { status: 400 })
      }

      requiresApproval = resource.requires_approval

      // Check for conflicts
      const { data: conflicts } = await supabase
        .from('bookings')
        .select('id')
        .eq('resource_id', resource_id)
        .in('status', ['pending', 'approved', 'active'])
        .or(`and(start_time.lt.${end_time},end_time.gt.${start_time})`)

      if (conflicts && conflicts.length > 0) {
        return NextResponse.json({ error: 'Time slot conflicts with existing booking' }, { status: 409 })
      }
    }

    if (item_id) {
      const { data: item } = await supabase
        .from('items')
        .select('status, owner_id')
        .eq('id', item_id)
        .single()

      if (!item) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }

      if (item.status !== 'available') {
        return NextResponse.json({ error: 'Item is not available' }, { status: 400 })
      }

      if (item.owner_id === member.id) {
        return NextResponse.json({ error: 'Cannot borrow your own item' }, { status: 400 })
      }

      requiresApproval = true // Item borrowing always requires owner approval
    }

    // Create booking
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        community_id: communityId,
        borrower_id: member.id,
        resource_id: resource_id || null,
        item_id: item_id || null,
        start_time,
        end_time,
        status: requiresApproval ? 'pending' : 'approved',
        message: message?.trim() || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create booking:', error)
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
    }

    // Re-check for conflicts after insert to prevent race condition double-booking
    if (resource_id) {
      const { data: overlapping } = await supabase
        .from('bookings')
        .select('id')
        .eq('resource_id', resource_id)
        .in('status', ['pending', 'approved', 'active'])
        .or(`and(start_time.lt.${end_time},end_time.gt.${start_time})`)

      if (overlapping && overlapping.length > 1) {
        // Conflict detected - rollback
        await supabase.from('bookings').delete().eq('id', booking.id)
        return NextResponse.json({ error: 'Time slot conflicts with existing booking' }, { status: 409 })
      }
    }

    return NextResponse.json({ booking }, { status: 201 })
  } catch (err) {
    console.error('Bookings API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
