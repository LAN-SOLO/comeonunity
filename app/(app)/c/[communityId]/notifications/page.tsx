'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NotificationItem } from '@/components/notifications/notification-item'
import {
  ArrowLeft,
  Bell,
  Loader2,
  CheckCheck,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

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

export default function NotificationsPage() {
  const params = useParams()
  const communityId = params.communityId as string

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [memberId, setMemberId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchNotifications()
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

      setMemberId(member.id)

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
        .limit(100)

      if (error) throw error

      setNotifications(data || [])
    } catch {
      // Silently fail - tables may not exist yet
    } finally {
      setIsLoading(false)
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
    } catch {
      // Silently fail
    }
  }

  const markAllAsRead = async () => {
    if (!memberId) return

    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', memberId)
        .eq('community_id', communityId)
        .eq('read', false)

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      toast.success('All notifications marked as read')
    } catch {
      toast.error('Failed to mark notifications as read')
    }
  }

  const deleteAllRead = async () => {
    if (!memberId) return

    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', memberId)
        .eq('community_id', communityId)
        .eq('read', true)

      setNotifications((prev) => prev.filter((n) => !n.read))
      toast.success('Read notifications deleted')
    } catch {
      toast.error('Failed to delete notifications')
    }
  }

  // Filter notifications by tab
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'unread') return !n.read
    return true
  })

  const unreadCount = notifications.filter((n) => !n.read).length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href={`/c/${communityId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
              : 'All caught up!'}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
          {notifications.some((n) => n.read) && (
            <Button variant="outline" size="sm" onClick={deleteAllRead}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear read
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">
            All
            {notifications.length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">
                ({notifications.length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {unreadCount > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">
                ({unreadCount})
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {renderNotificationList(filteredNotifications)}
        </TabsContent>

        <TabsContent value="unread">
          {renderNotificationList(filteredNotifications)}
        </TabsContent>
      </Tabs>
    </div>
  )

  function renderNotificationList(items: Notification[]) {
    if (items.length === 0) {
      return (
        <Card className="p-8 text-center">
          <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-semibold mb-2">
            {activeTab === 'unread' ? 'No unread notifications' : 'No notifications'}
          </h3>
          <p className="text-muted-foreground">
            {activeTab === 'unread'
              ? "You're all caught up!"
              : 'Notifications will appear here when there is activity'}
          </p>
        </Card>
      )
    }

    return (
      <Card className="overflow-hidden divide-y divide-border">
        {items.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            communityId={communityId}
            onClick={() => {
              if (!notification.read) {
                markAsRead(notification.id)
              }
            }}
          />
        ))}
      </Card>
    )
  }
}
