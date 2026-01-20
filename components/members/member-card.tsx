'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Mail,
  Phone,
  MapPin,
  Sparkles,
  MessageCircle,
  ChevronRight,
} from 'lucide-react'

export interface MemberCardProps {
  member: {
    id: string
    display_name: string | null
    avatar_url: string | null
    bio: string | null
    unit_number: string | null
    phone: string | null
    show_phone: boolean
    show_email: boolean
    email?: string
    skills: string[] | null
    skills_description: string | null
    available_for_help: boolean
    role: string
    joined_at: string
  }
  communityId: string
  variant?: 'card' | 'list'
  showContact?: boolean
  isNew?: boolean
}

const skillLabels: Record<string, string> = {
  // Handwork
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  carpentry: 'Carpentry',
  painting: 'Painting',
  gardening: 'Gardening',
  // Tech
  computer_help: 'Computer Help',
  smartphone_help: 'Smartphone Help',
  printer_setup: 'Printer Setup',
  wifi_setup: 'WiFi Setup',
  // Languages
  german_help: 'German Help',
  english_help: 'English Help',
  translation: 'Translation',
  // Care
  pet_sitting: 'Pet Sitting',
  plant_care: 'Plant Care',
  elderly_assistance: 'Elderly Assistance',
  childcare: 'Childcare',
  // Transport
  driving: 'Driving',
  moving_help: 'Moving Help',
  errands: 'Errands',
  // Other
  cooking: 'Cooking',
  tutoring: 'Tutoring',
  music_lessons: 'Music Lessons',
  fitness: 'Fitness',
  photography: 'Photography',
}

export function MemberCard({
  member,
  communityId,
  variant = 'card',
  showContact = true,
  isNew = false,
}: MemberCardProps) {
  const displayName = member.display_name || 'Member'
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  if (variant === 'list') {
    return (
      <Link href={`/c/${communityId}/members/${member.id}`}>
        <div className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0">
          <Avatar className="h-12 w-12">
            <AvatarImage src={member.avatar_url || undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{displayName}</p>
              {member.role === 'admin' && (
                <Badge variant="secondary" className="text-xs">Admin</Badge>
              )}
              {member.role === 'moderator' && (
                <Badge variant="outline" className="text-xs">Mod</Badge>
              )}
              {isNew && (
                <Badge variant="default" className="text-xs bg-green">
                  <Sparkles className="h-3 w-3 mr-1" />
                  New
                </Badge>
              )}
            </div>
            {member.unit_number && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {member.unit_number}
              </p>
            )}
            {member.skills && member.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {member.skills.slice(0, 3).map((skill) => (
                  <Badge key={skill} variant="outline" className="text-xs">
                    {skillLabels[skill] || skill}
                  </Badge>
                ))}
                {member.skills.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{member.skills.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </Link>
    )
  }

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <Link href={`/c/${communityId}/members/${member.id}`}>
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={member.avatar_url || undefined} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{displayName}</h3>
              {member.role === 'admin' && (
                <Badge variant="secondary" className="text-xs">Admin</Badge>
              )}
              {member.role === 'moderator' && (
                <Badge variant="outline" className="text-xs">Mod</Badge>
              )}
            </div>
            {member.unit_number && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                <MapPin className="h-3 w-3" />
                {member.unit_number}
              </p>
            )}
            {member.bio && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {member.bio}
              </p>
            )}
            {isNew && (
              <Badge variant="default" className="text-xs bg-green mb-2">
                <Sparkles className="h-3 w-3 mr-1" />
                New Member
              </Badge>
            )}
          </div>
        </div>
      </Link>

      {member.skills && member.skills.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Skills</p>
          <div className="flex flex-wrap gap-1">
            {member.skills.slice(0, 4).map((skill) => (
              <Badge key={skill} variant="outline" className="text-xs">
                {skillLabels[skill] || skill}
              </Badge>
            ))}
            {member.skills.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{member.skills.length - 4}
              </Badge>
            )}
          </div>
        </div>
      )}

      {showContact && (member.show_email || member.show_phone) && (
        <div className="mt-3 pt-3 border-t border-border flex gap-2">
          {member.show_email && member.email && (
            <Button variant="outline" size="sm" asChild className="flex-1">
              <a href={`mailto:${member.email}`}>
                <Mail className="h-4 w-4 mr-2" />
                Email
              </a>
            </Button>
          )}
          {member.show_phone && member.phone && (
            <Button variant="outline" size="sm" asChild className="flex-1">
              <a href={`tel:${member.phone}`}>
                <Phone className="h-4 w-4 mr-2" />
                Call
              </a>
            </Button>
          )}
        </div>
      )}

      {member.available_for_help && (
        <div className="mt-3 flex items-center gap-2 text-sm text-green">
          <Sparkles className="h-4 w-4" />
          Available to help
        </div>
      )}
    </Card>
  )
}
