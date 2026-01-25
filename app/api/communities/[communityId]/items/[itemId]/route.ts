import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ communityId: string; itemId: string }>
}

// GET /api/communities/[communityId]/items/[itemId]
// Get a specific item
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { communityId, itemId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a member of this community
    const { data: membership } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this community' }, { status: 403 })
    }

    // Get item
    const { data: item, error } = await supabase
      .from('items')
      .select(`
        id,
        name,
        description,
        category,
        status,
        images,
        condition,
        pickup_notes,
        created_at,
        owner_id,
        owner:owner_id (
          id,
          user_id,
          display_name,
          avatar_url,
          unit_number,
          phone,
          show_phone,
          show_email
        )
      `)
      .eq('id', itemId)
      .eq('community_id', communityId)
      .single()

    if (error || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Define owner type
    type OwnerType = {
      id: string
      user_id: string
      display_name: string
      avatar_url: string | null
      unit_number: string | null
      phone: string | null
      show_phone: boolean
      show_email: boolean
    } | null

    // Transform Supabase array relation to single object
    const ownerData = Array.isArray(item.owner) ? item.owner[0] : item.owner

    // Check if viewing own item
    const isOwner = (ownerData as OwnerType)?.id === membership.id

    // Process owner contact info based on privacy settings
    const owner = ownerData as OwnerType
    const processedItem = {
      ...item,
      isOwner,
      owner: {
        ...owner,
        phone: owner?.show_phone || isOwner ? owner?.phone : undefined,
      },
    }

    return NextResponse.json({ item: processedItem })
  } catch (err) {
    console.error('Item API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/communities/[communityId]/items/[itemId]
// Update an item (owner only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { communityId, itemId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get member ID
    const { data: member } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this community' }, { status: 403 })
    }

    // Get existing item
    const { data: existingItem } = await supabase
      .from('items')
      .select('id, owner_id')
      .eq('id', itemId)
      .eq('community_id', communityId)
      .single()

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Verify ownership
    if (existingItem.owner_id !== member.id) {
      return NextResponse.json({ error: 'You can only edit your own items' }, { status: 403 })
    }

    // Parse body
    const body = await request.json()
    const allowedFields = [
      'name',
      'description',
      'category',
      'condition',
      'status',
      'pickup_notes',
      'images',
    ]

    // Filter to only allowed fields
    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Validate status
    if (updates.status && typeof updates.status === 'string' && !['available', 'borrowed', 'unavailable'].includes(updates.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Perform update
    const { data: updatedItem, error } = await supabase
      .from('items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single()

    if (error) {
      console.error('Failed to update item:', error)
      return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
    }

    return NextResponse.json({ item: updatedItem })
  } catch (err) {
    console.error('Item update API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/communities/[communityId]/items/[itemId]
// Delete an item (owner only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { communityId, itemId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get member ID
    const { data: member } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this community' }, { status: 403 })
    }

    // Get existing item
    const { data: existingItem } = await supabase
      .from('items')
      .select('id, owner_id')
      .eq('id', itemId)
      .eq('community_id', communityId)
      .single()

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Verify ownership
    if (existingItem.owner_id !== member.id) {
      return NextResponse.json({ error: 'You can only delete your own items' }, { status: 403 })
    }

    // Delete item
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId)

    if (error) {
      console.error('Failed to delete item:', error)
      return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Item delete API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
