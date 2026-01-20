import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ communityId: string }>
}

// GET /api/communities/[communityId]/notifications
// List notifications for the current user
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
      .select('id')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this community' }, { status: 403 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const unreadOnly = searchParams.get('unread') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('notifications')
      .select(`
        id,
        type,
        title,
        message,
        read,
        created_at,
        data
      `, { count: 'exact' })
      .eq('user_id', member.id)
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (unreadOnly) {
      query = query.eq('read', false)
    }

    const { data: notifications, error, count } = await query

    if (error) {
      console.error('Failed to fetch notifications:', error)
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    return NextResponse.json({
      notifications: notifications || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (err) {
    console.error('Notifications API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/communities/[communityId]/notifications
// Create a notification (internal use / admin)
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
    const { user_id, type, title, message, data } = body

    // Validate required fields
    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Create notification
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        community_id: communityId,
        user_id,
        type: type || 'default',
        title: title.trim(),
        message: message?.trim() || '',
        data: data || {},
        read: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create notification:', error)
      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
    }

    return NextResponse.json({ notification }, { status: 201 })
  } catch (err) {
    console.error('Notifications API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/communities/[communityId]/notifications
// Mark all notifications as read
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    // Mark all as read
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', member.id)
      .eq('community_id', communityId)
      .eq('read', false)

    if (error) {
      console.error('Failed to mark notifications as read:', error)
      return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Notifications API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/communities/[communityId]/notifications
// Delete all read notifications
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Delete all read notifications
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', member.id)
      .eq('community_id', communityId)
      .eq('read', true)

    if (error) {
      console.error('Failed to delete notifications:', error)
      return NextResponse.json({ error: 'Failed to delete notifications' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Notifications API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
