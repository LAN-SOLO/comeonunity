import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createAuditLog } from '@/lib/security/audit'

interface RouteParams {
  params: Promise<{ userId: string }>
}

// PATCH /api/admin/users/[userId] - Update user role/status
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params
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

    // Don't allow modifying yourself
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot modify your own account' }, { status: 400 })
    }

    // Parse body
    const body = await request.json()
    const { action, role, reason } = body

    const adminClient = createAdminClient()

    // Get target user profile
    const { data: targetProfile } = await adminClient
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!targetProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only superadmin can modify admin accounts
    if (
      ['admin', 'superadmin'].includes(targetProfile.platform_role) &&
      adminProfile.platform_role !== 'superadmin'
    ) {
      return NextResponse.json({ error: 'Only superadmin can modify admin accounts' }, { status: 403 })
    }

    // Get user email for audit log
    const { data: authData } = await adminClient.auth.admin.getUserById(userId)
    const userEmail = authData?.user?.email || 'Unknown'

    const previousState = { ...targetProfile }
    const updates: Record<string, any> = {}

    if (action === 'suspend') {
      updates.status = 'suspended'
      updates.suspended_reason = reason || null
      updates.suspended_at = new Date().toISOString()

      // Create audit log
      await createAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'admin.user_suspend',
        resourceType: 'user',
        resourceId: userId,
        details: { target_email: userEmail, reason },
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
        action: 'admin.user_activate',
        resourceType: 'user',
        resourceId: userId,
        details: { target_email: userEmail },
        previousState: { status: previousState.status },
        newState: { status: 'active' },
        severity: 'info',
      })
    } else if (action === 'role') {
      if (!role || !['user', 'support', 'admin', 'superadmin'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      }

      // Only superadmin can promote to admin/superadmin
      if (['admin', 'superadmin'].includes(role) && adminProfile.platform_role !== 'superadmin') {
        return NextResponse.json({ error: 'Only superadmin can promote to admin' }, { status: 403 })
      }

      updates.platform_role = role

      // Create audit log
      await createAuditLog({
        userId: user.id,
        userEmail: user.email,
        action: 'admin.settings_update',
        resourceType: 'user',
        resourceId: userId,
        details: { target_email: userEmail, old_role: previousState.platform_role, new_role: role },
        previousState: { platform_role: previousState.platform_role },
        newState: { platform_role: role },
        severity: 'warning',
      })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Apply updates
    const { data: updatedProfile, error } = await adminClient
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Failed to update user:', error)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    return NextResponse.json({ user: updatedProfile })
  } catch (err) {
    console.error('Admin user update API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
