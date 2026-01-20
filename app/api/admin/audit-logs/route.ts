import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/audit-logs - Platform-wide audit logs
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check platform admin role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('platform_role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'superadmin'].includes(profile.platform_role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const actionType = searchParams.get('actionType') || 'all'
    const resourceType = searchParams.get('resourceType') || 'all'
    const severity = searchParams.get('severity') || 'all'
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Use admin client for platform-wide queries
    const adminClient = createAdminClient()

    // Build query
    let query = adminClient
      .from('audit_logs')
      .select('*', { count: 'exact' })

    // Apply filters
    if (search) {
      query = query.or(
        `user_email.ilike.%${search}%,action.ilike.%${search}%,details->>'reason'.ilike.%${search}%`
      )
    }

    if (actionType !== 'all') {
      query = query.ilike('action', `${actionType}.%`)
    }

    if (resourceType !== 'all') {
      query = query.eq('resource_type', resourceType)
    }

    if (severity !== 'all') {
      query = query.eq('severity', severity)
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    // Get logs with pagination
    const { data: logs, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Failed to fetch audit logs:', error)
      return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
    }

    return NextResponse.json({
      logs: logs || [],
      total: count || 0,
      page,
      limit,
    })
  } catch (err) {
    console.error('Admin audit logs API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
