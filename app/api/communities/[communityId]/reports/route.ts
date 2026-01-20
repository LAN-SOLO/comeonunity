import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/security/audit'

interface RouteParams {
  params: Promise<{ communityId: string }>
}

// POST /api/communities/[communityId]/reports - Create a report
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { communityId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check membership
    const { data: member } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Must be a community member' }, { status: 403 })
    }

    // Parse body
    const body = await request.json()
    const { target_type, target_id, reason, description } = body

    // Validate required fields
    if (!target_type || !target_id || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: target_type, target_id, reason' },
        { status: 400 }
      )
    }

    // Validate target_type
    const validTargetTypes = ['member', 'item', 'news', 'comment', 'booking']
    if (!validTargetTypes.includes(target_type)) {
      return NextResponse.json({ error: 'Invalid target_type' }, { status: 400 })
    }

    // Validate reason
    const validReasons = ['spam', 'harassment', 'inappropriate', 'dangerous', 'other']
    if (!validReasons.includes(reason)) {
      return NextResponse.json({ error: 'Invalid reason' }, { status: 400 })
    }

    // Check if user already reported this target
    const { data: existingReport } = await supabase
      .from('moderation_reports')
      .select('id')
      .eq('community_id', communityId)
      .eq('reporter_id', member.id)
      .eq('target_type', target_type)
      .eq('target_id', target_id)
      .in('status', ['pending', 'reviewing'])
      .single()

    if (existingReport) {
      return NextResponse.json(
        { error: 'You have already reported this content' },
        { status: 400 }
      )
    }

    // Create report
    const { data: report, error } = await supabase
      .from('moderation_reports')
      .insert({
        community_id: communityId,
        reporter_id: member.id,
        target_type,
        target_id,
        reason,
        description: description?.trim() || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create report:', error)
      return NextResponse.json({ error: 'Failed to create report' }, { status: 500 })
    }

    // Create audit log
    await createAuditLog({
      userId: user.id,
      userEmail: user.email,
      communityId,
      action: 'report.create',
      resourceType: 'report',
      resourceId: report.id,
      details: {
        target_type,
        target_id,
        reason,
      },
    })

    return NextResponse.json({ report }, { status: 201 })
  } catch (err) {
    console.error('Create report API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
