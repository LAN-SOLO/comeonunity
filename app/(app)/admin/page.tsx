import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users,
  Building2,
  Shield,
  AlertTriangle,
  Activity,
  Settings,
  FileText,
} from 'lucide-react'
import { format, subDays } from 'date-fns'

export default async function PlatformAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Use admin client for platform-wide queries
  const adminClient = createAdminClient()

  const thirtyDaysAgo = subDays(new Date(), 30).toISOString()
  const sevenDaysAgo = subDays(new Date(), 7).toISOString()

  // Get platform-wide stats
  const [
    totalUsers,
    newUsersThisMonth,
    activeUsers,
    totalCommunities,
    newCommunitiesThisMonth,
    activeCommunities,
    totalItems,
    totalEvents,
    recentAuditLogs,
    pendingReports,
  ] = await Promise.all([
    // Total users
    adminClient
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'deleted'),
    // New users this month
    adminClient
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo),
    // Active users (logged in last 7 days)
    adminClient
      .from('user_sessions')
      .select('user_id', { count: 'exact', head: true })
      .gte('last_active_at', sevenDaysAgo)
      .is('revoked_at', null),
    // Total communities
    adminClient
      .from('communities')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'deleted'),
    // New communities this month
    adminClient
      .from('communities')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo),
    // Active communities
    adminClient
      .from('communities')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    // Total items
    adminClient
      .from('items')
      .select('id', { count: 'exact', head: true }),
    // Total events
    adminClient
      .from('events')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'draft'),
    // Recent audit logs (security events)
    adminClient
      .from('audit_logs')
      .select('id, action, user_email, created_at, severity')
      .in('severity', ['warning', 'error', 'critical'])
      .order('created_at', { ascending: false })
      .limit(5),
    // Pending reports count
    adminClient
      .from('moderation_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ])

  const stats = [
    {
      label: 'Total Users',
      value: totalUsers.count || 0,
      subtext: `+${newUsersThisMonth.count || 0} this month`,
      icon: Users,
      href: '/admin/users',
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Active Users',
      value: activeUsers.count || 0,
      subtext: 'Last 7 days',
      icon: Activity,
      href: '/admin/users',
      color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'Communities',
      value: totalCommunities.count || 0,
      subtext: `${activeCommunities.count || 0} active`,
      icon: Building2,
      href: '/admin/communities',
      color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
    },
    {
      label: 'Pending Reports',
      value: pendingReports.count || 0,
      subtext: 'Awaiting review',
      icon: AlertTriangle,
      href: '/admin/reports',
      color: pendingReports.count && pendingReports.count > 0
        ? 'text-red-600 bg-red-100 dark:bg-red-900/30'
        : 'text-gray-600 bg-gray-100 dark:bg-gray-900/30',
    },
  ]

  const quickActions = [
    {
      label: 'Manage Users',
      description: 'View, suspend, or modify user accounts',
      icon: Users,
      href: '/admin/users',
    },
    {
      label: 'Manage Communities',
      description: 'Review and moderate communities',
      icon: Building2,
      href: '/admin/communities',
    },
    {
      label: 'View Audit Logs',
      description: 'Review security and activity logs',
      icon: FileText,
      href: '/admin/audit-logs',
    },
    {
      label: 'Platform Settings',
      description: 'Configure global platform settings',
      icon: Settings,
      href: '/admin/settings',
    },
  ]

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Platform Admin</h1>
        </div>
        <p className="text-muted-foreground">
          Manage users, communities, and platform settings
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-xs text-muted-foreground">{stat.subtext}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {quickActions.map((action) => (
              <Link key={action.label} href={action.href}>
                <Card className="p-4 hover:shadow-md transition-shadow h-full">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <action.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{action.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Security Events */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Security Events</h2>
          <Card className="p-4">
            {recentAuditLogs.data && recentAuditLogs.data.length > 0 ? (
              <div className="space-y-3">
                {recentAuditLogs.data.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className={`p-1.5 rounded-full ${
                      log.severity === 'critical' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' :
                      log.severity === 'error' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30' :
                      'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30'
                    }`}>
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {log.action}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {log.user_email || 'System'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), 'MMM d, HH:mm')}
                      </p>
                    </div>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
                  <Link href="/admin/audit-logs">
                    View all logs
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent security events
              </p>
            )}
          </Card>

          {/* Platform Metrics */}
          <Card className="p-4 mt-4">
            <h3 className="font-medium mb-3">Platform Metrics</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Items</span>
                <span className="font-medium">{totalItems.count || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Events</span>
                <span className="font-medium">{totalEvents.count || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">New Communities</span>
                <span className="font-medium">+{newCommunitiesThisMonth.count || 0} this month</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
