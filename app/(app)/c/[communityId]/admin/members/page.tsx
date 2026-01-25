'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  Search,
  MoreVertical,
  Shield,
  ShieldCheck,
  User,
  Ban,
  Loader2,
  UserCog,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface Member {
  id: string
  display_name: string | null
  avatar_url: string | null
  role: string
  status: string
  joined_at: string
  last_active_at: string | null
  user_id: string
}

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  moderator: 'Moderator',
  member: 'Member',
}

const roleBadgeColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  moderator: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  member: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

const statusLabels: Record<string, string> = {
  active: 'Active',
  pending: 'Pending',
  suspended: 'Suspended',
  inactive: 'Inactive',
}

export default function AdminMembersPage() {
  const params = useParams()
  const communitySlug = params.communityId as string

  const [, setCommunityId] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Modal states
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false)
  const [newRole, setNewRole] = useState('')
  const [suspendReason, setSuspendReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    initializePage()
    getCurrentUser()
  }, [communitySlug])

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id || null)
  }

  const initializePage = async () => {
    // Check if the value looks like a UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(communitySlug)

    // First fetch community to get the ID
    let communityQuery = supabase
      .from('communities')
      .select('id')
      .eq('status', 'active')

    if (isUUID) {
      communityQuery = communityQuery.or(`slug.eq.${communitySlug},id.eq.${communitySlug}`)
    } else {
      communityQuery = communityQuery.eq('slug', communitySlug)
    }

    const { data: community } = await communityQuery.single()

    if (community) {
      setCommunityId(community.id)
      fetchMembers(community.id)
    } else {
      setIsLoading(false)
    }
  }

  const fetchMembers = async (cId: string) => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('community_members')
        .select('id, display_name, avatar_url, role, status, joined_at, last_active_at, user_id')
        .eq('community_id', cId)
        .order('joined_at', { ascending: false })

      if (error) throw error
      setMembers(data || [])
    } catch (err) {
      console.error('Failed to fetch members:', err)
      toast.error('Failed to load members')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangeRole = async () => {
    if (!selectedMember || !newRole) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('community_members')
        .update({ role: newRole })
        .eq('id', selectedMember.id)

      if (error) throw error

      setMembers((prev) =>
        prev.map((m) =>
          m.id === selectedMember.id ? { ...m, role: newRole } : m
        )
      )
      toast.success(`Role updated to ${roleLabels[newRole]}`)
      setIsRoleDialogOpen(false)
    } catch (err) {
      console.error('Failed to change role:', err)
      toast.error('Failed to change role')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSuspend = async () => {
    if (!selectedMember) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('community_members')
        .update({
          status: 'suspended',
          suspended_reason: suspendReason || null,
          suspended_at: new Date().toISOString(),
        })
        .eq('id', selectedMember.id)

      if (error) throw error

      setMembers((prev) =>
        prev.map((m) =>
          m.id === selectedMember.id ? { ...m, status: 'suspended' } : m
        )
      )
      toast.success('Member suspended')
      setIsSuspendDialogOpen(false)
      setSuspendReason('')
    } catch (err) {
      console.error('Failed to suspend member:', err)
      toast.error('Failed to suspend member')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReactivate = async (member: Member) => {
    try {
      const { error } = await supabase
        .from('community_members')
        .update({
          status: 'active',
          suspended_reason: null,
          suspended_at: null,
        })
        .eq('id', member.id)

      if (error) throw error

      setMembers((prev) =>
        prev.map((m) =>
          m.id === member.id ? { ...m, status: 'active' } : m
        )
      )
      toast.success('Member reactivated')
    } catch (err) {
      console.error('Failed to reactivate member:', err)
      toast.error('Failed to reactivate member')
    }
  }

  // Memoize filtered members to prevent recalculation on every render
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        !search ||
        m.display_name?.toLowerCase().includes(search.toLowerCase())
      const matchesRole = roleFilter === 'all' || m.role === roleFilter
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [members, search, roleFilter, statusFilter])

  const getInitials = useCallback((name: string | null) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }, [])

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/c/${communitySlug}/admin`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Member Management</h1>
        <p className="text-muted-foreground mt-1">
          {members.length} total members
        </p>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
              <SelectItem value="moderator">Moderators</SelectItem>
              <SelectItem value="member">Members</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Members List */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredMembers.length === 0 ? (
        <Card className="p-8 text-center">
          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-semibold mb-2">No members found</h3>
          <p className="text-muted-foreground">
            {search || roleFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'No members in this community yet'}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-border">
            {filteredMembers.map((member) => {
              const isCurrentUser = member.user_id === currentUserId

              return (
                <div
                  key={member.id}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback>{getInitials(member.display_name)}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/c/${communitySlug}/members/${member.id}`}
                        className="font-medium hover:underline truncate"
                      >
                        {member.display_name || 'Unknown'}
                      </Link>
                      {isCurrentUser && (
                        <Badge variant="outline" className="text-xs">You</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Joined {format(new Date(member.joined_at), 'MMM d, yyyy')}
                      {member.last_active_at && (
                        <> · Active {format(new Date(member.last_active_at), 'MMM d')}</>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className={roleBadgeColors[member.role]}>
                      {roleLabels[member.role] || member.role}
                    </Badge>
                    {member.status !== 'active' && (
                      <Badge variant="destructive">
                        {statusLabels[member.status] || member.status}
                      </Badge>
                    )}
                  </div>

                  {!isCurrentUser && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/c/${communitySlug}/members/${member.id}`}>
                            <User className="h-4 w-4 mr-2" />
                            View Profile
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedMember(member)
                            setNewRole(member.role)
                            setIsRoleDialogOpen(true)
                          }}
                        >
                          <UserCog className="h-4 w-4 mr-2" />
                          Change Role
                        </DropdownMenuItem>
                        {member.status === 'suspended' ? (
                          <DropdownMenuItem
                            onClick={() => handleReactivate(member)}
                          >
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            Reactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setSelectedMember(member)
                              setIsSuspendDialogOpen(true)
                            }}
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            Suspend
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Change Role Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Member Role</DialogTitle>
            <DialogDescription>
              Change the role for {selectedMember?.display_name || 'this member'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-red-500" />
                      Admin - Full access
                    </div>
                  </SelectItem>
                  <SelectItem value="moderator">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-blue-500" />
                      Moderator - Can manage content
                    </div>
                  </SelectItem>
                  <SelectItem value="member">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      Member - Standard access
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangeRole} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to suspend {selectedMember?.display_name || 'this member'}?
              They will no longer be able to access the community.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Reason for suspension..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSuspendDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSuspend} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Suspend Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
