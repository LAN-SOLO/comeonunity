'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useCommunity } from '@/hooks/use-community'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationsDropdown } from '@/components/notifications/notifications-dropdown'
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
  Plus,
  Building2,
  LogOut,
  User,
  Menu,
  ChevronsUpDown,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { currentCommunity, communities, setCurrentCommunity, isAdmin, currentMember } = useCommunity()

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
    <header className="lg:hidden sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">
        {/* Menu button */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="-ml-2">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            {/* Logo */}
            <div className="h-14 flex items-center px-6 border-b border-black/20 dark:border-white/50">
              <Link href="/" className="flex items-center" onClick={() => setOpen(false)}>
                <LogoText size="sm" />
              </Link>
            </div>

            {/* Community Selector */}
            <div className="p-4 border-b border-black/20 dark:border-white/50">
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
                      onClick={() => {
                        setCurrentCommunity(community)
                        setOpen(false)
                      }}
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
                    <Link
                      href="/communities/new"
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => setOpen(false)}
                    >
                      <Plus className="h-4 w-4" />
                      Create Community
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                        onClick={() => setOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>

            {/* User section */}
            <div className="p-4 border-t border-black/20 dark:border-white/50">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={currentMember?.avatar_url || undefined} />
                  <AvatarFallback>
                    {currentMember?.display_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {currentMember?.display_name || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {currentMember?.role || 'Member'}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <Link
                  href="/settings"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Settings className="h-5 w-5" />
                  Settings
                </Link>
                <div className="px-1 py-2">
                  <ThemeToggleInline />
                </div>
                <form action="/api/auth/signout" method="post">
                  <button
                    type="submit"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 w-full"
                  >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                  </button>
                </form>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Center - Community name */}
        <h1 className="text-sm font-semibold truncate">
          {currentCommunity?.name || 'ComeOnUnity'}
        </h1>

        {/* Right - Notifications */}
        {communityIdFromPath && (
          <NotificationsDropdown communityId={communityIdFromPath} />
        )}
      </div>
    </header>
  )
}
