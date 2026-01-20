import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ communityId: string; inviteId: string }>
}

// DELETE /api/communities/[communityId]/invites/[inviteId]
// Delete an invite (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { communityId, inviteId } = await params
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

    if (!member || (member.role !== 'admin' && member.role !== 'moderator')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Delete invite
    const { error } = await supabase
      .from('invites')
      .delete()
      .eq('id', inviteId)
      .eq('community_id', communityId)

    if (error) {
      console.error('Failed to delete invite:', error)
      return NextResponse.json({ error: 'Failed to delete invite' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Invite API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
