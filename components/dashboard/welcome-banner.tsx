'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users,
  Package,
  Calendar,
  Settings,
  X,
  ChevronRight,
  Sparkles,
  LucideIcon,
} from 'lucide-react'

interface QuickStartItem {
  icon: LucideIcon
  label: string
  description: string
  getHref: (communityId: string) => string
}

const quickStartItems: QuickStartItem[] = [
  {
    icon: Users,
    label: 'Browse Members',
    description: 'See who is in your community',
    getHref: (communityId) => `/c/${communityId}/members`,
  },
  {
    icon: Package,
    label: 'Explore Items',
    description: 'Find items to borrow',
    getHref: (communityId) => `/c/${communityId}/items`,
  },
  {
    icon: Calendar,
    label: 'View Events',
    description: 'See upcoming community events',
    getHref: (communityId) => `/c/${communityId}/calendar`,
  },
  {
    icon: Settings,
    label: 'Edit Profile',
    description: 'Complete your profile',
    getHref: (communityId) => `/c/${communityId}/members/me/edit`,
  },
]

interface WelcomeBannerProps {
  communityId: string
  memberName: string | null
  isNewMember?: boolean
}

export function WelcomeBanner({ communityId, memberName, isNewMember = false }: WelcomeBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false)

  if (isDismissed) return null

  return (
    <Card className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8"
        onClick={() => setIsDismissed(true)}
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="p-6">
        <div className="flex items-center gap-2 mb-2">
          {isNewMember && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" />
              New Member
            </span>
          )}
        </div>

        <h2 className="text-xl font-bold mb-1">
          Welcome{memberName ? `, ${memberName.split(' ')[0]}` : ''}!
        </h2>
        <p className="text-muted-foreground mb-4">
          Here are some things you can do to get started in your community.
        </p>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {quickStartItems.map((item) => (
            <Link
              key={item.label}
              href={item.getHref(communityId)}
              className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm group-hover:text-primary transition-colors">
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.description}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      </div>
    </Card>
  )
}
