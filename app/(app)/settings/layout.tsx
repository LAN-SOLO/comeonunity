'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  User,
  Mail,
  Shield,
  Bell,
  Globe,
  Download,
  Trash2,
  Palette,
  ChevronLeft,
  Home,
} from 'lucide-react'

const settingsNav = [
  {
    title: 'Account',
    items: [
      { href: '/settings/profile', label: 'Edit Profile', icon: User },
      { href: '/settings/email', label: 'Email', icon: Mail },
    ],
  },
  {
    title: 'Security',
    items: [
      { href: '/settings/security', label: 'Security', icon: Shield },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { href: '/settings/appearance', label: 'Appearance', icon: Palette },
      { href: '/settings/notifications', label: 'Notifications', icon: Bell },
      { href: '/settings/language', label: 'Language & Region', icon: Globe },
    ],
  },
  {
    title: 'Your Data',
    items: [
      { href: '/settings/export', label: 'Export Data', icon: Download },
      { href: '/settings/delete-account', label: 'Delete Account', icon: Trash2, destructive: true },
    ],
  },
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isRootSettings = pathname === '/settings'

  return (
    <div className="min-h-screen">
      {/* Show sidebar menu only on sub-pages */}
      {!isRootSettings && (
        <div className="flex">
          {/* Settings Sidebar */}
          <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card/50 min-h-screen sticky top-0">
            <div className="p-4 border-b border-border">
              <Link
                href="/settings"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                All Settings
              </Link>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 space-y-6">
              {settingsNav.map((section) => (
                <div key={section.title}>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {section.title}
                  </h3>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors',
                            isActive
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                            item.destructive && !isActive && 'text-destructive hover:text-destructive'
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>
            <div className="p-4 border-t border-border">
              <Link
                href="/"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Home className="h-4 w-4" />
                Back to Home
              </Link>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      )}

      {/* Root settings page - no sidebar */}
      {isRootSettings && children}
    </div>
  )
}
