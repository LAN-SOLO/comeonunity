import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ListRow } from '@/components/design-system/list-row'
import { SectionHeader } from '@/components/design-system/section-header'
import {
  User,
  Mail,
  Shield,
  Bell,
  Globe,
  Download,
  Trash2,
  ChevronRight,
} from 'lucide-react'

export const metadata = {
  title: 'Settings - ComeOnUnity',
  description: 'Manage your account settings',
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Card */}
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.user_metadata?.avatar_url} />
            <AvatarFallback className="text-xl">
              {user.email?.[0].toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">
              {user.user_metadata?.full_name || 'User'}
            </h2>
            <p className="text-muted-foreground">{user.email}</p>
            {profile?.totp_enabled && (
              <Badge variant="secondary" className="mt-2">
                <Shield className="h-3 w-3 mr-1" />
                2FA Enabled
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Account Section */}
      <SectionHeader title="Account" />
      <Card className="mb-6 overflow-hidden">
        <Link href="/settings/profile">
          <ListRow
            icon={<User className="h-4 w-4" />}
            title="Edit Profile"
            subtitle="Update your name and photo"
            showChevron
          />
        </Link>
        <Link href="/settings/email">
          <ListRow
            icon={<Mail className="h-4 w-4" />}
            title="Email"
            value={user.email}
            showChevron
          />
        </Link>
      </Card>

      {/* Security Section */}
      <SectionHeader title="Security" />
      <Card className="mb-6 overflow-hidden">
        <Link href="/settings/security">
          <ListRow
            icon={<Shield className="h-4 w-4" />}
            title="Security"
            subtitle="Password, 2FA, and sessions"
            showChevron
          />
        </Link>
      </Card>

      {/* Preferences Section */}
      <SectionHeader title="Preferences" />
      <Card className="mb-6 overflow-hidden">
        <Link href="/settings/notifications">
          <ListRow
            icon={<Bell className="h-4 w-4" />}
            title="Notifications"
            subtitle="Email and push notifications"
            showChevron
          />
        </Link>
        <Link href="/settings/language">
          <ListRow
            icon={<Globe className="h-4 w-4" />}
            title="Language & Region"
            value={profile?.locale === 'de' ? 'Deutsch' : 'English'}
            showChevron
          />
        </Link>
      </Card>

      {/* Data Section */}
      <SectionHeader title="Your Data" />
      <Card className="overflow-hidden">
        <Link href="/settings/export">
          <ListRow
            icon={<Download className="h-4 w-4" />}
            title="Export Your Data"
            subtitle="Download a copy of your data"
            showChevron
          />
        </Link>
        <Link href="/settings/delete-account">
          <ListRow
            icon={<Trash2 className="h-4 w-4" />}
            title="Delete Account"
            subtitle="Permanently delete your account"
            destructive
            showChevron
          />
        </Link>
      </Card>
    </div>
  )
}
