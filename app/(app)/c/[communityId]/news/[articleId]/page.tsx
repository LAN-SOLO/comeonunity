import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Calendar,
  Edit,
  Pin,
} from 'lucide-react'
import { format } from 'date-fns'
import { categoryIcons, categoryLabels, categoryColors } from '@/lib/news-categories'
import { ShareButton } from '@/components/news/share-button'

interface Props {
  params: Promise<{ communityId: string; articleId: string }>
}

// Generate metadata for share previews (works without auth)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { communityId: communitySlug, articleId } = await params
  const supabase = await createClient()

  // Check if the value looks like a UUID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(communitySlug)

  // Resolve the community
  let communityQuery = supabase
    .from('communities')
    .select('id, name, slug')
    .eq('status', 'active')

  if (isUUID) {
    communityQuery = communityQuery.or(`slug.eq.${communitySlug},id.eq.${communitySlug}`)
  } else {
    communityQuery = communityQuery.eq('slug', communitySlug)
  }

  const { data: community } = await communityQuery.single()
  if (!community) {
    return { title: 'Article Not Found' }
  }

  // Get article (only published ones for metadata)
  const { data: article } = await supabase
    .from('news')
    .select('title, excerpt, image_url')
    .eq('id', articleId)
    .eq('community_id', community.id)
    .eq('status', 'published')
    .single()

  if (!article) {
    return { title: 'Article Not Found' }
  }

  const title = `${article.title} - ${community.name}`
  const description = article.excerpt || article.title

  return {
    title,
    description,
    openGraph: {
      title: article.title,
      description,
      type: 'article',
      images: article.image_url ? [{ url: article.image_url }] : [],
    },
    twitter: {
      card: article.image_url ? 'summary_large_image' : 'summary',
      title: article.title,
      description,
      images: article.image_url ? [article.image_url] : [],
    },
  }
}

export default async function NewsArticlePage({ params }: Props) {
  const { communityId: communitySlug, articleId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Check if the value looks like a UUID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(communitySlug)

  // Resolve the community by slug or id
  let communityQuery = supabase
    .from('communities')
    .select('id, slug, name')
    .eq('status', 'active')

  if (isUUID) {
    communityQuery = communityQuery.or(`slug.eq.${communitySlug},id.eq.${communitySlug}`)
  } else {
    communityQuery = communityQuery.eq('slug', communitySlug)
  }

  const { data: community } = await communityQuery.single()

  if (!community) {
    notFound()
  }

  // Redirect if accessed by ID instead of slug
  if (communitySlug !== community.slug && communitySlug === community.id) {
    redirect(`/c/${community.slug}/news/${articleId}`)
  }

  // Check membership and get role (only if user is logged in)
  let member = null
  let isAdmin = false
  if (user) {
    const { data: memberData } = await supabase
      .from('community_members')
      .select('id, role')
      .eq('community_id', community.id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()
    member = memberData
    isAdmin = member?.role === 'admin' || member?.role === 'moderator'
  }

  // Get article - only published articles for public/non-members
  const { data: article } = await supabase
    .from('news')
    .select(`
      id,
      title,
      content,
      excerpt,
      category,
      image_url,
      pinned,
      status,
      published_at,
      created_at,
      updated_at,
      author:author_id (
        id,
        display_name,
        avatar_url,
        role
      )
    `)
    .eq('id', articleId)
    .eq('community_id', community.id)
    .single()

  if (!article) {
    notFound()
  }

  // Only show published articles to non-admins
  if (article.status === 'draft' && !isAdmin) {
    notFound()
  }

  // Draft articles require authentication and admin access
  if (article.status === 'draft' && !user) {
    redirect('/login')
  }

  const author = article.author as any
  const authorName = author?.display_name || 'Admin'
  const authorInitials = authorName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const Icon = categoryIcons[article.category] || categoryIcons.announcement
  const isPublicView = !user || !member

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Back button - only for members */}
      {member && (
        <div className="mb-6">
          <Link
            href={`/c/${community.slug}/news`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to News
          </Link>
        </div>
      )}

      {/* Public view banner */}
      {isPublicView && (
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground mb-3">
            This article is from <strong>{community.name}</strong> community.
          </p>
          <div className="flex gap-2">
            {!user ? (
              <>
                <Button size="sm" asChild>
                  <Link href={`/login?next=/c/${community.slug}/news/${articleId}`}>
                    Sign in
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/signup?next=/c/${community.slug}`}>
                    Join Community
                  </Link>
                </Button>
              </>
            ) : (
              <Button size="sm" asChild>
                <Link href={`/c/${community.slug}`}>
                  View Community
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Article Header */}
      <article>
        {/* Category and meta */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Badge className={categoryColors[article.category]}>
              <Icon className="h-3 w-3 mr-1" />
              {categoryLabels[article.category] || article.category}
            </Badge>
            {article.pinned && (
              <Badge variant="secondary">
                <Pin className="h-3 w-3 mr-1" />
                Pinned
              </Badge>
            )}
          </div>
          {isAdmin && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/c/${community.slug}/admin/news/${articleId}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold tracking-tight mb-4">
          {article.title}
        </h1>

        {/* Author and date */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
          {member ? (
            <Link href={`/c/${community.slug}/members/${author?.id}`}>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={author?.avatar_url || undefined} />
                  <AvatarFallback>{authorInitials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{authorName}</p>
                  <p className="text-sm text-muted-foreground">
                    {author?.role === 'admin' ? 'Admin' : 'Moderator'}
                  </p>
                </div>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={author?.avatar_url || undefined} />
                <AvatarFallback>{authorInitials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{authorName}</p>
                <p className="text-sm text-muted-foreground">
                  {author?.role === 'admin' ? 'Admin' : 'Moderator'}
                </p>
              </div>
            </div>
          )}
          <div className="flex-1" />
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {format(new Date(article.published_at), 'MMMM d, yyyy')}
          </div>
        </div>

        {/* Featured Image */}
        {article.image_url && (
          <div className="mb-8">
            <img
              src={article.image_url}
              alt={article.title}
              className="w-full rounded-lg object-cover max-h-[400px]"
            />
          </div>
        )}

        {/* Content */}
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <div className="whitespace-pre-wrap text-foreground leading-relaxed">
            {article.content}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {article.updated_at !== article.created_at && (
                <>Updated {format(new Date(article.updated_at), 'MMM d, yyyy')}</>
              )}
            </p>
            <ShareButton title={article.title} text={article.excerpt || undefined} />
          </div>
        </div>
      </article>
    </div>
  )
}
