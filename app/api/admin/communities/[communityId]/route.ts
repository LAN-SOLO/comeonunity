import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createAuditLog } from '@/lib/security/audit'

interface RouteParams {
  params: Promise<{ communityId: string }>
}

// PATCH /api/admin/communities/[communityId] - Suspend/activate community
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { communityId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check platform admin role
    const { data: adminProfile } = await supabase
      .from('user_profiles')
      .select('platform_role')
      .eq('id', user.id)
      .single()

    if (!adminProfile || !['admin', 'superadmin'].includes(adminProfile.platform_role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Parse body
    const body = await request.json()
    const { action, reason } = body

    const adminClient = createAdminClient()

    // Get target community
    const { data: community } = await adminClient
      .from('communities')
      .select('*')
      .eq('id', communityId)
      .single()

    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 })
    }

    const previousState = { ...community }
    const updates: Record<string, string | null> = {}

    if (action === 'suspend') {
      updates.status = 'suspended'
      updates.suspended_reason = reason || null
      updates.suspended_at = new Date().toISOString()

      // Create audit log
      await createAuditLog({
        userId: user.id,
        userEmail: user.email,
        communityId,
        action: 'admin.community_suspend',
        resourceType: 'community',
        resourceId: communityId,
        details: { community_name: community.name, reason },
        previousState: { status: previousState.status },
        newState: { status: 'suspended' },
        severity: 'warning',
      })
    } else if (action === 'activate') {
      updates.status = 'active'
      updates.suspended_reason = null
      updates.suspended_at = null

      // Create audit log
      await createAuditLog({
        userId: user.id,
        userEmail: user.email,
        communityId,
        action: 'community.update',
        resourceType: 'community',
        resourceId: communityId,
        details: { community_name: community.name, action: 'activated' },
        previousState: { status: previousState.status },
        newState: { status: 'active' },
        severity: 'info',
      })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Apply updates
    const { data: updatedCommunity, error } = await adminClient
      .from('communities')
      .update(updates)
      .eq('id', communityId)
      .select()
      .single()

    if (error) {
      console.error('Failed to update community:', error)
      return NextResponse.json({ error: 'Failed to update community' }, { status: 500 })
    }

    return NextResponse.json({ community: updatedCommunity })
  } catch (err) {
    console.error('Admin community update API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
