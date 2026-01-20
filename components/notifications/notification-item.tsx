'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Package,
  Calendar,
  Newspaper,
  Users,
  MessageCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Bell,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export interface NotificationItemProps {
  notification: {
    id: string
    type: string
    title: string
    message: string
    read: boolean
    created_at: string
    data?: {
      community_id?: string
      item_id?: string
      resource_id?: string
      booking_id?: string
      member_id?: string
      article_id?: string
    }
    actor?: {
      id: string
      display_name: string | null
      avatar_url: string | null
    } | null
  }
  communitySlug?: string
  onClick?: () => void
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  borrow_request: Package,
  borrow_approved: CheckCircle,
  borrow_rejected: XCircle,
  booking_request: Calendar,
  booking_approved: CheckCircle,
  booking_rejected: XCircle,
  booking_reminder: AlertCircle,
  news: Newspaper,
  member_joined: Users,
  message: MessageCircle,
  default: Bell,
}

const typeColors: Record<string, string> = {
  borrow_request: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  borrow_approved: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  borrow_rejected: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  booking_request: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  booking_approved: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  booking_rejected: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  booking_reminder: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  news: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  member_joined: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  message: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
  default: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
}

function getNotificationLink(notification: NotificationItemProps['notification'], communitySlug?: string): string | null {
  const cSlug = communitySlug || notification.data?.community_id
  if (!cSlug) return null

  const data = notification.data || {}

  switch (notification.type) {
    case 'borrow_request':
    case 'borrow_approved':
    case 'borrow_rejected':
      return data.item_id ? `/c/${cSlug}/items/${data.item_id}` : null
    case 'booking_request':
    case 'booking_approved':
    case 'booking_rejected':
    case 'booking_reminder':
      return `/c/${cSlug}/bookings`
    case 'news':
      return data.article_id ? `/c/${cSlug}/news/${data.article_id}` : `/c/${cSlug}/news`
    case 'member_joined':
      return data.member_id ? `/c/${cSlug}/members/${data.member_id}` : `/c/${cSlug}/members`
    default:
      return `/c/${cSlug}`
  }
}

export function NotificationItem({ notification, communitySlug, onClick }: NotificationItemProps) {
  const Icon = typeIcons[notification.type] || typeIcons.default
  const colorClass = typeColors[notification.type] || typeColors.default
  const link = getNotificationLink(notification, communitySlug)

  const actorName = notification.actor?.display_name || 'Someone'
  const actorInitials = actorName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const content = (
    <div
      className={cn(
        'flex items-start gap-3 p-3 transition-colors',
        !notification.read && 'bg-primary/5',
        link && 'hover:bg-muted/50 cursor-pointer'
      )}
      onClick={onClick}
    >
      {notification.actor ? (
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={notification.actor.avatar_url || undefined} />
          <AvatarFallback>{actorInitials}</AvatarFallback>
        </Avatar>
      ) : (
        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', colorClass)}>
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm', !notification.read && 'font-medium')}>
          {notification.title}
        </p>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
      {!notification.read && (
        <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-2" />
      )}
    </div>
  )

  if (link) {
    return <Link href={link}>{content}</Link>
  }

  return content
}
