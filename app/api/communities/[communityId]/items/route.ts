import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ communityId: string }>
}

// GET /api/communities/[communityId]/items
// List all items in a community
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
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const ownerId = searchParams.get('owner')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('items')
      .select(`
        id,
        name,
        description,
        category,
        status,
        images,
        condition,
        created_at,
        owner_id,
        owner:owner_id (
          id,
          display_name,
          avatar_url,
          unit_number
        )
      `, { count: 'exact' })
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (ownerId) {
      query = query.eq('owner_id', ownerId)
    }

    const { data: items, error, count } = await query

    if (error) {
      console.error('Failed to fetch items:', error)
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }

    return NextResponse.json({
      items: items || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (err) {
    console.error('Items API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/communities/[communityId]/items
// Create a new item
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
    const { name, description, category, condition, pickup_notes, images } = body

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!category) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 })
    }

    // Create item
    const { data: item, error } = await supabase
      .from('items')
      .insert({
        community_id: communityId,
        owner_id: member.id,
        name: name.trim(),
        description: description?.trim() || null,
        category,
        condition: condition || 'good',
        pickup_notes: pickup_notes?.trim() || null,
        images: images || null,
        status: 'available',
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create item:', error)
      return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
    }

    return NextResponse.json({ item }, { status: 201 })
  } catch (err) {
    console.error('Items API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
