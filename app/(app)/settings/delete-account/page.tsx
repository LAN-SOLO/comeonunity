'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ChevronLeft, Loader2, AlertTriangle, Trash2, Home } from 'lucide-react'
import { toast } from 'sonner'

export default function DeleteAccountPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [email, setEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [password, setPassword] = useState('')
  const [understood, setUnderstood] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setEmail(user.email || '')
      setLoading(false)
    }
    loadUser()
  }, [])

  const handleDeleteRequest = () => {
    if (confirmEmail !== email) {
      toast.error('Email does not match')
      return
    }
    if (!password) {
      toast.error('Please enter your password')
      return
    }
    if (!understood) {
      toast.error('Please confirm you understand this action is irreversible')
      return
    }
    setShowConfirmDialog(true)
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      // Verify password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        toast.error('Incorrect password')
        setDeleting(false)
        setShowConfirmDialog(false)
        return
      }

      // Mark account for deletion in user_profiles
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('user_profiles')
          .update({
            status: 'deleted',
            deleted_at: new Date().toISOString(),
          })
          .eq('id', user.id)
      }

      // Sign out
      await supabase.auth.signOut()

      toast.success('Account deletion requested', {
        description: 'Your account has been scheduled for deletion.',
      })

      router.push('/login')
    } catch (error: any) {
      console.error('Delete account error:', error)
      toast.error('Failed to delete account')
    } finally {
      setDeleting(false)
      setShowConfirmDialog(false)
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
          <h1 className="text-2xl font-bold">Delete Account</h1>
        </div>
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home className="h-4 w-4" />
          <span>Home</span>
        </Link>
      </div>

      {/* Warning */}
      <Card className="p-6 mb-6 border-destructive/50 bg-destructive/5">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-destructive mb-2">
              This action is permanent
            </h2>
            <p className="text-muted-foreground">
              Deleting your account will permanently remove all your data, including:
            </p>
            <ul className="list-disc list-inside mt-2 text-muted-foreground space-y-1">
              <li>Your profile and account information</li>
              <li>All items you've listed</li>
              <li>Your community memberships</li>
              <li>Your borrow history and bookings</li>
              <li>All notifications and messages</li>
            </ul>
            <p className="mt-3 text-sm font-medium text-destructive">
              This action cannot be undone.
            </p>
          </div>
        </div>
      </Card>

      {/* Delete Form */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Confirm Account Deletion</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirmEmail">
              Type your email to confirm: <span className="font-mono text-sm">{email}</span>
            </Label>
            <Input
              id="confirmEmail"
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="understood"
              checked={understood}
              onCheckedChange={(checked) => setUnderstood(checked === true)}
            />
            <Label htmlFor="understood" className="text-sm leading-tight">
              I understand that this action is permanent and all my data will be
              permanently deleted.
            </Label>
          </div>

          <Button
            variant="destructive"
            onClick={handleDeleteRequest}
            disabled={!confirmEmail || !password || !understood}
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete My Account
          </Button>
        </div>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This will permanently delete your account and all associated data.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Yes, delete my account'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
