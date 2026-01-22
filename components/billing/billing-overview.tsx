'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CreditCard,
  Calendar,
  ExternalLink,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { formatPrice } from '@/lib/stripe/config';

interface Subscription {
  id: string;
  tier_id: string;
  status: string;
  is_trial: boolean;
  trial_ends_at: string | null;
  billing_period: 'monthly' | 'annual';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  tier: {
    display_name: string;
    price_annual: number;
    price_monthly: number;
  };
}

interface BillingOverviewProps {
  subscription: Subscription | null;
  communityId: string;
  communitySlug: string;
  onManageBilling?: () => Promise<void>;
  onChangePlan?: () => void;
  onCancelSubscription?: () => Promise<void>;
  onResumeSubscription?: () => Promise<void>;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle2 }> = {
  active: { label: 'Active', variant: 'default', icon: CheckCircle2 },
  trialing: { label: 'Trial', variant: 'secondary', icon: Calendar },
  past_due: { label: 'Past Due', variant: 'destructive', icon: AlertTriangle },
  canceled: { label: 'Canceled', variant: 'outline', icon: AlertTriangle },
  incomplete: { label: 'Incomplete', variant: 'destructive', icon: AlertTriangle },
  paused: { label: 'Paused', variant: 'outline', icon: AlertTriangle },
};

export function BillingOverview({
  subscription,
  onManageBilling,
  onChangePlan,
  onCancelSubscription,
  onResumeSubscription,
}: BillingOverviewProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: string, fn?: () => Promise<void>) => {
    if (!fn) return;
    setLoading(action);
    try {
      await fn();
    } finally {
      setLoading(null);
    }
  };

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>No active subscription</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Choose a plan to unlock all features and remove limits.
          </p>
          <Button onClick={onChangePlan}>
            Choose a Plan
          </Button>
        </CardContent>
      </Card>
    );
  }

  const status = statusConfig[subscription.status] || statusConfig.active;
  const StatusIcon = status.icon;
  const price = subscription.billing_period === 'annual'
    ? subscription.tier.price_annual
    : subscription.tier.price_monthly;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {subscription.tier.display_name}
              <Badge variant={status.variant}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
            </CardTitle>
            <CardDescription>
              {formatPrice(price)} / {subscription.billing_period === 'annual' ? 'year' : 'month'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trial info */}
        {subscription.is_trial && subscription.trial_ends_at && (
          <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm">
              Trial ends on {formatDate(subscription.trial_ends_at)}
            </span>
          </div>
        )}

        {/* Cancellation notice */}
        {subscription.cancel_at_period_end && (
          <div className="flex items-center gap-2 p-3 bg-orange-500/10 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span className="text-sm">
              Cancels on {formatDate(subscription.current_period_end)}
            </span>
          </div>
        )}

        {/* Billing period */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Current period</span>
            <span>
              {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Billing cycle</span>
            <span className="capitalize">{subscription.billing_period}</span>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction('portal', onManageBilling)}
            disabled={loading !== null}
          >
            {loading === 'portal' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="mr-2 h-4 w-4" />
            )}
            Manage Payment
            <ExternalLink className="ml-2 h-3 w-3" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onChangePlan}
            disabled={loading !== null}
          >
            Change Plan
          </Button>

          {subscription.cancel_at_period_end ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction('resume', onResumeSubscription)}
              disabled={loading !== null}
            >
              {loading === 'resume' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Resume Subscription
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => handleAction('cancel', onCancelSubscription)}
              disabled={loading !== null}
            >
              {loading === 'cancel' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Cancel Subscription
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
