'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Home,
  Flame,
  Car,
  Dumbbell,
  Waves,
  Bike,
  Warehouse,
  TreePine,
  Users,
  Calendar,
  Clock,
  MapPin,
} from 'lucide-react'

export interface ResourceCardProps {
  resource: {
    id: string
    name: string
    description: string | null
    type: string
    location: string | null
    capacity: number | null
    image_url: string | null
    requires_approval: boolean
    available: boolean
  }
  communityId: string
  nextAvailable?: string | null
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  room: Home,
  bbq: Flame,
  parking: Car,
  gym: Dumbbell,
  pool: Waves,
  bike_storage: Bike,
  storage: Warehouse,
  garden: TreePine,
  common_area: Users,
  other: Calendar,
}

const typeLabels: Record<string, string> = {
  room: 'Room',
  bbq: 'BBQ Area',
  parking: 'Parking',
  gym: 'Gym',
  pool: 'Pool',
  bike_storage: 'Bike Storage',
  storage: 'Storage',
  garden: 'Garden',
  common_area: 'Common Area',
  other: 'Other',
}

export function ResourceCard({ resource, communityId, nextAvailable }: ResourceCardProps) {
  const Icon = typeIcons[resource.type] || Calendar

  return (
    <Link href={`/c/${communityId}/resources/${resource.id}`}>
      <Card className="overflow-hidden hover:shadow-md transition-shadow h-full">
        <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
          {resource.image_url ? (
            <img
              src={resource.image_url}
              alt={resource.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Icon className="h-12 w-12 text-muted-foreground opacity-50" />
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold">{resource.name}</h3>
            {!resource.available && (
              <Badge variant="secondary">Unavailable</Badge>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Icon className="h-4 w-4" />
            <span>{typeLabels[resource.type] || resource.type}</span>
          </div>

          {resource.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <MapPin className="h-4 w-4" />
              <span>{resource.location}</span>
            </div>
          )}

          {resource.capacity && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Users className="h-4 w-4" />
              <span>Capacity: {resource.capacity}</span>
            </div>
          )}

          {resource.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {resource.description}
            </p>
          )}

          <div className="pt-3 border-t border-border flex items-center justify-between">
            {resource.requires_approval ? (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Requires Approval
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-green border-green">
                Instant Booking
              </Badge>
            )}
            {nextAvailable && (
              <span className="text-xs text-muted-foreground">
                Next: {nextAvailable}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  )
}

export { typeIcons, typeLabels }
