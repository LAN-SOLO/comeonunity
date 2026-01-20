'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronLeft, Loader2, Mail, Home } from 'lucide-react'
import { toast } from 'sonner'

export default function EmailSettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentEmail, setCurrentEmail] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setCurrentEmail(user.email || '')
      setLoading(false)
    }
    loadUser()
  }, [])

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newEmail || !password) {
      toast.error('Please fill in all fields')
      return
    }

    if (newEmail === currentEmail) {
      toast.error('New email must be different from current email')
      return
    }

    setSaving(true)
    try {
      // First verify password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password,
      })

      if (signInError) {
        toast.error('Incorrect password')
        setSaving(false)
        return
      }

      // Update email
      const { error } = await supabase.auth.updateUser({ email: newEmail })

      if (error) throw error

      toast.success('Verification email sent', {
        description: 'Please check your new email address to confirm the change.',
      })
      setNewEmail('')
      setPassword('')
    } catch (error: any) {
      console.error('Email update error:', error)
      toast.error(error.message || 'Failed to update email')
    } finally {
      setSaving(false)
    }
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
          <h1 className="text-2xl font-bold">Email Settings</h1>
        </div>
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home className="h-4 w-4" />
          <span>Home</span>
        </Link>
      </div>

      {/* Current Email */}
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Current Email</h2>
            <p className="text-muted-foreground">{currentEmail}</p>
          </div>
        </div>
      </Card>

      {/* Change Email Form */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Change Email Address</h2>
        <form onSubmit={handleUpdateEmail} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newEmail">New Email Address</Label>
            <Input
              id="newEmail"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Enter new email address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Current Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your current password"
            />
            <p className="text-xs text-muted-foreground">
              Required to verify your identity
            </p>
          </div>

          <Button type="submit" disabled={saving || !newEmail || !password}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Updating...
              </>
            ) : (
              'Update Email'
            )}
          </Button>
        </form>

        <p className="text-sm text-muted-foreground mt-4">
          After submitting, you'll receive a verification email at your new address.
          Your email won't change until you click the confirmation link.
        </p>
      </Card>
    </div>
  )
}
