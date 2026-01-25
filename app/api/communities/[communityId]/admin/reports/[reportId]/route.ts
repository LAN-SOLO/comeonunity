import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/security/audit'

interface RouteParams {
  params: Promise<{ communityId: string; reportId: string }>
}

// PATCH /api/communities/[communityId]/admin/reports/[reportId]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { communityId, reportId } = await params
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

    if (!member || !['admin', 'moderator'].includes(member.role)) {
      return NextResponse.json({ error: 'Moderator access required' }, { status: 403 })
    }

    // Parse body
    const body = await request.json()
    const { action, notes } = body

    // Get report
    const { data: report } = await supabase
      .from('moderation_reports')
      .select('*')
      .eq('id', reportId)
      .eq('community_id', communityId)
      .single()

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const updates: Record<string, string | null> = {}

    if (action === 'review') {
      if (report.status !== 'pending') {
        return NextResponse.json({ error: 'Report is not pending' }, { status: 400 })
      }
      updates.status = 'reviewing'
    } else if (action === 'resolve') {
      if (!['pending', 'reviewing'].includes(report.status)) {
        return NextResponse.json({ error: 'Report cannot be resolved' }, { status: 400 })
      }
      if (!notes?.trim()) {
        return NextResponse.json({ error: 'Resolution notes required' }, { status: 400 })
      }
      updates.status = 'resolved'
      updates.resolved_by = member.id
      updates.resolution_notes = notes.trim()
      updates.resolved_at = new Date().toISOString()

      // Create audit log
      await createAuditLog({
        userId: user.id,
        userEmail: user.email,
        communityId,
        action: 'report.resolve',
        resourceType: 'report',
        resourceId: reportId,
        details: {
          target_type: report.target_type,
          target_id: report.target_id,
          reason: report.reason,
          resolution: 'resolved',
        },
        previousState: { status: report.status },
        newState: { status: 'resolved' },
      })
    } else if (action === 'dismiss') {
      if (!['pending', 'reviewing'].includes(report.status)) {
        return NextResponse.json({ error: 'Report cannot be dismissed' }, { status: 400 })
      }
      updates.status = 'dismissed'
      updates.resolved_by = member.id
      updates.resolution_notes = notes?.trim() || null
      updates.resolved_at = new Date().toISOString()

      // Create audit log
      await createAuditLog({
        userId: user.id,
        userEmail: user.email,
        communityId,
        action: 'report.resolve',
        resourceType: 'report',
        resourceId: reportId,
        details: {
          target_type: report.target_type,
          target_id: report.target_id,
          reason: report.reason,
          resolution: 'dismissed',
        },
        previousState: { status: report.status },
        newState: { status: 'dismissed' },
      })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Update report
    const { data: updatedReport, error } = await supabase
      .from('moderation_reports')
      .update(updates)
      .eq('id', reportId)
      .select()
      .single()

    if (error) {
      console.error('Failed to update report:', error)
      return NextResponse.json({ error: 'Failed to update report' }, { status: 500 })
    }

    return NextResponse.json({ report: updatedReport })
  } catch (err) {
    console.error('Report update API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
