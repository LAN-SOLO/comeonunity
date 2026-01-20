import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ communityId: string; memberId: string }>
}

// GET /api/communities/[communityId]/members/[memberId]
// Get a specific member's profile
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { communityId, memberId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a member of this community
    const { data: membership } = await supabase
      .from('community_members')
      .select('id, role')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this community' }, { status: 403 })
    }

    // Get member profile
    const { data: member, error } = await supabase
      .from('community_members')
      .select(`
        id,
        user_id,
        display_name,
        avatar_url,
        bio,
        unit_number,
        phone,
        show_phone,
        show_email,
        skills,
        skills_description,
        available_for_help,
        role,
        joined_at,
        last_active_at
      `)
      .eq('id', memberId)
      .eq('community_id', communityId)
      .eq('status', 'active')
      .single()

    if (error || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Check if viewing own profile
    const isOwnProfile = member.user_id === user.id

    // Process member to respect privacy settings
    const processedMember = {
      ...member,
      phone: member.show_phone || isOwnProfile ? member.phone : undefined,
      isOwnProfile,
    }

    return NextResponse.json({ member: processedMember })
  } catch (err) {
    console.error('Member API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/communities/[communityId]/members/[memberId]
// Update a member's profile (only own profile)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { communityId, memberId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get existing member to verify ownership
    const { data: existingMember } = await supabase
      .from('community_members')
      .select('id, user_id, role')
      .eq('id', memberId)
      .eq('community_id', communityId)
      .single()

    if (!existingMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Only allow editing own profile
    if (existingMember.user_id !== user.id) {
      return NextResponse.json({ error: 'You can only edit your own profile' }, { status: 403 })
    }

    // Parse and validate body
    const body = await request.json()
    const allowedFields = [
      'display_name',
      'bio',
      'unit_number',
      'phone',
      'show_phone',
      'show_email',
      'skills',
      'skills_description',
      'available_for_help',
      'avatar_url',
    ]

    // Filter to only allowed fields
    const updates: Record<string, any> = {}
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Validate skills array
    if (updates.skills && !Array.isArray(updates.skills)) {
      return NextResponse.json({ error: 'Skills must be an array' }, { status: 400 })
    }

    // Perform update
    const { data: updatedMember, error } = await supabase
      .from('community_members')
      .update(updates)
      .eq('id', memberId)
      .select()
      .single()

    if (error) {
      console.error('Failed to update member:', error)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ member: updatedMember })
  } catch (err) {
    console.error('Member update API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
