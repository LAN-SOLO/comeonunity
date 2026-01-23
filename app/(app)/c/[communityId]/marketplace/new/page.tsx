'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
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
  ArrowLeft,
  Upload,
  X,
  Plus,
  Image as ImageIcon,
  Truck,
  MapPin,
  Info,
  DollarSign,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  MARKETPLACE_CATEGORIES,
  calculateMarketplaceFee,
} from '@/lib/types/marketplace'

type Condition = 'new' | 'like_new' | 'good' | 'fair' | 'poor'

const conditionOptions: { value: Condition; label: string; description: string }[] = [
  { value: 'new', label: 'New', description: 'Unused, in original packaging' },
  { value: 'like_new', label: 'Like New', description: 'Excellent condition, barely used' },
  { value: 'good', label: 'Good', description: 'Normal wear, fully functional' },
  { value: 'fair', label: 'Fair', description: 'Visible wear, works well' },
  { value: 'poor', label: 'Poor', description: 'Heavy wear, may need repair' },
]

export default function NewListingPage() {
  const params = useParams()
  const router = useRouter()
  const communityId = params.communityId as string
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [condition, setCondition] = useState<Condition>('good')
  const [price, setPrice] = useState('')
  const [originalPrice, setOriginalPrice] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [shippingAvailable, setShippingAvailable] = useState(false)
  const [shippingCost, setShippingCost] = useState('')
  const [pickupAvailable, setPickupAvailable] = useState(true)
  const [pickupLocation, setPickupLocation] = useState('')

  useEffect(() => {
    loadCurrentMember()
  }, [communityId])

  const loadCurrentMember = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: member } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (member) {
      setCurrentMemberId(member.id)
    } else {
      toast.error('You must be a community member to create listings')
      router.push(`/c/${communityId}/marketplace`)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (images.length + files.length > 8) {
      toast.error('Maximum 8 images allowed')
      return
    }

    setUploading(true)
    const newImages: string[] = []

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`)
        continue
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`)
        continue
      }

      const ext = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`
      const filePath = `marketplace/${communityId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('listings')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        toast.error(`Failed to upload ${file.name}`)
        continue
      }

      const { data: { publicUrl } } = supabase.storage
        .from('listings')
        .getPublicUrl(filePath)

      newImages.push(publicUrl)
    }

    setImages([...images, ...newImages])
    setUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const moveImage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === images.length - 1) return

    const newImages = [...images]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    ;[newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]]
    setImages(newImages)
  }

  const handleSubmit = async (status: 'draft' | 'active') => {
    if (!currentMemberId) {
      toast.error('Please sign in to create a listing')
      return
    }

    if (!title.trim()) {
      toast.error('Please enter a title')
      return
    }

    if (!category) {
      toast.error('Please select a category')
      return
    }

    if (!price || parseFloat(price) < 0) {
      toast.error('Please enter a valid price')
      return
    }

    if (!shippingAvailable && !pickupAvailable) {
      toast.error('Please enable at least one delivery option')
      return
    }

    setLoading(true)
    try {
      const listingData = {
        community_id: communityId,
        seller_id: currentMemberId,
        title: title.trim(),
        description: description.trim() || null,
        category,
        condition,
        price: parseFloat(price),
        original_price: originalPrice ? parseFloat(originalPrice) : null,
        quantity: parseInt(quantity) || 1,
        images,
        status,
        shipping_available: shippingAvailable,
        shipping_cost: shippingAvailable && shippingCost ? parseFloat(shippingCost) : 0,
        pickup_available: pickupAvailable,
        pickup_location: pickupAvailable && pickupLocation.trim() ? pickupLocation.trim() : null,
      }

      const { data, error } = await supabase
        .from('marketplace_listings')
        .insert(listingData)
        .select()
        .single()

      if (error) throw error

      toast.success(status === 'draft' ? 'Draft saved!' : 'Listing published!')
      router.push(`/c/${communityId}/marketplace/${data.id}`)
    } catch (error) {
      console.error('Error creating listing:', error)
      toast.error('Failed to create listing')
    } finally {
      setLoading(false)
    }
  }

  const priceNum = parseFloat(price) || 0
  const feeInfo = calculateMarketplaceFee(priceNum)

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Back Button */}
      <Link
        href={`/c/${communityId}/marketplace`}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Marketplace
      </Link>

      <h1 className="text-2xl font-bold mb-6">Create New Listing</h1>

      <div className="space-y-6">
        {/* Images */}
        <Card className="p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Photos
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Add up to 8 photos. The first photo will be your cover image.
          </p>

          <div className="grid grid-cols-4 gap-4">
            {images.map((img, index) => (
              <div
                key={index}
                className={`aspect-square rounded-lg overflow-hidden relative group ${
                  index === 0 ? 'ring-2 ring-primary' : ''
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {index > 0 && (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveImage(index, 'up')}
                    >
                      ←
                    </Button>
                  )}
                  {index < images.length - 1 && (
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveImage(index, 'down')}
                    >
                      →
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeImage(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {index === 0 && (
                  <span className="absolute top-1 left-1 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                    Cover
                  </span>
                )}
              </div>
            ))}

            {images.length < 8 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="aspect-square rounded-lg border-2 border-dashed hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
              >
                {uploading ? (
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                ) : (
                  <>
                    <Plus className="h-6 w-6" />
                    <span className="text-xs">Add Photo</span>
                  </>
                )}
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
        </Card>

        {/* Basic Info */}
        <Card className="p-6">
          <h2 className="font-semibold mb-4">Basic Information</h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="What are you selling?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground text-right">
                {title.length}/100
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your item, including any defects or special features..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {description.length}/2000
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {MARKETPLACE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Condition *</Label>
                <Select value={condition} onValueChange={(v) => setCondition(v as Condition)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {conditionOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div>
                          <div>{opt.label}</div>
                          <div className="text-xs text-muted-foreground">{opt.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>

        {/* Pricing */}
        <Card className="p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pricing
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="originalPrice">Original Price (optional)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="originalPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    className="pl-7"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Show a crossed-out price</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity Available</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-32"
              />
            </div>

            {/* Fee Breakdown */}
            {priceNum > 0 && (
              <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Listing Price</span>
                  <span>${priceNum.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span className="flex items-center gap-1">
                    Service Fee ({feeInfo.feePercent.toFixed(1)}%)
                    <Info className="h-3 w-3" />
                  </span>
                  <span>-${feeInfo.fee.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>You&apos;ll Receive</span>
                  <span className="text-green-600">${feeInfo.netAmount.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Delivery Options */}
        <Card className="p-6">
          <h2 className="font-semibold mb-4">Delivery Options</h2>

          <div className="space-y-6">
            {/* Shipping */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Truck className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <Label className="text-base">Shipping</Label>
                  <p className="text-sm text-muted-foreground">
                    Ship the item to the buyer
                  </p>
                </div>
              </div>
              <Switch
                checked={shippingAvailable}
                onCheckedChange={setShippingAvailable}
              />
            </div>

            {shippingAvailable && (
              <div className="ml-8 space-y-2">
                <Label htmlFor="shippingCost">Shipping Cost</Label>
                <div className="relative w-48">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="shippingCost"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00 (free)"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>
            )}

            {/* Pickup */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <Label className="text-base">Local Pickup</Label>
                  <p className="text-sm text-muted-foreground">
                    Buyer picks up the item
                  </p>
                </div>
              </div>
              <Switch
                checked={pickupAvailable}
                onCheckedChange={setPickupAvailable}
              />
            </div>

            {pickupAvailable && (
              <div className="ml-8 space-y-2">
                <Label htmlFor="pickupLocation">Pickup Location (optional)</Label>
                <Input
                  id="pickupLocation"
                  placeholder="e.g., Office lobby, Building entrance"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Specific location will be shared after purchase
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => handleSubmit('draft')}
            disabled={loading}
          >
            Save as Draft
          </Button>
          <Button
            onClick={() => handleSubmit('active')}
            disabled={loading}
          >
            {loading ? 'Publishing...' : 'Publish Listing'}
          </Button>
        </div>
      </div>
    </div>
  )
}
