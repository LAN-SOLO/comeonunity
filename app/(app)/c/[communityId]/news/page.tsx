'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NewsCard, categoryLabels } from '@/components/news/news-card'
import {
  Search,
  Newspaper,
  Loader2,
  Plus,
} from 'lucide-react'

interface Article {
  id: string
  title: string
  excerpt: string | null
  category: string
  image_url: string | null
  pinned: boolean
  published_at: string
  author: {
    id: string
    display_name: string | null
    avatar_url: string | null
  } | null
}

export default function NewsPage() {
  const params = useParams()
  const communitySlug = params.communityId as string

  const [communityId, setCommunityId] = useState<string | null>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isAdmin, setIsAdmin] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    initializePage()
  }, [communitySlug])

  const initializePage = async () => {
    setIsLoading(true)
    try {
      // Check if the value looks like a UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(communitySlug)

      // First, resolve the community by slug or id
      let communityQuery = supabase
        .from('communities')
        .select('id, slug')
        .eq('status', 'active')

      if (isUUID) {
        communityQuery = communityQuery.or(`slug.eq.${communitySlug},id.eq.${communitySlug}`)
      } else {
        communityQuery = communityQuery.eq('slug', communitySlug)
      }

      const { data: community, error: communityError } = await communityQuery.single()

      if (communityError || !community) {
        setIsLoading(false)
        return
      }

      setCommunityId(community.id)

      // Fetch articles and check admin status in parallel
      await Promise.all([
        fetchArticles(community.id),
        checkAdminStatus(community.id),
      ])
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false)
    }
  }

  const fetchArticles = async (cId: string) => {
    try {
      const { data, error } = await supabase
        .from('news')
        .select(`
          id,
          title,
          excerpt,
          category,
          image_url,
          pinned,
          published_at,
          author:author_id (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('community_id', cId)
        .eq('status', 'published')
        .lte('published_at', new Date().toISOString())
        .order('pinned', { ascending: false })
        .order('published_at', { ascending: false })

      if (error) {
        // Silently fail - table may not exist yet
        return
      }

      // Handle Supabase's array format for relations
      const processedArticles = (data || []).map((article) => ({
        id: article.id,
        title: article.title,
        excerpt: article.excerpt,
        category: article.category,
        image_url: article.image_url,
        pinned: article.pinned,
        published_at: article.published_at,
        author: Array.isArray(article.author) ? article.author[0] || null : article.author as Article['author'],
      }))

      setArticles(processedArticles)
    } catch {
      // Silently fail - news not set up yet
    }
  }

  const checkAdminStatus = async (cId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: member } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', cId)
      .eq('user_id', user.id)
      .single()

    setIsAdmin(member?.role === 'admin' || member?.role === 'moderator')
  }

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(articles.map((a) => a.category))
    return Array.from(cats).sort()
  }, [articles])

  // Filter articles
  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const titleMatch = article.title.toLowerCase().includes(query)
        const excerptMatch = article.excerpt?.toLowerCase().includes(query)
        if (!titleMatch && !excerptMatch) {
          return false
        }
      }

      // Category filter
      if (selectedCategory !== 'all' && article.category !== selectedCategory) {
        return false
      }

      return true
    })
  }, [articles, searchQuery, selectedCategory])

  // Separate pinned and regular articles
  const pinnedArticles = filteredArticles.filter((a) => a.pinned)
  const regularArticles = filteredArticles.filter((a) => !a.pinned)

  // Get featured article (first pinned or most recent)
  const featuredArticle = pinnedArticles[0] || regularArticles[0]
  const remainingArticles = featuredArticle
    ? filteredArticles.filter((a) => a.id !== featuredArticle.id)
    : []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">News & Updates</h1>
          <p className="text-muted-foreground">
            Stay informed about your community
          </p>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link href={`/c/${communitySlug}/admin/news/new`}>
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search news..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {categoryLabels[category] || category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      {(searchQuery || selectedCategory !== 'all') && (
        <p className="text-sm text-muted-foreground mb-4">
          Showing {filteredArticles.length} of {articles.length} articles
        </p>
      )}

      {/* Articles */}
      {filteredArticles.length === 0 ? (
        <Card className="p-8 text-center">
          <Newspaper className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-semibold mb-2">No news found</h3>
          <p className="text-muted-foreground">
            {searchQuery || selectedCategory !== 'all'
              ? 'Try adjusting your filters'
              : 'No news has been posted yet'}
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Featured Article */}
          {featuredArticle && !searchQuery && selectedCategory === 'all' && (
            <NewsCard
              article={featuredArticle}
              communityId={communitySlug}
              variant="featured"
            />
          )}

          {/* Article Grid */}
          {remainingArticles.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(searchQuery || selectedCategory !== 'all' ? filteredArticles : remainingArticles).map((article) => (
                <NewsCard
                  key={article.id}
                  article={article}
                  communityId={communitySlug}
                  variant="card"
                />
              ))}
            </div>
          )}

          {/* When searching/filtering, show all as cards */}
          {(searchQuery || selectedCategory !== 'all') && filteredArticles.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredArticles.map((article) => (
                <NewsCard
                  key={article.id}
                  article={article}
                  communityId={communitySlug}
                  variant="card"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
