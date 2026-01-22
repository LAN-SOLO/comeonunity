import { createDeveloperManager } from '@/lib/dev';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  Shield,
  FlaskConical,
  FileText,
  History,
  Key,
  Clock,
  CheckCircle2,
  XCircle,
  Github,
} from 'lucide-react';

export default async function DevDashboardPage() {
  const manager = await createDeveloperManager();

  if (!manager) {
    return <div>Unauthorized</div>;
  }

  const profile = await manager.getProfile();
  const recentLogs = await manager.getAuditLog(5);
  const docs = await manager.listDocs();

  await manager.logAction('view_dashboard');

  if (!profile) {
    return <div>Profile not found</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Shield className="h-8 w-8 text-orange-500" />
          Developer Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Secure testing and development environment
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Developer Profile
            <Badge variant="outline" className="text-orange-500 border-orange-500">
              {profile.access_level.toUpperCase()}
            </Badge>
          </CardTitle>
          <CardDescription>{profile.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              {profile.can_test_plans ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">Test Plans</span>
            </div>
            <div className="flex items-center gap-2">
              {profile.can_simulate_subscriptions ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">Simulate Subscriptions</span>
            </div>
            <div className="flex items-center gap-2">
              {profile.can_access_all_communities ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">All Communities</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {profile.last_dev_access
                  ? new Date(profile.last_dev_access).toLocaleString('de-DE')
                  : 'First access'}
              </span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Key className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Developer Key:</span>
              <code className="px-2 py-0.5 bg-background rounded text-xs font-mono">
                {profile.developer_key.slice(0, 8)}...{profile.developer_key.slice(-8)}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {profile.can_test_plans && (
          <Link href="/dev/plans">
            <Card className="h-full hover:border-orange-500/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FlaskConical className="h-5 w-5 text-orange-500" />
                  Test Plans
                </CardTitle>
                <CardDescription>
                  Simulate different subscription tiers to test features
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        )}

        <Link href="/dev/docs">
          <Card className="h-full hover:border-orange-500/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-orange-500" />
                Secure Docs
                {docs.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {docs.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Encrypted documentation and notes
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/dev/audit">
          <Card className="h-full hover:border-orange-500/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="h-5 w-5 text-orange-500" />
                Audit Log
              </CardTitle>
              <CardDescription>
                View all developer actions and access history
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/dev/github">
          <Card className="h-full hover:border-orange-500/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Github className="h-5 w-5 text-orange-500" />
                GitHub Pipelines
              </CardTitle>
              <CardDescription>
                Real-time CI/CD status and commits
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono text-xs">
                      {log.action}
                    </Badge>
                    {log.details && (
                      <span className="text-xs text-muted-foreground">
                        {JSON.stringify(log.details).slice(0, 50)}...
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString('de-DE')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
