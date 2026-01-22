'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Crown, Sparkles, Zap, Star, FlaskConical } from 'lucide-react';

interface PlanStatusBadgeProps {
  plan: string;
  isTestMode?: boolean;
  className?: string;
}

const planConfig: Record<string, {
  label: string;
  icon: typeof Crown;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  color: string;
}> = {
  starter: {
    label: 'Starter',
    icon: Star,
    variant: 'outline',
    color: 'text-blue-500',
  },
  community: {
    label: 'Community',
    icon: Zap,
    variant: 'secondary',
    color: 'text-green-500',
  },
  growth: {
    label: 'Growth',
    icon: Sparkles,
    variant: 'default',
    color: 'text-purple-500',
  },
  professional: {
    label: 'Professional',
    icon: Crown,
    variant: 'default',
    color: 'text-amber-500',
  },
  free: {
    label: 'Free',
    icon: Star,
    variant: 'outline',
    color: 'text-muted-foreground',
  },
};

export function PlanStatusBadge({ plan, isTestMode = false, className }: PlanStatusBadgeProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const config = planConfig[plan] || planConfig.free;
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={config.variant}
            className={`gap-1 cursor-default ${isTestMode ? 'border-dashed border-orange-500' : ''} ${className || ''}`}
          >
            {isTestMode && <FlaskConical className="h-3 w-3 text-orange-500" />}
            <Icon className={`h-3 w-3 ${config.color}`} />
            <span className="text-xs">{config.label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isTestMode ? 'Test Mode: ' : 'Current Plan: '}
            <span className="font-semibold">{config.label}</span>
          </p>
          {isTestMode && (
            <p className="text-xs text-orange-500 mt-1">
              Simulated subscription for testing
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
