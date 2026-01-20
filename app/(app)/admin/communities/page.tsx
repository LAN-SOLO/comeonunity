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
  Building2,
  Search,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Ban,
  CheckCircle,
  ExternalLink,
  Users,
} from 'lucide-react'
import { format } from 'date-fns'

interface Community {
  id: string
  name: string
  slug: string
  status: string
  plan: string
  members_count: number
  items_count: number
  created_at: string
  suspended_reason: string | null
}

const PAGE_SIZE = 20

export default function AdminCommunitiesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [communities, setCommunities] = useState<Community[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [planFilter, setPlanFilter] = useState(searchParams.get('plan') || 'all')
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'))

  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    type: 'suspend' | 'activate' | null
    community: Community | null
    reason?: string
  }>({ open: false, type: null, community: null })

  const [actionLoading, setActionLoading] = useState(false)

  const fetchCommunities = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (planFilter !== 'all') params.set('plan', planFilter)
      params.set('page', currentPage.toString())
      params.set('limit', PAGE_SIZE.toString())

      const res = await fetch(`/api/admin/communities?${params}`)
      const data = await res.json()

      if (res.ok) {
        setCommunities(data.communities)
        setTotalCount(data.total)
      }
    } catch (error) {
      console.error('Failed to fetch communities:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCommunities()
  }, [searchQuery, statusFilter, planFilter, currentPage])

  const updateUrlParams = () => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('search', searchQuery)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (planFilter !== 'all') params.set('plan', planFilter)
    if (currentPage > 1) params.set('page', currentPage.toString())

    const newUrl = params.toString() ? `/admin/communities?${params}` : '/admin/communities'
    router.push(newUrl, { scroll: false })
  }

  useEffect(() => {
    updateUrlParams()
  }, [searchQuery, statusFilter, planFilter, currentPage])

  const handleAction = async () => {
    if (!actionDialog.community || !actionDialog.type) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/communities/${actionDialog.community.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionDialog.type,
          reason: actionDialog.reason,
        }),
      })

      if (res.ok) {
        setActionDialog({ open: false, type: null, community: null })
        fetchCommunities()
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
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'premium':
        return <Badge className="bg-purple-500">Premium</Badge>
      case 'pro':
        return <Badge className="bg-blue-500">Pro</Badge>
      default:
        return <Badge variant="outline">Free</Badge>
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
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Community Management</h1>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
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
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={planFilter}
            onValueChange={(v) => {
              setPlanFilter(v)
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Communities Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Community</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : communities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No communities found
                </TableCell>
              </TableRow>
            ) : (
              communities.map((community) => (
                <TableRow key={community.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{community.name}</p>
                      <p className="text-xs text-muted-foreground">
                        /{community.slug}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(community.status)}</TableCell>
                  <TableCell>{getPlanBadge(community.plan)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      {community.members_count}
                    </div>
                  </TableCell>
                  <TableCell>{community.items_count}</TableCell>
                  <TableCell>
                    <p className="text-sm">
                      {format(new Date(community.created_at), 'MMM d, yyyy')}
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
                        <DropdownMenuItem asChild>
                          <Link href={`/c/${community.id}`} target="_blank">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Community
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {community.status === 'active' ? (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setActionDialog({
                              open: true,
                              type: 'suspend',
                              community,
                              reason: '',
                            })}
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            Suspend Community
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => setActionDialog({
                              open: true,
                              type: 'activate',
                              community,
                            })}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Activate Community
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
        onOpenChange={(open) => !open && setActionDialog({ open: false, type: null, community: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'suspend' && 'Suspend Community'}
              {actionDialog.type === 'activate' && 'Activate Community'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'suspend' && (
                <>
                  Are you sure you want to suspend{' '}
                  <span className="font-medium">{actionDialog.community?.name}</span>?
                  All members will lose access until it is reactivated.
                </>
              )}
              {actionDialog.type === 'activate' && (
                <>
                  Are you sure you want to activate{' '}
                  <span className="font-medium">{actionDialog.community?.name}</span>?
                  Members will regain access to the community.
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

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, type: null, community: null })}
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
