import { redirect } from 'next/navigation';
import { createDeveloperManager } from '@/lib/dev';
import Link from 'next/link';
import { Code2, FlaskConical, FileText, History, Home, Shield, Github } from 'lucide-react';

interface DevLayoutProps {
  children: React.ReactNode;
}

export default async function DevLayout({ children }: DevLayoutProps) {
  const manager = await createDeveloperManager();

  if (!manager) {
    redirect('/');
  }

  const profile = await manager.getProfile();
  const accessLevel = await manager.getAccessLevel();

  // Log access
  await manager.logAction('dev_area_access', { page: 'layout' });

  return (
    <div className="min-h-screen bg-background">
      {/* Dev Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-orange-500/5 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 flex h-14 items-center">
          <div className="flex items-center gap-2 mr-6">
            <Shield className="h-5 w-5 text-orange-500" />
            <span className="font-bold text-orange-500">Developer Area</span>
            <span className="px-2 py-0.5 text-xs font-medium bg-orange-500/10 text-orange-500 rounded-full">
              {accessLevel.toUpperCase()}
            </span>
          </div>

          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/dev"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="h-4 w-4" />
              Dashboard
            </Link>
            {profile?.can_test_plans && (
              <Link
                href="/dev/plans"
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <FlaskConical className="h-4 w-4" />
                Test Plans
              </Link>
            )}
            <Link
              href="/dev/docs"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <FileText className="h-4 w-4" />
              Secure Docs
            </Link>
            <Link
              href="/dev/audit"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <History className="h-4 w-4" />
              Audit Log
            </Link>
            <Link
              href="/dev/github"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-4 w-4" />
              GitHub
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to App
            </Link>
          </div>
        </div>
      </header>

      {/* Security Notice */}
      <div className="bg-orange-500/10 border-b border-orange-500/20">
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center gap-2 text-xs text-orange-600">
          <Code2 className="h-3.5 w-3.5" />
          <span>
            All actions in this area are logged and monitored. Access is restricted to authorized developers only.
          </span>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
