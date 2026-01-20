import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ communityId: string }>
}

// GET /api/communities/[communityId]/invites
// List invites (admin only)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { communityId } = await params
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

    // Get invites
    const { data: invites, error } = await supabase
      .from('invites')
      .select(`
        id,
        code,
        email,
        max_uses,
        uses,
        expires_at,
        created_at,
        created_by:created_by (
          display_name
        )
      `)
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch invites:', error)
      return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 })
    }

    return NextResponse.json({ invites: invites || [] })
  } catch (err) {
    console.error('Invites API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/communities/[communityId]/invites
// Create an invite (admin only)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { communityId } = await params
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

    // Parse body
    const body = await request.json()
    const { code, email, max_uses, expires_at } = body

    // Generate code if not provided
    const inviteCode = code || generateCode()

    // Create invite
    const { data: invite, error } = await supabase
      .from('invites')
      .insert({
        community_id: communityId,
        code: inviteCode,
        email: email || null,
        max_uses: max_uses || 1,
        expires_at: expires_at || null,
        created_by: member.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create invite:', error)
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
    }

    return NextResponse.json({ invite }, { status: 201 })
  } catch (err) {
    console.error('Invites API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
