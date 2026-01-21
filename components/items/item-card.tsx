'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Package, MapPin } from 'lucide-react'

export interface ItemCardProps {
  item: {
    id: string
    name: string
    description: string | null
    category: string
    status: 'available' | 'borrowed' | 'unavailable'
    images: string[] | null
    condition: string | null
    owner: {
      id: string
      display_name: string | null
      avatar_url: string | null
      unit_number: string | null
    }
  }
  communityId: string
  variant?: 'card' | 'list'
}

const categoryLabels: Record<string, string> = {
  tools: 'Tools',
  kitchen: 'Kitchen',
  electronics: 'Electronics',
  sports: 'Sports & Outdoors',
  garden: 'Garden',
  baby: 'Baby & Kids',
  books: 'Books',
  games: 'Games & Toys',
  music: 'Music',
  diy: 'DIY & Craft',
  cleaning: 'Cleaning',
  party: 'Party Supplies',
  travel: 'Travel',
  other: 'Other',
}

const statusColors: Record<string, string> = {
  available: 'bg-green text-white',
  borrowed: 'bg-amber-500 text-white',
  unavailable: 'bg-muted text-muted-foreground',
}

const statusLabels: Record<string, string> = {
  available: 'Available',
  borrowed: 'Borrowed',
  unavailable: 'Unavailable',
}

export function ItemCard({ item, communityId, variant = 'card' }: ItemCardProps) {
  const ownerName = item.owner?.display_name || 'Member'
  const ownerInitials = ownerName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  if (variant === 'list') {
    return (
      <Link href={`/c/${communityId}/items/${item.id}`}>
        <div className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0">
          <div className="relative w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
            {item.images && item.images[0] ? (
              <Image
                src={item.images[0]}
                alt={item.name}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <Package className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium truncate">{item.name}</h3>
              <Badge className={statusColors[item.status]}>
                {statusLabels[item.status]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {categoryLabels[item.category] || item.category}
              {item.condition && ` · ${item.condition}`}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Avatar className="h-5 w-5">
                <AvatarImage src={item.owner?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">{ownerInitials}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{ownerName}</span>
              {item.owner?.unit_number && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {item.owner.unit_number}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link href={`/c/${communityId}/items/${item.id}`}>
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
          {item.images && item.images[0] ? (
            <Image
              src={item.images[0]}
              alt={item.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 300px"
            />
          ) : (
            <Package className="h-12 w-12 text-muted-foreground" />
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold truncate">{item.name}</h3>
            <Badge className={`${statusColors[item.status]} shrink-0`}>
              {statusLabels[item.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {categoryLabels[item.category] || item.category}
          </p>
          <div className="flex items-center gap-2 pt-3 border-t border-border">
            <Avatar className="h-6 w-6">
              <AvatarImage src={item.owner?.avatar_url || undefined} />
              <AvatarFallback className="text-xs">{ownerInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{ownerName}</p>
              {item.owner?.unit_number && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {item.owner.unit_number}
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}

export { categoryLabels, statusColors, statusLabels }
