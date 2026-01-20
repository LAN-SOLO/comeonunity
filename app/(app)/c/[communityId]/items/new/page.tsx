'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SectionHeader } from '@/components/design-system/section-header'
import {
  ArrowLeft,
  Upload,
  X,
  Loader2,
  Save,
  Package,
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

export default function NewItemPage() {
  const params = useParams()
  const router = useRouter()
  const communitySlug = params.communityId as string

  const [communityId, setCommunityId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    condition: 'good',
    pickup_notes: '',
  })

  const supabase = createClient()

  useEffect(() => {
    initializePage()
  }, [communitySlug])

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
      await checkMembership(community.id)
    } catch (err) {
      console.error('Failed to initialize:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const checkMembership = async (actualCommunityId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: member } = await supabase
        .from('community_members')
        .select('id')
        .eq('community_id', actualCommunityId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!member) {
        toast.error('You must be a member to add items')
        router.push(`/c/${communitySlug}`)
        return
      }

      setCurrentMemberId(member.id)
    } catch (err) {
      console.error('Failed to check membership:', err)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (images.length + files.length > 5) {
      toast.error('Maximum 5 images allowed')
      return
    }

    setIsUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const newImages: string[] = []

      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image`)
          continue
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 5MB)`)
          continue
        }

        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('item-images')
          .upload(fileName, file)

        if (uploadError) {
          console.error('Upload error:', uploadError)
          toast.error(`Failed to upload ${file.name}`)
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
    } catch (err: any) {
      console.error('Upload failed:', err)
      toast.error(err.message || 'Failed to upload images')
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

    if (!currentMemberId) {
      toast.error('Not authorized')
      return
    }

    setIsSaving(true)
    try {
      const { data: item, error } = await supabase
        .from('items')
        .insert({
          community_id: communityId,
          owner_id: currentMemberId,
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          category: formData.category,
          condition: formData.condition,
          pickup_notes: formData.pickup_notes.trim() || null,
          images: images.length > 0 ? images : null,
          status: 'available',
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Item added successfully!')
      router.push(`/c/${communitySlug}/items/${item.id}`)
    } catch (err: any) {
      console.error('Save failed:', err)
      toast.error(err.message || 'Failed to add item')
    } finally {
      setIsSaving(false)
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
          href={`/c/${communitySlug}/items`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Lending Library
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Add New Item</h1>
        <p className="text-muted-foreground mt-1">
          Share an item with your community
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Images Section */}
        <SectionHeader title="Photos" />
        <Card className="p-6 mb-6">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
            {images.map((image, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                <img
                  src={image}
                  alt={`Item ${index + 1}`}
                  className="w-full h-full object-cover"
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
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Add up to 5 photos. The first photo will be the cover image.
          </p>
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
            <Label htmlFor="pickup_notes">Pickup Notes</Label>
            <Textarea
              id="pickup_notes"
              value={formData.pickup_notes}
              onChange={(e) => setFormData({ ...formData, pickup_notes: e.target.value })}
              placeholder="e.g., Available for pickup after 5pm, leave at front door..."
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Instructions for how borrowers can pick up the item
            </p>
          </div>
        </Card>

        {/* Submit Button */}
        <div className="flex gap-3">
          <Button type="submit" disabled={isSaving} className="flex-1">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Package className="mr-2 h-4 w-4" />
                Add Item
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/c/${communitySlug}/items`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
