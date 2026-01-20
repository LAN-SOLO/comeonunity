'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Megaphone,
  Calendar,
  AlertTriangle,
  Info,
  PartyPopper,
  Wrench,
  Pin,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export interface NewsCardProps {
  article: {
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
  communityId: string
  variant?: 'card' | 'featured' | 'compact'
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  announcement: Megaphone,
  event: Calendar,
  urgent: AlertTriangle,
  info: Info,
  celebration: PartyPopper,
  maintenance: Wrench,
}

const categoryLabels: Record<string, string> = {
  announcement: 'Announcement',
  event: 'Event',
  urgent: 'Urgent',
  info: 'Information',
  celebration: 'Celebration',
  maintenance: 'Maintenance',
}

const categoryColors: Record<string, string> = {
  announcement: 'bg-blue-500 text-white',
  event: 'bg-purple-500 text-white',
  urgent: 'bg-red-500 text-white',
  info: 'bg-gray-500 text-white',
  celebration: 'bg-green text-white',
  maintenance: 'bg-amber-500 text-white',
}

export function NewsCard({ article, communityId, variant = 'card' }: NewsCardProps) {
  const Icon = categoryIcons[article.category] || Megaphone
  const authorName = article.author?.display_name || 'Admin'
  const authorInitials = authorName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  if (variant === 'featured') {
    return (
      <Link href={`/c/${communityId}/news/${article.id}`}>
        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
          <div className="relative aspect-[2/1] bg-muted">
            {article.image_url ? (
              <img
                src={article.image_url}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <Icon className="h-16 w-16 text-primary/50" />
              </div>
            )}
            {article.pinned && (
              <div className="absolute top-3 left-3">
                <Badge className="bg-black/70 text-white">
                  <Pin className="h-3 w-3 mr-1" />
                  Pinned
                </Badge>
              </div>
            )}
            <div className="absolute top-3 right-3">
              <Badge className={categoryColors[article.category]}>
                <Icon className="h-3 w-3 mr-1" />
                {categoryLabels[article.category] || article.category}
              </Badge>
            </div>
          </div>
          <div className="p-6">
            <h2 className="text-xl font-bold mb-2 line-clamp-2">{article.title}</h2>
            {article.excerpt && (
              <p className="text-muted-foreground line-clamp-2 mb-4">
                {article.excerpt}
              </p>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={article.author?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">{authorInitials}</AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">{authorName}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        </Card>
      </Link>
    )
  }

  if (variant === 'compact') {
    return (
      <Link href={`/c/${communityId}/news/${article.id}`}>
        <div className="flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${categoryColors[article.category]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {article.pinned && (
                <Pin className="h-3 w-3 text-muted-foreground" />
              )}
              <h3 className="font-medium truncate">{article.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}
              {' · '}
              {authorName}
            </p>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link href={`/c/${communityId}/news/${article.id}`}>
      <Card className="overflow-hidden hover:shadow-md transition-shadow h-full">
        <div className="relative aspect-video bg-muted">
          {article.image_url ? (
            <img
              src={article.image_url}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
              <Icon className="h-10 w-10 text-primary/40" />
            </div>
          )}
          {article.pinned && (
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="text-xs">
                <Pin className="h-3 w-3 mr-1" />
                Pinned
              </Badge>
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">
              <Icon className="h-3 w-3 mr-1" />
              {categoryLabels[article.category] || article.category}
            </Badge>
          </div>
          <h3 className="font-semibold line-clamp-2 mb-2">{article.title}</h3>
          {article.excerpt && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {article.excerpt}
            </p>
          )}
          <div className="flex items-center gap-2 pt-3 border-t border-border">
            <Avatar className="h-5 w-5">
              <AvatarImage src={article.author?.avatar_url || undefined} />
              <AvatarFallback className="text-xs">{authorInitials}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground flex-1">{authorName}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  )
}

export { categoryIcons, categoryLabels, categoryColors }
