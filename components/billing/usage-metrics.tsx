'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Users, Package, Calendar, HardDrive, Shield, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

interface UsageData {
  metric: string;
  current_value: number;
  limit_value: number;
}

interface UsageMetricsProps {
  usage: UsageData[];
  tierName?: string;
  communitySlug?: string;
  compact?: boolean;
}

const metricConfig: Record<string, {
  icon: typeof Users;
  label: string;
  unit?: string;
}> = {
  members: { icon: Users, label: 'Members' },
  items: { icon: Package, label: 'Items' },
  resources: { icon: Calendar, label: 'Resources' },
  storage_mb: { icon: HardDrive, label: 'Storage', unit: 'MB' },
  admins: { icon: Shield, label: 'Admins' },
};

export function UsageMetrics({ usage, tierName, communitySlug, compact = false }: UsageMetricsProps) {
  if (compact) {
    return (
      <div className="space-y-3">
        {usage.map((item) => {
          const config = metricConfig[item.metric];
          if (!config) return null;

          const percentage = item.limit_value > 0
            ? Math.round((item.current_value / item.limit_value) * 100)
            : 0;
          const isCritical = percentage >= 100;
          const isWarning = percentage >= 80;

          return (
            <div key={item.metric} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{config.label}</span>
                <span className={isCritical ? 'text-destructive' : isWarning ? 'text-orange-500' : ''}>
                  {item.current_value} / {item.limit_value}
                  {config.unit ? ` ${config.unit}` : ''}
                </span>
              </div>
              <Progress
                value={Math.min(100, percentage)}
                className={`h-1.5 ${
                  isCritical ? '[&>div]:bg-destructive' : isWarning ? '[&>div]:bg-orange-500' : ''
                }`}
              />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Usage</span>
          {tierName && (
            <span className="text-sm font-normal text-muted-foreground">
              {tierName} Plan
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {usage.map((item) => {
            const config = metricConfig[item.metric];
            if (!config) return null;

            const percentage = item.limit_value > 0
              ? Math.round((item.current_value / item.limit_value) * 100)
              : 0;
            const Icon = config.icon;
            const isCritical = percentage >= 100;
            const isWarning = percentage >= 80;

            return (
              <div key={item.metric} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{config.label}</span>
                  </div>
                  <span className={`text-sm ${
                    isCritical ? 'text-destructive' : isWarning ? 'text-orange-500' : 'text-muted-foreground'
                  }`}>
                    {item.current_value} / {item.limit_value}
                    {config.unit ? ` ${config.unit}` : ''}
                  </span>
                </div>
                <Progress
                  value={Math.min(100, percentage)}
                  className={`h-2 ${
                    isCritical ? '[&>div]:bg-destructive' : isWarning ? '[&>div]:bg-orange-500' : ''
                  }`}
                />
                {isCritical && communitySlug && (
                  <p className="text-xs text-destructive flex items-center justify-between">
                    <span>Limit reached - upgrade to add more</span>
                    <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
                      <Link href={`/c/${communitySlug}/admin/billing`}>
                        Upgrade <ArrowUpRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </p>
                )}
                {isWarning && !isCritical && (
                  <p className="text-xs text-orange-500">
                    Approaching limit - consider upgrading
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Simple usage indicator for inline use
export function UsageIndicator({
  current,
  limit,
  label,
  showUpgrade = true,
  communitySlug,
}: {
  current: number;
  limit: number;
  label: string;
  showUpgrade?: boolean;
  communitySlug?: string;
}) {
  const percentage = limit > 0 ? Math.round((current / limit) * 100) : 0;
  const isCritical = percentage >= 100;
  const isWarning = percentage >= 80;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground capitalize">{label}</span>
        <span className={isCritical ? 'text-destructive' : isWarning ? 'text-orange-500' : ''}>
          {current} / {limit}
        </span>
      </div>
      <Progress
        value={Math.min(100, percentage)}
        className={`h-2 ${
          isCritical ? '[&>div]:bg-destructive' : isWarning ? '[&>div]:bg-orange-500' : ''
        }`}
      />
      {isCritical && showUpgrade && communitySlug && (
        <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
          <Link href={`/c/${communitySlug}/admin/billing`}>
            Upgrade to add more
          </Link>
        </Button>
      )}
    </div>
  );
}
