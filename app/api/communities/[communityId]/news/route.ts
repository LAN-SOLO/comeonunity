import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ communityId: string }>
}

// GET /api/communities/[communityId]/news
// List news articles
export async function GET(request: NextRequest, { params }: RouteParams) {
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
      .select('id, role')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this community' }, { status: 403 })
    }

    const isAdmin = member.role === 'admin' || member.role === 'moderator'

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('news')
      .select(`
        id,
        title,
        excerpt,
        category,
        image_url,
        pinned,
        status,
        published_at,
        created_at,
        author:author_id (
          id,
          display_name,
          avatar_url
        )
      `, { count: 'exact' })
      .eq('community_id', communityId)
      .order('pinned', { ascending: false })
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Non-admins can only see published articles
    if (!isAdmin) {
      query = query
        .eq('status', 'published')
        .lte('published_at', new Date().toISOString())
    } else if (status) {
      query = query.eq('status', status)
    }

    if (category) {
      query = query.eq('category', category)
    }

    const { data: articles, error, count } = await query

    if (error) {
      console.error('Failed to fetch news:', error)
      return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 })
    }

    return NextResponse.json({
      articles: articles || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (err) {
    console.error('News API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/communities/[communityId]/news
// Create a news article (admin/moderator only)
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    if (!member || (member.role !== 'admin' && member.role !== 'moderator')) {
      return NextResponse.json({ error: 'Admin or moderator access required' }, { status: 403 })
    }

    // Parse body
    const body = await request.json()
    const { title, excerpt, content, category, image_url, pinned, status: articleStatus } = body

    // Validate required fields
    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Create article
    const { data: article, error } = await supabase
      .from('news')
      .insert({
        community_id: communityId,
        author_id: member.id,
        title: title.trim(),
        excerpt: excerpt?.trim() || content.trim().slice(0, 200),
        content: content.trim(),
        category: category || 'announcement',
        image_url: image_url || null,
        pinned: pinned ?? false,
        status: articleStatus || 'draft',
        published_at: articleStatus === 'published' ? new Date().toISOString() : null,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create news:', error)
      return NextResponse.json({ error: 'Failed to create news' }, { status: 500 })
    }

    return NextResponse.json({ article }, { status: 201 })
  } catch (err) {
    console.error('News API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
