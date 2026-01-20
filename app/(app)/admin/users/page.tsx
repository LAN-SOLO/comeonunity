'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Users,
  Search,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Shield,
  Ban,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'
import { format } from 'date-fns'

interface User {
  id: string
  email: string
  platform_role: string
  status: string
  suspended_reason: string | null
  created_at: string
  last_sign_in_at: string | null
  communities_count: number
}

const PAGE_SIZE = 20

export default function AdminUsersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [roleFilter, setRoleFilter] = useState(searchParams.get('role') || 'all')
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'))

  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    type: 'suspend' | 'activate' | 'role' | null
    user: User | null
    newRole?: string
    reason?: string
  }>({ open: false, type: null, user: null })

  const [actionLoading, setActionLoading] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (roleFilter !== 'all') params.set('role', roleFilter)
      params.set('page', currentPage.toString())
      params.set('limit', PAGE_SIZE.toString())

      const res = await fetch(`/api/admin/users?${params}`)
      const data = await res.json()

      if (res.ok) {
        setUsers(data.users)
        setTotalCount(data.total)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [searchQuery, statusFilter, roleFilter, currentPage])

  const updateUrlParams = () => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('search', searchQuery)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (roleFilter !== 'all') params.set('role', roleFilter)
    if (currentPage > 1) params.set('page', currentPage.toString())

    const newUrl = params.toString() ? `/admin/users?${params}` : '/admin/users'
    router.push(newUrl, { scroll: false })
  }

  useEffect(() => {
    updateUrlParams()
  }, [searchQuery, statusFilter, roleFilter, currentPage])

  const handleAction = async () => {
    if (!actionDialog.user || !actionDialog.type) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${actionDialog.user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionDialog.type,
          role: actionDialog.newRole,
          reason: actionDialog.reason,
        }),
      })

      if (res.ok) {
        setActionDialog({ open: false, type: null, user: null })
        fetchUsers()
      }
    } catch (error) {
      console.error('Action failed:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Active</Badge>
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'superadmin':
        return <Badge className="bg-purple-500">Super Admin</Badge>
      case 'admin':
        return <Badge className="bg-blue-500">Admin</Badge>
      case 'support':
        return <Badge variant="secondary">Support</Badge>
      default:
        return <Badge variant="outline">User</Badge>
    }
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link href="/admin" className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">User Management</h1>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v)
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={roleFilter}
            onValueChange={(v) => {
              setRoleFilter(v)
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="support">Support</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="superadmin">Super Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Users Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Communities</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.id.slice(0, 8)}...
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell>{getRoleBadge(user.platform_role)}</TableCell>
                  <TableCell>{user.communities_count}</TableCell>
                  <TableCell>
                    <p className="text-sm">
                      {format(new Date(user.created_at), 'MMM d, yyyy')}
                    </p>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setActionDialog({
                            open: true,
                            type: 'role',
                            user,
                            newRole: user.platform_role,
                          })}
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Change Role
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {user.status === 'active' ? (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setActionDialog({
                              open: true,
                              type: 'suspend',
                              user,
                              reason: '',
                            })}
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            Suspend User
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => setActionDialog({
                              open: true,
                              type: 'activate',
                              user,
                            })}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Activate User
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * PAGE_SIZE + 1} to{' '}
              {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Action Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => !open && setActionDialog({ open: false, type: null, user: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'suspend' && 'Suspend User'}
              {actionDialog.type === 'activate' && 'Activate User'}
              {actionDialog.type === 'role' && 'Change User Role'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'suspend' && (
                <>
                  Are you sure you want to suspend{' '}
                  <span className="font-medium">{actionDialog.user?.email}</span>?
                  They will lose access to the platform.
                </>
              )}
              {actionDialog.type === 'activate' && (
                <>
                  Are you sure you want to activate{' '}
                  <span className="font-medium">{actionDialog.user?.email}</span>?
                  They will regain access to the platform.
                </>
              )}
              {actionDialog.type === 'role' && (
                <>
                  Change the platform role for{' '}
                  <span className="font-medium">{actionDialog.user?.email}</span>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {actionDialog.type === 'suspend' && (
            <div className="space-y-2">
              <Label htmlFor="reason">Suspension Reason</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for suspension..."
                value={actionDialog.reason || ''}
                onChange={(e) => setActionDialog({ ...actionDialog, reason: e.target.value })}
              />
            </div>
          )}

          {actionDialog.type === 'role' && (
            <div className="space-y-2">
              <Label htmlFor="role">New Role</Label>
              <Select
                value={actionDialog.newRole}
                onValueChange={(v) => setActionDialog({ ...actionDialog, newRole: v })}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superadmin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, type: null, user: null })}
            >
              Cancel
            </Button>
            <Button
              variant={actionDialog.type === 'suspend' ? 'destructive' : 'default'}
              onClick={handleAction}
              disabled={actionLoading}
            >
              {actionLoading ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
