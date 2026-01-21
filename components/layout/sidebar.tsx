'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useCommunity } from '@/hooks/use-community'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationsDropdown } from '@/components/notifications/notifications-dropdown'
import { SearchCommand } from '@/components/search/search-command'
import { SearchButton } from '@/components/search/search-button'
import { ThemeToggleInline } from '@/components/theme'
import { LogoText } from '@/components/brand/logo-text'
import {
  Home,
  Users,
  Package,
  Calendar,
  Newspaper,
  Settings,
  Shield,
  ChevronDown,
  Plus,
  Building2,
  LogOut,
  User,
  ChevronsUpDown,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

export function Sidebar() {
  const pathname = usePathname()
  const { currentCommunity, communities, setCurrentCommunity, isAdmin, currentMember } = useCommunity()

  // Extract community ID from pathname
  const communityIdFromPath = pathname.match(/\/c\/([^/]+)/)?.[1]

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: `/c/${communityIdFromPath}`, icon: Home },
    { label: 'Members', href: `/c/${communityIdFromPath}/members`, icon: Users },
    { label: 'Items', href: `/c/${communityIdFromPath}/items`, icon: Package },
    { label: 'Calendar', href: `/c/${communityIdFromPath}/calendar`, icon: Calendar },
    { label: 'News', href: `/c/${communityIdFromPath}/news`, icon: Newspaper },
    { label: 'Admin', href: `/c/${communityIdFromPath}/admin`, icon: Shield, adminOnly: true },
  ]

  const filteredNavItems = navItems.filter(item => !item.adminOnly || isAdmin)

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      {/* Logo and Notifications */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-neutral-200 dark:border-neutral-800">
        <Link href="/" className="flex items-center">
          <LogoText size="sm" />
        </Link>
        {communityIdFromPath && (
          <NotificationsDropdown communityId={communityIdFromPath} />
        )}
      </div>

      {/* Community Selector */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <div className="flex items-center gap-2 truncate">
                {currentCommunity?.logo_url ? (
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={currentCommunity.logo_url} />
                    <AvatarFallback>{currentCommunity.name[0]}</AvatarFallback>
                  </Avatar>
                ) : (
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="truncate">
                  {currentCommunity?.name || 'Select community'}
                </span>
              </div>
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Your Communities</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {communities.map((community) => (
              <DropdownMenuItem
                key={community.id}
                onClick={() => setCurrentCommunity(community)}
                className="cursor-pointer"
              >
                <Link href={`/c/${community.id}`} className="flex items-center gap-2 w-full">
                  {community.logo_url ? (
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={community.logo_url} />
                      <AvatarFallback>{community.name[0]}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <Building2 className="h-4 w-4" />
                  )}
                  <span className="truncate">{community.name}</span>
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/communities/new" className="flex items-center gap-2 cursor-pointer">
                <Plus className="h-4 w-4" />
                Create Community
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/communities/join" className="flex items-center gap-2 cursor-pointer">
                <Users className="h-4 w-4" />
                Join Community
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Search */}
      <div className="p-4">
        <SearchButton />
        <SearchCommand communityId={communityIdFromPath} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {communityIdFromPath && filteredNavItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== `/c/${communityIdFromPath}` && pathname.startsWith(item.href))
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-black text-white dark:bg-white dark:text-black'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-black dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom section - User menu */}
      <div className="p-4 mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={currentMember?.avatar_url || undefined} />
                <AvatarFallback>
                  {currentMember?.display_name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium truncate">
                  {currentMember?.display_name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {currentMember?.role || 'Member'}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" sideOffset={4} className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                <User className="h-4 w-4" />
                Account Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings/security" className="flex items-center gap-2 cursor-pointer">
                <Shield className="h-4 w-4" />
                Security
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <ThemeToggleInline />
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <form action="/api/auth/signout" method="post">
                <button type="submit" className="flex items-center gap-2 w-full text-destructive">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
