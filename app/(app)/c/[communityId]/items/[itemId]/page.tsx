import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { SectionHeader } from '@/components/design-system/section-header'
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit,
  Package,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { BorrowRequestForm } from '@/components/items/borrow-request-form'
import { categoryLabels, statusColors, statusLabels } from '@/components/items/item-card'

interface Props {
  params: Promise<{ communityId: string; itemId: string }>
}

const conditionLabels: Record<string, string> = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
  worn: 'Worn',
}

export default async function ItemDetailPage({ params }: Props) {
  const { communityId: communitySlug, itemId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

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

  const { data: community } = await communityQuery.single()

  if (!community) {
    notFound()
  }

  // Redirect if accessed by ID instead of slug
  if (communitySlug !== community.slug && communitySlug === community.id) {
    redirect(`/c/${community.slug}/items/${itemId}`)
  }

  // Get current member
  const { data: currentMember } = await supabase
    .from('community_members')
    .select('id')
    .eq('community_id', community.id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!currentMember) {
    redirect(`/c/${community.slug}`)
  }

  // Get item with owner details
  const { data: item } = await supabase
    .from('items')
    .select(`
      id,
      name,
      description,
      category,
      status,
      images,
      condition,
      notes,
      pickup_location,
      created_at,
      owner_id,
      owner:owner_id (
        id,
        user_id,
        display_name,
        avatar_url,
        unit_number,
        phone,
        show_phone,
        show_email
      )
    `)
    .eq('id', itemId)
    .eq('community_id', community.id)
    .single()

  if (!item) {
    notFound()
  }

  const owner = item.owner as any
  const isOwner = owner?.id === currentMember.id
  const ownerName = owner?.display_name || 'Member'
  const ownerInitials = ownerName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const ownerPhone = owner?.show_phone ? owner?.phone : null

  // Get active borrow request if any
  const { data: activeBorrowRequest } = await supabase
    .from('borrow_requests')
    .select(`
      id,
      status,
      start_date,
      end_date,
      borrower:borrower_id (
        id,
        display_name,
        avatar_url
      )
    `)
    .eq('item_id', itemId)
    .in('status', ['pending', 'approved', 'active'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href={`/c/${community.slug}/items`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Lending Library
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Image Gallery */}
        <div>
          <Card className="overflow-hidden">
            <div className="aspect-square bg-muted flex items-center justify-center">
              {item.images && item.images[0] ? (
                <img
                  src={item.images[0]}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="h-24 w-24 text-muted-foreground opacity-50" />
              )}
            </div>
            {item.images && item.images.length > 1 && (
              <div className="p-2 flex gap-2 overflow-x-auto">
                {item.images.slice(1).map((image: string, index: number) => (
                  <div
                    key={index}
                    className="w-20 h-20 rounded-lg bg-muted flex-shrink-0 overflow-hidden"
                  >
                    <img
                      src={image}
                      alt={`${item.name} ${index + 2}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Item Details */}
        <div>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={statusColors[item.status as keyof typeof statusColors]}>
                  {statusLabels[item.status as keyof typeof statusLabels]}
                </Badge>
                <Badge variant="outline">
                  {categoryLabels[item.category] || item.category}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold">{item.name}</h1>
            </div>
            {isOwner && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/c/${community.slug}/items/${itemId}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </Button>
            )}
          </div>

          {item.condition && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <CheckCircle className="h-4 w-4" />
              Condition: {conditionLabels[item.condition] || item.condition}
            </div>
          )}

          {item.description && (
            <div className="mb-6">
              <p className="text-muted-foreground">{item.description}</p>
            </div>
          )}

          {(item.pickup_location || item.notes) && (
            <Card className="p-4 mb-6 bg-muted/50">
              {item.pickup_location && (
                <div className="mb-2">
                  <h3 className="font-medium mb-1 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Pickup Location
                  </h3>
                  <p className="text-sm text-muted-foreground">{item.pickup_location}</p>
                </div>
              )}
              {item.notes && (
                <div>
                  <h3 className="font-medium mb-1">Notes</h3>
                  <p className="text-sm text-muted-foreground">{item.notes}</p>
                </div>
              )}
            </Card>
          )}

          <div className="text-sm text-muted-foreground flex items-center gap-1 mb-6">
            <Calendar className="h-4 w-4" />
            Listed {new Date(item.created_at).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>

          {/* Borrow Request Form */}
          {!isOwner && item.status === 'available' && !activeBorrowRequest && (
            <div className="mb-6">
              <BorrowRequestForm
                itemId={itemId}
                itemName={item.name}
                ownerUserId={owner?.user_id}
                communityId={community.id}
                communitySlug={community.slug}
                currentMemberId={currentMember.id}
              />
            </div>
          )}

          {/* Owner notice */}
          {isOwner && item.status === 'available' && !activeBorrowRequest && (
            <Card className="p-4 mb-6 bg-muted/50 text-center">
              <p className="text-sm text-muted-foreground">
                This is your item. Other members can request to borrow it.
              </p>
            </Card>
          )}

          {/* Active Booking Info */}
          {activeBorrowRequest && (
            <Card className="p-4 mb-6 border-amber-500/50 bg-amber-500/5">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                {activeBorrowRequest.status === 'pending' && 'Pending Request'}
                {activeBorrowRequest.status === 'approved' && 'Approved Booking'}
                {activeBorrowRequest.status === 'active' && 'Currently Borrowed'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {new Date(activeBorrowRequest.start_date).toLocaleDateString()} - {new Date(activeBorrowRequest.end_date).toLocaleDateString()}
              </p>
              {isOwner && (
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link href={`/c/${community.slug}/items/${itemId}/requests`}>
                    View Requests
                  </Link>
                </Button>
              )}
            </Card>
          )}

          {/* Owner Card */}
          <SectionHeader title="Owner" />
          <Card className="p-4">
            <Link href={`/c/${community.slug}/members/${owner?.id}`}>
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={owner?.avatar_url || undefined} />
                  <AvatarFallback>{ownerInitials}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{ownerName}</p>
                  {owner?.unit_number && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {owner.unit_number}
                    </p>
                  )}
                </div>
              </div>
            </Link>

            {!isOwner && ownerPhone && (
              <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={`tel:${ownerPhone}`}>
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </a>
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
