import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ communityId: string }>
}

// GET /api/communities/[communityId]/admin/reports
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    if (!member || !['admin', 'moderator'].includes(member.role)) {
      return NextResponse.json({ error: 'Moderator access required' }, { status: 403 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const countsOnly = searchParams.get('counts') === 'true'
    const status = searchParams.get('status') || 'pending'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // If just getting counts
    if (countsOnly) {
      const [pending, reviewing, resolved, dismissed] = await Promise.all([
        supabase
          .from('moderation_reports')
          .select('id', { count: 'exact', head: true })
          .eq('community_id', communityId)
          .eq('status', 'pending'),
        supabase
          .from('moderation_reports')
          .select('id', { count: 'exact', head: true })
          .eq('community_id', communityId)
          .eq('status', 'reviewing'),
        supabase
          .from('moderation_reports')
          .select('id', { count: 'exact', head: true })
          .eq('community_id', communityId)
          .eq('status', 'resolved'),
        supabase
          .from('moderation_reports')
          .select('id', { count: 'exact', head: true })
          .eq('community_id', communityId)
          .eq('status', 'dismissed'),
      ])

      return NextResponse.json({
        counts: {
          pending: pending.count || 0,
          reviewing: reviewing.count || 0,
          resolved: resolved.count || 0,
          dismissed: dismissed.count || 0,
        },
      })
    }

    // Get reports with pagination
    const { data: reports, count, error } = await supabase
      .from('moderation_reports')
      .select(
        `
        *,
        reporter:reporter_id(display_name, avatar_url),
        resolver:resolved_by(display_name)
      `,
        { count: 'exact' }
      )
      .eq('community_id', communityId)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Failed to fetch reports:', error)
      return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
    }

    return NextResponse.json({
      reports: reports || [],
      total: count || 0,
      page,
      limit,
    })
  } catch (err) {
    console.error('Reports API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
