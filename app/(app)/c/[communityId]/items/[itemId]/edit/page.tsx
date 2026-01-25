'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { SectionHeader } from '@/components/design-system/section-header'
import {
  ArrowLeft,
  Upload,
  X,
  Loader2,
  Save,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { categories } from '@/components/items/category-filter'

const conditions = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'worn', label: 'Worn' },
]

const statuses = [
  { value: 'available', label: 'Available' },
  { value: 'unavailable', label: 'Unavailable' },
]

export default function EditItemPage() {
  const params = useParams()
  const router = useRouter()
  const communitySlug = params.communityId as string
  const itemId = params.itemId as string

  const [communityId, setCommunityId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    condition: 'good',
    status: 'available',
    notes: '',
    pickup_location: '',
  })

  const supabase = createClient()

  useEffect(() => {
    initializePage()
  }, [itemId, communitySlug])

  const initializePage = async () => {
    setIsLoading(true)
    try {
      // Check if the value looks like a UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(communitySlug)

      // Fetch community by slug or id
      let communityQuery = supabase
        .from('communities')
        .select('id, slug')
        .eq('status', 'active')

      if (isUUID) {
        communityQuery = communityQuery.or(`slug.eq.${communitySlug},id.eq.${communitySlug}`)
      } else {
        communityQuery = communityQuery.eq('slug', communitySlug)
      }

      const { data: community, error: communityError } = await communityQuery.single()

      if (communityError || !community) {
        return
      }

      setCommunityId(community.id)
      await fetchItem(community.id)
    } catch (err) {
      console.error('Failed to initialize:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchItem = async (actualCommunityId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get current member
      const { data: member } = await supabase
        .from('community_members')
        .select('id')
        .eq('community_id', actualCommunityId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!member) {
        router.push(`/c/${communitySlug}`)
        return
      }

      // Get item
      const { data: item, error } = await supabase
        .from('items')
        .select('*')
        .eq('id', itemId)
        .eq('community_id', actualCommunityId)
        .single()

      if (error || !item) {
        toast.error('Item not found')
        router.push(`/c/${communitySlug}/items`)
        return
      }

      // Verify ownership
      if (item.owner_id !== member.id) {
        toast.error('You can only edit your own items')
        router.push(`/c/${communitySlug}/items/${itemId}`)
        return
      }

      setImages(item.images || [])
      setFormData({
        name: item.name || '',
        description: item.description || '',
        category: item.category || '',
        condition: item.condition || 'good',
        status: item.status || 'available',
        notes: item.notes || '',
        pickup_location: item.pickup_location || '',
      })
    } catch (err) {
      console.error('Failed to fetch item:', err)
      toast.error('Failed to load item')
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (images.length + files.length > 5) {
      toast.error('Maximum 5 images allowed')
      return
    }

    if (!communityId) {
      toast.error('Community not loaded')
      return
    }

    setIsUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      const maxSize = 10 * 1024 * 1024 // 10MB as per bucket config
      const newImages: string[] = []

      for (const file of Array.from(files)) {
        // Validate file type
        if (!allowedTypes.includes(file.type)) {
          toast.error(`${file.name}: Only JPEG, PNG, and WebP images are allowed`)
          continue
        }

        // Validate file size (max 10MB)
        if (file.size > maxSize) {
          toast.error(`${file.name} is too large (max 10MB)`)
          continue
        }

        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
        // Use communityId as first folder to match storage policy
        // Path format: {community_id}/{user_id}-{timestamp}-{random}.{ext}
        const fileName = `${communityId}/${user.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`

        console.log('Uploading to path:', fileName, 'communityId:', communityId)

        const { error: uploadError } = await supabase.storage
          .from('item-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          toast.error(`Failed to upload ${file.name}: ${uploadError.message}`)
          continue
        }

        const { data: { publicUrl } } = supabase.storage
          .from('item-images')
          .getPublicUrl(fileName)

        newImages.push(publicUrl)
      }

      setImages([...images, ...newImages])
      if (newImages.length > 0) {
        toast.success(`${newImages.length} image(s) uploaded`)
      }
    } catch (err: unknown) {
      console.error('Upload failed:', err)
      const message = err instanceof Error ? err.message : 'Failed to upload images'
      toast.error(message)
    } finally {
      setIsUploading(false)
    }
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Please enter an item name')
      return
    }

    if (!formData.category) {
      toast.error('Please select a category')
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('items')
        .update({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          category: formData.category,
          condition: formData.condition,
          status: formData.status,
          notes: formData.notes.trim() || null,
          pickup_location: formData.pickup_location.trim() || null,
          images: images.length > 0 ? images : null,
        })
        .eq('id', itemId)

      if (error) throw error

      toast.success('Item updated successfully!')
      router.push(`/c/${communitySlug}/items/${itemId}`)
    } catch (err: unknown) {
      console.error('Save failed:', err)
      const message = err instanceof Error ? err.message : 'Failed to update item'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      toast.success('Item deleted')
      router.push(`/c/${communitySlug}/items`)
    } catch (err: unknown) {
      console.error('Delete failed:', err)
      const message = err instanceof Error ? err.message : 'Failed to delete item'
      toast.error(message)
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href={`/c/${communitySlug}/items/${itemId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Item
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Edit Item</h1>
        <p className="text-muted-foreground mt-1">
          Update your item listing
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Images Section */}
        <SectionHeader title="Photos" />
        <Card className="p-6 mb-6">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
            {images.map((image, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                <Image
                  src={image}
                  alt={`Item ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 33vw, 20vw"
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {images.length < 5 && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center cursor-pointer hover:border-muted-foreground/50 transition-colors">
                {isUploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">Add</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            )}
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Add up to 5 photos. The first photo will be the cover image.</p>
            <p>Accepted formats: JPEG, PNG, WebP. Maximum file size: 10MB per image.</p>
          </div>
        </Card>

        {/* Basic Info */}
        <SectionHeader title="Item Details" />
        <Card className="p-6 mb-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Item Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Power Drill, Camping Tent"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition">Condition</Label>
              <Select
                value={formData.condition}
                onValueChange={(value) => setFormData({ ...formData, condition: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  {conditions.map((condition) => (
                    <SelectItem key={condition.value} value={condition.value}>
                      {condition.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Availability Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your item, including any details borrowers should know..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pickup_location">Pickup Location</Label>
            <Input
              id="pickup_location"
              value={formData.pickup_location}
              onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
              placeholder="e.g., Unit 4B, Front porch, Garage..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes for Borrowers</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g., Available after 5pm, please handle with care, return cleaned..."
              rows={2}
            />
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="submit" disabled={isSaving} className="flex-1">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/c/${communitySlug}/items/${itemId}`)}
          >
            Cancel
          </Button>
        </div>

        {/* Delete Section */}
        <Card className="p-6 mt-6 border-destructive/50">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-destructive">Delete Item</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Permanently remove this item from the lending library. This action cannot be undone.
              </p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Item
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Item?</DialogTitle>
                    <DialogDescription>
                      This will permanently delete &quot;{formData.name}&quot; from the lending library.
                      This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Delete Item'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </Card>
      </form>
    </div>
  )
}
