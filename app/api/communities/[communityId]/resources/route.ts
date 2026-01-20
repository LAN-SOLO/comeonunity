import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ communityId: string }>
}

// GET /api/communities/[communityId]/resources
// List all resources in a community
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
    const { data: membership } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this community' }, { status: 403 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')
    const availableOnly = searchParams.get('available') === 'true'

    // Build query
    let query = supabase
      .from('resources')
      .select('*', { count: 'exact' })
      .eq('community_id', communityId)
      .order('name')

    if (type) {
      query = query.eq('type', type)
    }

    if (availableOnly) {
      query = query.eq('available', true)
    }

    const { data: resources, error, count } = await query

    if (error) {
      console.error('Failed to fetch resources:', error)
      return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 })
    }

    return NextResponse.json({
      resources: resources || [],
      total: count || 0,
    })
  } catch (err) {
    console.error('Resources API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/communities/[communityId]/resources
// Create a new resource (admin only)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { communityId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin status
    const { data: member } = await supabase
      .from('community_members')
      .select('id, role')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!member || member.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Parse body
    const body = await request.json()
    const {
      name,
      description,
      type,
      location,
      capacity,
      image_url,
      requires_approval,
      rules,
      min_booking_hours,
      max_booking_hours,
      advance_booking_days,
    } = body

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!type) {
      return NextResponse.json({ error: 'Type is required' }, { status: 400 })
    }

    // Create resource
    const { data: resource, error } = await supabase
      .from('resources')
      .insert({
        community_id: communityId,
        name: name.trim(),
        description: description?.trim() || null,
        type,
        location: location?.trim() || null,
        capacity: capacity || null,
        image_url: image_url || null,
        requires_approval: requires_approval ?? false,
        rules: rules?.trim() || null,
        min_booking_hours: min_booking_hours || 1,
        max_booking_hours: max_booking_hours || 4,
        advance_booking_days: advance_booking_days || 30,
        available: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create resource:', error)
      return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 })
    }

    return NextResponse.json({ resource }, { status: 201 })
  } catch (err) {
    console.error('Resources API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
