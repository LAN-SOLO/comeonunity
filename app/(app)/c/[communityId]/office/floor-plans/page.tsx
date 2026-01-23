'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ChevronLeft,
  Building2,
  Loader2,
  Plus,
  LayoutGrid,
  Users,
  ArrowRight,
  Pencil,
  Trash2,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import type { FloorPlan, Desk } from '@/lib/types/office'

interface FloorPlanWithStats extends FloorPlan {
  desks_count: number
  bookable_desks: number
  meeting_rooms_count: number
}

export default function FloorPlansPage() {
  const params = useParams()
  const router = useRouter()
  const communityId = params.communityId as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [floorPlans, setFloorPlans] = useState<FloorPlanWithStats[]>([])
  const [isAdmin, setIsAdmin] = useState(false)

  // Create dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    floor_number: 0,
    width: 1000,
    height: 800,
  })

  // Edit dialog state
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingPlan, setEditingPlan] = useState<FloorPlanWithStats | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadFloorPlans()
  }, [])

  const loadFloorPlans = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: member } = await supabase
        .from('community_members')
        .select('id, role')
        .eq('community_id', communityId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!member) {
        router.push('/')
        return
      }

      setIsAdmin(member.role === 'admin' || member.role === 'moderator')

      // Get floor plans
      const { data: planData, error: planError } = await supabase
        .from('floor_plans')
        .select('*')
        .eq('community_id', communityId)
        .order('floor_number')

      if (planError) throw planError

      // Get desk counts for each floor plan
      const plansWithStats: FloorPlanWithStats[] = await Promise.all(
        (planData || []).map(async (plan) => {
          const [desksResult, roomsResult] = await Promise.all([
            supabase
              .from('desks')
              .select('id, is_bookable', { count: 'exact' })
              .eq('floor_plan_id', plan.id),
            supabase
              .from('meeting_rooms')
              .select('id', { count: 'exact' })
              .eq('floor_plan_id', plan.id),
          ])

          const desks = desksResult.data || []
          const bookableDesks = desks.filter((d) => d.is_bookable).length

          return {
            ...plan,
            desks_count: desksResult.count || 0,
            bookable_desks: bookableDesks,
            meeting_rooms_count: roomsResult.count || 0,
          }
        })
      )

      setFloorPlans(plansWithStats)
    } catch (error) {
      console.error('Error loading floor plans:', error)
      toast.error('Failed to load floor plans')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Floor plan name is required')
      return
    }

    setCreating(true)
    try {
      const { data, error } = await supabase
        .from('floor_plans')
        .insert({
          community_id: communityId,
          name: formData.name.trim(),
          floor_number: formData.floor_number,
          width: formData.width,
          height: formData.height,
          is_active: true,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Floor plan created')
      setShowCreateDialog(false)
      setFormData({ name: '', floor_number: 0, width: 1000, height: 800 })

      // Navigate to the new floor plan
      router.push(`/c/${communityId}/office/floor-plans/${data.id}`)
    } catch (error) {
      console.error('Error creating floor plan:', error)
      toast.error('Failed to create floor plan')
    } finally {
      setCreating(false)
    }
  }

  const handleEdit = async () => {
    if (!editingPlan || !formData.name.trim()) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('floor_plans')
        .update({
          name: formData.name.trim(),
          floor_number: formData.floor_number,
          width: formData.width,
          height: formData.height,
        })
        .eq('id', editingPlan.id)

      if (error) throw error

      toast.success('Floor plan updated')
      setShowEditDialog(false)
      setEditingPlan(null)
      loadFloorPlans()
    } catch (error) {
      console.error('Error updating floor plan:', error)
      toast.error('Failed to update floor plan')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (plan: FloorPlanWithStats) => {
    if (plan.desks_count > 0 || plan.meeting_rooms_count > 0) {
      toast.error('Cannot delete floor plan with desks or meeting rooms')
      return
    }

    if (!confirm(`Delete "${plan.name}"? This cannot be undone.`)) return

    try {
      const { error } = await supabase
        .from('floor_plans')
        .delete()
        .eq('id', plan.id)

      if (error) throw error

      toast.success('Floor plan deleted')
      loadFloorPlans()
    } catch (error) {
      console.error('Error deleting floor plan:', error)
      toast.error('Failed to delete floor plan')
    }
  }

  const handleToggleActive = async (plan: FloorPlanWithStats) => {
    try {
      const { error } = await supabase
        .from('floor_plans')
        .update({ is_active: !plan.is_active })
        .eq('id', plan.id)

      if (error) throw error

      toast.success(plan.is_active ? 'Floor plan deactivated' : 'Floor plan activated')
      loadFloorPlans()
    } catch (error) {
      console.error('Error toggling floor plan:', error)
      toast.error('Failed to update floor plan')
    }
  }

  const openEditDialog = (plan: FloorPlanWithStats) => {
    setEditingPlan(plan)
    setFormData({
      name: plan.name,
      floor_number: plan.floor_number,
      width: plan.width,
      height: plan.height,
    })
    setShowEditDialog(true)
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href={`/c/${communityId}/office`}
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Floor Plans
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage office layouts and desk arrangements
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => {
            setFormData({ name: '', floor_number: floorPlans.length, width: 1000, height: 800 })
            setShowCreateDialog(true)
          }}>
            <Plus className="h-4 w-4 mr-1" />
            Add Floor Plan
          </Button>
        )}
      </div>

      {/* Floor Plans Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : floorPlans.length === 0 ? (
        <Card className="p-8 text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Floor Plans</h3>
          <p className="text-muted-foreground mb-4">
            Create your first floor plan to start managing desks and meeting rooms.
          </p>
          {isAdmin && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create Floor Plan
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {floorPlans.map((plan) => (
            <Card
              key={plan.id}
              className={`overflow-hidden ${!plan.is_active ? 'opacity-60' : ''}`}
            >
              {/* Preview Area */}
              <Link href={`/c/${communityId}/office/floor-plans/${plan.id}`}>
                <div className="aspect-video bg-muted/50 flex items-center justify-center relative group cursor-pointer hover:bg-muted/70 transition-colors">
                  {plan.image_url ? (
                    <img
                      src={plan.image_url}
                      alt={plan.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground mt-2">
                        {plan.width} × {plan.height}
                      </p>
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white font-medium flex items-center gap-1">
                      View Floor Plan
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>

                  {/* Status badge */}
                  {!plan.is_active && (
                    <Badge variant="secondary" className="absolute top-2 right-2">
                      Inactive
                    </Badge>
                  )}
                </div>
              </Link>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Floor {plan.floor_number}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-4 text-sm text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <LayoutGrid className="h-4 w-4" />
                    {plan.desks_count} desks
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {plan.meeting_rooms_count} rooms
                  </span>
                </div>

                {/* Actions */}
                {isAdmin && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEditDialog(plan)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(plan)}
                    >
                      {plan.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    {plan.desks_count === 0 && plan.meeting_rooms_count === 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(plan)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Floor Plan</DialogTitle>
            <DialogDescription>
              Add a new floor plan to manage desks and meeting rooms.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Floor Plan Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Main Office, Building A"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="floor">Floor Number</Label>
              <Input
                id="floor"
                type="number"
                value={formData.floor_number}
                onChange={(e) => setFormData({ ...formData, floor_number: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Use 0 for ground floor, negative numbers for basement levels
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="width">Width (px)</Label>
                <Input
                  id="width"
                  type="number"
                  value={formData.width}
                  onChange={(e) => setFormData({ ...formData, width: parseInt(e.target.value) || 1000 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (px)</Label>
                <Input
                  id="height"
                  type="number"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: parseInt(e.target.value) || 800 })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating || !formData.name.trim()}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Create Floor Plan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Floor Plan</DialogTitle>
            <DialogDescription>
              Update floor plan settings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Floor Plan Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-floor">Floor Number</Label>
              <Input
                id="edit-floor"
                type="number"
                value={formData.floor_number}
                onChange={(e) => setFormData({ ...formData, floor_number: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-width">Width (px)</Label>
                <Input
                  id="edit-width"
                  type="number"
                  value={formData.width}
                  onChange={(e) => setFormData({ ...formData, width: parseInt(e.target.value) || 1000 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-height">Height (px)</Label>
                <Input
                  id="edit-height"
                  type="number"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: parseInt(e.target.value) || 800 })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={saving || !formData.name.trim()}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
