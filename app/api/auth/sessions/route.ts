import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limit'
import { createAuditLog } from '@/lib/security/audit'

// GET - List user's active sessions
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get user's sessions from our tracking table
    const { data: sessions, error } = await adminClient
      .from('user_sessions')
      .select('*')
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('last_active_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch sessions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      )
    }

    // Format sessions for response
    const formattedSessions = sessions?.map((session) => ({
      id: session.id,
      deviceInfo: session.device_info,
      ipAddress: session.ip_address,
      location: session.location,
      createdAt: session.created_at,
      lastActiveAt: session.last_active_at,
      isCurrent: false, // Will be set on client based on session token
    })) || []

    return NextResponse.json({ sessions: formattedSessions })
  } catch (error) {
    console.error('Sessions GET error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// DELETE - Revoke a specific session
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit
    const ip = getClientIp(request)
    const { success } = await checkRateLimit('api', `session_revoke:${user.id}:${ip}`)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      )
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('id')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Verify session belongs to user
    const { data: session } = await adminClient
      .from('user_sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Revoke session
    const { error } = await adminClient
      .from('user_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', sessionId)

    if (error) {
      console.error('Failed to revoke session:', error)
      return NextResponse.json(
        { error: 'Failed to revoke session' },
        { status: 500 }
      )
    }

    // Audit log
    await createAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'auth.logout',
      resourceType: 'session',
      resourceId: sessionId,
      details: { method: 'manual_revoke' },
      severity: 'info',
    })

    return NextResponse.json({
      success: true,
      message: 'Session revoked successfully',
    })
  } catch (error) {
    console.error('Session DELETE error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// POST - Revoke all sessions except current
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit
    const ip = getClientIp(request)
    const { success } = await checkRateLimit('strict', `session_revoke_all:${user.id}:${ip}`)
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { action, excludeSessionId } = body

    if (action !== 'revoke_all') {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Build query to revoke all sessions
    let query = adminClient
      .from('user_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('revoked_at', null)

    // Optionally exclude current session
    if (excludeSessionId) {
      query = query.neq('id', excludeSessionId)
    }

    const { error, count } = await query

    if (error) {
      console.error('Failed to revoke sessions:', error)
      return NextResponse.json(
        { error: 'Failed to revoke sessions' },
        { status: 500 }
      )
    }

    // Audit log
    await createAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'auth.logout',
      resourceType: 'session',
      details: {
        method: 'revoke_all',
        count,
        excludedCurrent: !!excludeSessionId,
      },
      severity: 'warning',
    })

    return NextResponse.json({
      success: true,
      message: `${count || 0} session(s) revoked successfully`,
      revokedCount: count || 0,
    })
  } catch (error) {
    console.error('Session revoke all error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
