import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ communityId: string; memberId: string }>
}

// PATCH /api/communities/[communityId]/admin/members/[memberId]
// Update member role/status (admin only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { communityId, memberId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin status
    const { data: adminMember } = await supabase
      .from('community_members')
      .select('id, role')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!adminMember || adminMember.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Don't allow modifying yourself
    if (adminMember.id === memberId) {
      return NextResponse.json({ error: 'Cannot modify your own account' }, { status: 400 })
    }

    // Get target member
    const { data: targetMember } = await supabase
      .from('community_members')
      .select('id, role')
      .eq('id', memberId)
      .eq('community_id', communityId)
      .single()

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Parse body
    const body = await request.json()
    const { role, status, suspended_reason } = body

    // Build update object
    const updates: Record<string, string | null> = {}

    if (role !== undefined) {
      if (!['admin', 'moderator', 'member'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      }
      updates.role = role
    }

    if (status !== undefined) {
      if (!['active', 'suspended', 'inactive'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updates.status = status

      if (status === 'suspended') {
        updates.suspended_at = new Date().toISOString()
        updates.suspended_by = adminMember.id
        updates.suspended_reason = suspended_reason || null
      } else if (status === 'active') {
        updates.suspended_at = null
        updates.suspended_by = null
        updates.suspended_reason = null
      }
    }

    // Update member
    const { data: updatedMember, error } = await supabase
      .from('community_members')
      .update(updates)
      .eq('id', memberId)
      .eq('community_id', communityId)
      .select()
      .single()

    if (error) {
      console.error('Failed to update member:', error)
      return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
    }

    return NextResponse.json({ member: updatedMember })
  } catch (err) {
    console.error('Admin members API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/communities/[communityId]/admin/members/[memberId]
// Remove member from community (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { communityId, memberId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin status
    const { data: adminMember } = await supabase
      .from('community_members')
      .select('id, role')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!adminMember || adminMember.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Don't allow removing yourself
    if (adminMember.id === memberId) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })
    }

    // Delete member
    const { error } = await supabase
      .from('community_members')
      .delete()
      .eq('id', memberId)
      .eq('community_id', communityId)

    if (error) {
      console.error('Failed to remove member:', error)
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Admin members API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
