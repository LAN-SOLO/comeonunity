'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Code2, FlaskConical, FileText, History, Settings, Shield } from 'lucide-react';

interface DevStatus {
  isDeveloper: boolean;
  accessLevel: string;
  profile: {
    email: string;
    access_level: string;
    can_test_plans: boolean;
    can_simulate_subscriptions: boolean;
    last_dev_access: string | null;
  } | null;
}

export function DevModeIndicator() {
  const [status, setStatus] = useState<DevStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkDevStatus() {
      try {
        const response = await fetch('/api/dev/status');
        const data = await response.json();
        setStatus(data);
      } catch (error) {
        console.error('Failed to check dev status:', error);
      } finally {
        setLoading(false);
      }
    }

    checkDevStatus();
  }, []);

  if (loading || !status?.isDeveloper) {
    return null;
  }

  const isMaster = status.accessLevel === 'master';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 h-8 px-2 text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
        >
          <Code2 className="h-4 w-4" />
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] border-orange-500/50 text-orange-500">
            {isMaster ? 'MASTER' : 'DEV'}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-orange-500" />
          Developer Mode
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/dev" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Dev Dashboard
          </Link>
        </DropdownMenuItem>

        {status.profile?.can_test_plans && (
          <DropdownMenuItem asChild>
            <Link href="/dev/plans" className="cursor-pointer">
              <FlaskConical className="mr-2 h-4 w-4" />
              Test Plans
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem asChild>
          <Link href="/dev/docs" className="cursor-pointer">
            <FileText className="mr-2 h-4 w-4" />
            Secure Docs
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/dev/audit" className="cursor-pointer">
            <History className="mr-2 h-4 w-4" />
            Audit Log
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          {status.profile?.email}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
