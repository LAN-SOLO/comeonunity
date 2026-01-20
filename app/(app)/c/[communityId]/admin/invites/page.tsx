'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Plus,
  Copy,
  Trash2,
  Loader2,
  Link as LinkIcon,
  Mail,
  Users,
  Clock,
} from 'lucide-react'
import { format, addDays, isPast } from 'date-fns'
import { toast } from 'sonner'

interface Invite {
  id: string
  code: string
  email: string | null
  max_uses: number
  uses: number
  expires_at: string | null
  created_at: string
  created_by: {
    display_name: string | null
  } | null
}

export default function AdminInvitesPage() {
  const params = useParams()
  const communityId = params.communityId as string

  const [invites, setInvites] = useState<Invite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Create form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [maxUses, setMaxUses] = useState('1')
  const [expiresInDays, setExpiresInDays] = useState('7')

  const supabase = createClient()

  useEffect(() => {
    fetchInvites()
  }, [communityId])

  const fetchInvites = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('invites')
        .select(`
          id,
          code,
          email,
          max_uses,
          uses,
          expires_at,
          created_at,
          created_by:created_by (
            display_name
          )
        `)
        .eq('community_id', communityId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setInvites(data || [])
    } catch (err) {
      console.error('Failed to fetch invites:', err)
      toast.error('Failed to load invites')
    } finally {
      setIsLoading(false)
    }
  }

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const handleCreate = async () => {
    setIsCreating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please sign in')
        return
      }

      // Get member ID
      const { data: member } = await supabase
        .from('community_members')
        .select('id')
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!member) {
        toast.error('Not a member of this community')
        return
      }

      const code = generateCode()
      const expiresAt = expiresInDays
        ? addDays(new Date(), parseInt(expiresInDays)).toISOString()
        : null

      const { error } = await supabase.from('invites').insert({
        community_id: communityId,
        code,
        email: inviteEmail.trim() || null,
        max_uses: parseInt(maxUses) || 1,
        expires_at: expiresAt,
        created_by: member.id,
      })

      if (error) throw error

      toast.success('Invite created successfully')
      setIsCreateOpen(false)
      setInviteEmail('')
      setMaxUses('1')
      setExpiresInDays('7')
      fetchInvites()
    } catch (err) {
      console.error('Failed to create invite:', err)
      toast.error('Failed to create invite')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from('invites')
        .delete()
        .eq('id', inviteId)

      if (error) throw error

      setInvites((prev) => prev.filter((i) => i.id !== inviteId))
      toast.success('Invite deleted')
    } catch (err) {
      console.error('Failed to delete invite:', err)
      toast.error('Failed to delete invite')
    }
  }

  const copyInviteLink = (code: string) => {
    const link = `${window.location.origin}/communities/join?code=${code}`
    navigator.clipboard.writeText(link)
    toast.success('Invite link copied to clipboard')
  }

  const getInviteStatus = (invite: Invite) => {
    if (invite.expires_at && isPast(new Date(invite.expires_at))) {
      return { label: 'Expired', variant: 'destructive' as const }
    }
    if (invite.uses >= invite.max_uses) {
      return { label: 'Used', variant: 'secondary' as const }
    }
    return { label: 'Active', variant: 'default' as const }
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/c/${communityId}/admin`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Invite Management</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage invite links
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Invite
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Invite</DialogTitle>
                <DialogDescription>
                  Generate a new invite link for your community
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Restrict to specific email"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for anyone to use this invite
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="maxUses">Max Uses</Label>
                    <Input
                      id="maxUses"
                      type="number"
                      value={maxUses}
                      onChange={(e) => setMaxUses(e.target.value)}
                      min="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expires">Expires In (days)</Label>
                    <Input
                      id="expires"
                      type="number"
                      value={expiresInDays}
                      onChange={(e) => setExpiresInDays(e.target.value)}
                      min="1"
                      placeholder="Never"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={isCreating}>
                  {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Invite
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Invites List */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : invites.length === 0 ? (
        <Card className="p-8 text-center">
          <LinkIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-semibold mb-2">No invites yet</h3>
          <p className="text-muted-foreground mb-4">
            Create an invite link to add members to your community
          </p>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Invite
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-border">
            {invites.map((invite) => {
              const status = getInviteStatus(invite)
              const isActive = status.label === 'Active'

              return (
                <div
                  key={invite.id}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-muted">
                    <LinkIcon className="h-5 w-5 text-muted-foreground" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-medium">{invite.code}</code>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                      {invite.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {invite.email}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {invite.uses} / {invite.max_uses} uses
                      </span>
                      {invite.expires_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {isPast(new Date(invite.expires_at))
                            ? 'Expired'
                            : `Expires ${format(new Date(invite.expires_at), 'MMM d, yyyy')}`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyInviteLink(invite.code)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Link
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(invite.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
