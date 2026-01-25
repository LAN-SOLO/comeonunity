'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { SectionHeader } from '@/components/design-system/section-header'
import {
  ArrowLeft,
  CalendarIcon,
  Loader2,
  Send,
  Package,
  MapPin,
  CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { format, addDays } from 'date-fns'
import { cn } from '@/lib/utils'

interface Item {
  id: string
  name: string
  images: string[] | null
  category: string
  condition: string | null
  notes: string | null
  pickup_location: string | null
  owner: {
    id: string
    user_id: string
    display_name: string | null
    avatar_url: string | null
    unit_number: string | null
  }
}

export default function BorrowRequestPage() {
  const params = useParams()
  const router = useRouter()
  const communitySlug = params.communityId as string
  const itemId = params.itemId as string

  const [communityId, setCommunityId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [item, setItem] = useState<Item | null>(null)
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)
  const [startDate, setStartDate] = useState<Date | undefined>(addDays(new Date(), 1))
  const [endDate, setEndDate] = useState<Date | undefined>(addDays(new Date(), 8))
  const [message, setMessage] = useState('')

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
      await fetchData(community.id)
    } catch (err) {
      console.error('Failed to initialize:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchData = async (actualCommunityId: string) => {
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

      setCurrentMemberId(member.id)

      // Get item
      const { data: itemData, error } = await supabase
        .from('items')
        .select(`
          id,
          name,
          images,
          category,
          condition,
          notes,
          pickup_location,
          status,
          owner_id,
          owner:owner_id (
            id,
            user_id,
            display_name,
            avatar_url,
            unit_number
          )
        `)
        .eq('id', itemId)
        .eq('community_id', actualCommunityId)
        .single()

      if (error || !itemData) {
        toast.error('Item not found')
        router.push(`/c/${communitySlug}/items`)
        return
      }

      // Check if item is available
      if (itemData.status !== 'available') {
        toast.error('This item is not available for borrowing')
        router.push(`/c/${communitySlug}/items/${itemId}`)
        return
      }

      // Check if user is trying to borrow their own item
      if (itemData.owner_id === member.id) {
        toast.error("You can't borrow your own item")
        router.push(`/c/${communitySlug}/items/${itemId}`)
        return
      }

      // Process item data - owner comes as object from Supabase single relation
      const processedItem: Item = {
        id: itemData.id,
        name: itemData.name,
        images: itemData.images,
        category: itemData.category,
        condition: itemData.condition,
        notes: itemData.notes,
        pickup_location: itemData.pickup_location,
        owner: itemData.owner as unknown as Item['owner'],
      }
      setItem(processedItem)
    } catch (err) {
      console.error('Failed to fetch data:', err)
      toast.error('Failed to load item')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!startDate || !endDate) {
      toast.error('Please select dates')
      return
    }

    if (startDate >= endDate) {
      toast.error('End date must be after start date')
      return
    }

    if (!currentMemberId || !item) {
      toast.error('Not authorized')
      return
    }

    setIsSubmitting(true)
    try {
      // Create borrow request
      const { data: borrowRequest, error } = await supabase
        .from('borrow_requests')
        .insert({
          community_id: communityId,
          item_id: itemId,
          borrower_id: currentMemberId,
          status: 'pending',
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          message: message.trim() || null,
        })
        .select()
        .single()

      if (error) throw error

      // Create notification for item owner
      await supabase
        .from('notifications')
        .insert({
          user_id: item.owner.user_id,
          community_id: communityId,
          type: 'borrow_request',
          title: 'New Borrow Request',
          message: `Someone wants to borrow your "${item.name}"`,
          data: { borrow_request_id: borrowRequest.id, item_id: itemId },
        })

      toast.success('Borrow request sent!')
      router.push(`/c/${communitySlug}/items/${itemId}`)
    } catch (err: unknown) {
      console.error('Submit failed:', err)
      const message = err instanceof Error ? err.message : 'Failed to send request'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const ownerName = item?.owner?.display_name || 'Member'
  const ownerInitials = ownerName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!item) {
    return null
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
        <h1 className="text-3xl font-bold tracking-tight">Request to Borrow</h1>
        <p className="text-muted-foreground mt-1">
          Send a borrow request to the item owner
        </p>
      </div>

      {/* Item Summary */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
            {item.images && item.images[0] ? (
              <Image
                src={item.images[0]}
                alt={item.name}
                fill
                sizes="64px"
                className="object-cover"
              />
            ) : (
              <Package className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{item.name}</h3>
            <p className="text-sm text-muted-foreground">
              {item.category}
              {item.condition && ` · ${item.condition}`}
            </p>
          </div>
          <Badge className="bg-green text-white">
            <CheckCircle className="h-3 w-3 mr-1" />
            Available
          </Badge>
        </div>
      </Card>

      {/* Owner Card */}
      <SectionHeader title="Item Owner" />
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={item.owner?.avatar_url || undefined} />
            <AvatarFallback>{ownerInitials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{ownerName}</p>
            {item.owner?.unit_number && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {item.owner.unit_number}
              </p>
            )}
          </div>
        </div>
      </Card>

      <form onSubmit={handleSubmit}>
        {/* Date Selection */}
        <SectionHeader title="Borrow Period" />
        <Card className="p-6 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => date < (startDate || new Date())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {startDate && endDate && startDate < endDate && (
            <p className="text-sm text-muted-foreground mt-4">
              Borrowing for {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days
            </p>
          )}
        </Card>

        {/* Message */}
        <SectionHeader title="Message (Optional)" />
        <Card className="p-6 mb-6">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a message for the owner... (e.g., what you need it for, preferred pickup time)"
            rows={4}
          />
        </Card>

        {/* Pickup Information */}
        {(item.pickup_location || item.notes) && (
          <>
            <SectionHeader title="Pickup Information" />
            <Card className="p-4 mb-6 bg-muted/50 space-y-2">
              {item.pickup_location && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Location</p>
                  <p className="text-sm">{item.pickup_location}</p>
                </div>
              )}
              {item.notes && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Notes</p>
                  <p className="text-sm">{item.notes}</p>
                </div>
              )}
            </Card>
          </>
        )}

        {/* Submit Button */}
        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Request
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
      </form>
    </div>
  )
}
