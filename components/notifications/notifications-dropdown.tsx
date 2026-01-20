'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { NotificationItem } from './notification-item'
import { Bell, Loader2, CheckCheck } from 'lucide-react'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  created_at: string
  data?: Record<string, any>
  actor?: {
    id: string
    display_name: string | null
    avatar_url: string | null
  } | null
}

interface NotificationsDropdownProps {
  communityId: string
}

export function NotificationsDropdown({ communityId }: NotificationsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const supabase = createClient()

  useEffect(() => {
    fetchNotifications()
    fetchUnreadCount()

    // Subscribe to new notifications (only if table exists)
    let channel: ReturnType<typeof supabase.channel> | null = null

    try {
      channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `community_id=eq.${communityId}`,
          },
          (payload) => {
            setNotifications((prev) => [payload.new as Notification, ...prev])
            setUnreadCount((prev) => prev + 1)
          }
        )
        .subscribe((status) => {
          // Silently handle subscription errors (table may not exist)
          if (status === 'CHANNEL_ERROR') {
            channel?.unsubscribe()
          }
        })
    } catch {
      // Silently fail - realtime not available or table doesn't exist
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [communityId])

  const fetchNotifications = async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get member ID
      const { data: member } = await supabase
        .from('community_members')
        .select('id')
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .single()

      if (!member) return

      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id,
          type,
          title,
          message,
          read,
          created_at,
          data
        `)
        .eq('user_id', member.id)
        .eq('community_id', communityId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        // Silently fail - table may not exist yet
        return
      }

      setNotifications(data || [])
    } catch {
      // Silently fail - notifications not set up yet
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUnreadCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: member } = await supabase
        .from('community_members')
        .select('id')
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .single()

      if (!member) return

      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', member.id)
        .eq('community_id', communityId)
        .eq('read', false)

      if (error) {
        // Silently fail - table may not exist yet
        return
      }

      setUnreadCount(count || 0)
    } catch {
      // Silently fail - notifications not set up yet
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch {
      // Silently fail
    }
  }

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: member } = await supabase
        .from('community_members')
        .select('id')
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .single()

      if (!member) return

      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', member.id)
        .eq('community_id', communityId)
        .eq('read', false)

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch {
      // Silently fail
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-auto py-1 px-2 text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center p-4">
              <Bell className="h-8 w-8 text-muted-foreground opacity-50 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  communityId={communityId}
                  onClick={() => {
                    if (!notification.read) {
                      markAsRead(notification.id)
                    }
                    setIsOpen(false)
                  }}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            asChild
            onClick={() => setIsOpen(false)}
          >
            <Link href={`/c/${communityId}/notifications`}>
              View all notifications
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
