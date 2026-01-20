'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ChevronLeft, Loader2, Mail, Bell, Calendar, Package, Newspaper, Home } from 'lucide-react'
import { toast } from 'sonner'

export default function NotificationSettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)

  useEffect(() => {
    const loadSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('email_notifications, push_notifications')
        .eq('id', user.id)
        .single()

      if (profile) {
        setEmailNotifications(profile.email_notifications ?? true)
        setPushNotifications(profile.push_notifications ?? true)
      }
      setLoading(false)
    }
    loadSettings()
  }, [])

  const updateSetting = async (field: string, value: boolean) => {
    if (!userId) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ [field]: value })
        .eq('id', userId)

      if (error) throw error

      toast.success('Settings updated')
    } catch (error) {
      console.error('Failed to update setting:', error)
      toast.error('Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  const handleEmailToggle = (checked: boolean) => {
    setEmailNotifications(checked)
    updateSetting('email_notifications', checked)
  }

  const handlePushToggle = (checked: boolean) => {
    setPushNotifications(checked)
    updateSetting('push_notifications', checked)
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Notifications</h1>
        </div>
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home className="h-4 w-4" />
          <span>Home</span>
        </Link>
      </div>

      {/* Main Toggles */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Notification Channels</h2>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label htmlFor="email-notifications" className="text-base font-medium">
                  Email Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
            </div>
            <Switch
              id="email-notifications"
              checked={emailNotifications}
              onCheckedChange={handleEmailToggle}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label htmlFor="push-notifications" className="text-base font-medium">
                  Push Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications in your browser
                </p>
              </div>
            </div>
            <Switch
              id="push-notifications"
              checked={pushNotifications}
              onCheckedChange={handlePushToggle}
              disabled={saving}
            />
          </div>
        </div>
      </Card>

      {/* Notification Types Info */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">What you'll receive</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Borrow Requests</p>
              <p className="text-sm text-muted-foreground">
                When someone wants to borrow your items or responds to your requests
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Events</p>
              <p className="text-sm text-muted-foreground">
                New events in your communities and event reminders
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Newspaper className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">News & Announcements</p>
              <p className="text-sm text-muted-foreground">
                Important updates from your community admins
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
