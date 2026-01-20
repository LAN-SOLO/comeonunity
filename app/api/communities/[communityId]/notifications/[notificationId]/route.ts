import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ communityId: string; notificationId: string }>
}

// PATCH /api/communities/[communityId]/notifications/[notificationId]
// Mark a single notification as read
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { communityId, notificationId } = await params
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

    // Verify notification belongs to this user
    const { data: notification } = await supabase
      .from('notifications')
      .select('id')
      .eq('id', notificationId)
      .eq('user_id', member.id)
      .eq('community_id', communityId)
      .single()

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    // Mark as read
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)

    if (error) {
      console.error('Failed to mark notification as read:', error)
      return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Notification API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/communities/[communityId]/notifications/[notificationId]
// Delete a single notification
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { communityId, notificationId } = await params
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

    // Verify notification belongs to this user and delete
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', member.id)
      .eq('community_id', communityId)

    if (error) {
      console.error('Failed to delete notification:', error)
      return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Notification API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
