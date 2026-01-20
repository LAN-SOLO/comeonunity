'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SectionHeader } from '@/components/design-system/section-header'
import { ListRow } from '@/components/design-system/list-row'
import { TwoFactorSetup } from '@/components/auth/two-factor-setup'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ArrowLeft,
  Shield,
  Smartphone,
  Monitor,
  Loader2,
  Key,
  Trash2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

interface Session {
  id: string
  deviceInfo: {
    browser?: string
    os?: string
    device?: string
  }
  ipAddress: string
  location: string | null
  createdAt: string
  lastActiveAt: string
  isCurrent: boolean
}

export default function SecuritySettingsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [showSetup, setShowSetup] = useState(false)
  const [disabling2FA, setDisabling2FA] = useState(false)
  const [revokingSession, setRevokingSession] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get profile
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('totp_enabled, require_2fa, last_password_change')
        .eq('id', user.id)
        .single()

      setProfile(profileData)

      // Get sessions
      const res = await fetch('/api/auth/sessions')
      if (res.ok) {
        const { sessions: sessionData } = await res.json()
        setSessions(sessionData || [])
      }
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisable2FA = async () => {
    setDisabling2FA(true)
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to disable 2FA')
      }

      toast.success('Two-factor authentication disabled')
      setProfile({ ...profile, totp_enabled: false })
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setDisabling2FA(false)
    }
  }

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSession(sessionId)
    try {
      const res = await fetch(`/api/auth/sessions?id=${sessionId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to revoke session')
      }

      toast.success('Session revoked')
      setSessions(sessions.filter(s => s.id !== sessionId))
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setRevokingSession(null)
    }
  }

  const handleRevokeAllSessions = async () => {
    try {
      const res = await fetch('/api/auth/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revoke_all',
          excludeSessionId: sessions.find(s => s.isCurrent)?.id,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to revoke sessions')
      }

      const { revokedCount } = await res.json()
      toast.success(`${revokedCount} session(s) revoked`)
      await fetchData()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const getDeviceIcon = (deviceInfo: Session['deviceInfo']) => {
    if (deviceInfo?.device?.toLowerCase().includes('mobile')) {
      return <Smartphone className="h-4 w-4" />
    }
    return <Monitor className="h-4 w-4" />
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (showSetup) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setShowSetup(false)}
            className="-ml-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Security
          </Button>
        </div>
        <TwoFactorSetup />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/settings"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Settings
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Security</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account security settings
        </p>
      </div>

      {/* Two-Factor Authentication */}
      <SectionHeader title="Two-Factor Authentication" />
      <Card className="p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">Two-Factor Authentication</h3>
              {profile?.totp_enabled ? (
                <Badge variant="default" className="bg-green text-white">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Enabled
                </Badge>
              ) : (
                <Badge variant="secondary">Disabled</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {profile?.totp_enabled
                ? 'Your account is protected with two-factor authentication using an authenticator app.'
                : 'Add an extra layer of security to your account by requiring a verification code from your authenticator app.'}
            </p>
            {profile?.totp_enabled ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    Disable 2FA
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Disable Two-Factor Authentication?</DialogTitle>
                    <DialogDescription>
                      This will remove the extra layer of security from your account.
                      Are you sure you want to continue?
                    </DialogDescription>
                  </DialogHeader>
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your account will be less secure without 2FA enabled.
                    </AlertDescription>
                  </Alert>
                  <DialogFooter>
                    <Button
                      variant="destructive"
                      onClick={handleDisable2FA}
                      disabled={disabling2FA}
                    >
                      {disabling2FA ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Disabling...
                        </>
                      ) : (
                        'Disable 2FA'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : (
              <Button onClick={() => setShowSetup(true)} size="sm">
                <Key className="mr-2 h-4 w-4" />
                Enable 2FA
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Active Sessions */}
      <SectionHeader
        title="Active Sessions"
        action={
          sessions.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRevokeAllSessions}
              className="text-destructive hover:text-destructive"
            >
              Sign out other devices
            </Button>
          )
        }
      />
      <Card className="overflow-hidden">
        {sessions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Monitor className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No active sessions</p>
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center gap-4 p-4 border-b border-border last:border-b-0"
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                {getDeviceIcon(session.deviceInfo)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">
                    {session.deviceInfo?.browser || 'Unknown browser'} on{' '}
                    {session.deviceInfo?.os || 'Unknown OS'}
                  </p>
                  {session.isCurrent && (
                    <Badge variant="secondary" className="text-xs">
                      Current
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {session.ipAddress}
                  {session.location && ` · ${session.location}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Last active: {new Date(session.lastActiveAt).toLocaleString()}
                </p>
              </div>
              {!session.isCurrent && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRevokeSession(session.id)}
                  disabled={revokingSession === session.id}
                  className="text-destructive hover:text-destructive"
                >
                  {revokingSession === session.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          ))
        )}
      </Card>
    </div>
  )
}
