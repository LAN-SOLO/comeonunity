import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Calendar,
  Edit,
  Pin,
  Share2,
} from 'lucide-react'
import { format } from 'date-fns'
import { categoryIcons, categoryLabels, categoryColors } from '@/components/news/news-card'

interface Props {
  params: Promise<{ communityId: string; articleId: string }>
}

export default async function NewsArticlePage({ params }: Props) {
  const { communityId: communitySlug, articleId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if the value looks like a UUID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(communitySlug)

  // Resolve the community by slug or id
  let communityQuery = supabase
    .from('communities')
    .select('id, slug')
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

  // Check membership and get role
  const { data: member } = await supabase
    .from('community_members')
    .select('id, role')
    .eq('community_id', community.id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!member) {
    redirect(`/c/${community.slug}`)
  }

  const isAdmin = member.role === 'admin' || member.role === 'moderator'

  // Get article
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

  const author = article.author as any
  const authorName = author?.display_name || 'Admin'
  const authorInitials = authorName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const Icon = categoryIcons[article.category] || categoryIcons.announcement

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href={`/c/${community.slug}/news`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to News
        </Link>
      </div>

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
          {/* Render content - in a real app you'd use markdown or rich text */}
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
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </article>

      {/* Related Articles could go here */}
    </div>
  )
}
