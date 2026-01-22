'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Check, X, Sparkles, Loader2 } from 'lucide-react';
import { SUBSCRIPTION_TIERS, formatPrice, TRIAL_PERIOD_DAYS } from '@/lib/stripe/config';
import type { SubscriptionTier } from '@/lib/stripe/config';

interface PricingTableProps {
  currentTierId?: string;
  communityId?: string;
  isTrialEligible?: boolean;
  onSelectTier?: (tierId: string, billingPeriod: 'monthly' | 'annual') => Promise<void>;
}

const featureLabels: Record<string, string> = {
  events: 'Events & RSVPs',
  polls: 'Polls & Voting',
  documents: 'Document Archive',
  messaging: 'In-App Messaging',
  analytics: 'Analytics Dashboard',
  customBranding: 'Custom Branding',
  prioritySupport: 'Priority Support',
  apiAccess: 'API Access',
};

export function PricingTable({
  currentTierId,
  communityId,
  isTrialEligible = true,
  onSelectTier,
}: PricingTableProps) {
  const [isAnnual, setIsAnnual] = useState(true);
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelectTier = async (tierId: string) => {
    if (!communityId || !onSelectTier) return;

    setLoading(tierId);

    try {
      await onSelectTier(tierId, isAnnual ? 'annual' : 'monthly');
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Trial banner */}
      {isTrialEligible && (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4 flex items-center justify-center gap-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <p className="text-center font-medium">
            Start with a <span className="text-primary">{TRIAL_PERIOD_DAYS}-day free trial</span> on any plan.
            No charge until trial ends.
          </p>
        </div>
      )}

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-4">
        <span className={!isAnnual ? 'font-semibold' : 'text-muted-foreground'}>
          Monthly
        </span>
        <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
        <span className={isAnnual ? 'font-semibold' : 'text-muted-foreground'}>
          Annual
          <Badge variant="secondary" className="ml-2">Save 15%</Badge>
        </span>
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {SUBSCRIPTION_TIERS.map((tier) => (
          <TierCard
            key={tier.id}
            tier={tier}
            isAnnual={isAnnual}
            isCurrent={tier.id === currentTierId}
            isLoading={loading === tier.id}
            isTrialEligible={isTrialEligible}
            onSelect={() => handleSelectTier(tier.id)}
            disabled={!communityId || loading !== null}
          />
        ))}
      </div>

      {/* Trial terms */}
      {isTrialEligible && (
        <p className="text-center text-sm text-muted-foreground">
          Payment method required. Cancel anytime during trial.
          One trial per account.
        </p>
      )}
    </div>
  );
}

interface TierCardProps {
  tier: SubscriptionTier;
  isAnnual: boolean;
  isCurrent: boolean;
  isLoading: boolean;
  isTrialEligible: boolean;
  onSelect: () => void;
  disabled: boolean;
}

function TierCard({
  tier,
  isAnnual,
  isCurrent,
  isLoading,
  isTrialEligible,
  onSelect,
  disabled,
}: TierCardProps) {
  const price = isAnnual ? tier.priceAnnual : tier.priceMonthly;

  return (
    <Card className={`relative ${tier.popular ? 'border-primary ring-2 ring-primary' : ''}`}>
      {tier.popular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
          Most Popular
        </Badge>
      )}

      <CardHeader>
        <CardTitle>{tier.displayName}</CardTitle>
        <CardDescription>{tier.description}</CardDescription>
        <div className="pt-2">
          <span className="text-3xl font-bold">{formatPrice(price)}</span>
          <span className="text-muted-foreground">/{isAnnual ? 'year' : 'month'}</span>
        </div>
        {isTrialEligible && (
          <p className="text-sm text-primary font-medium">
            {TRIAL_PERIOD_DAYS} days free, then billed
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Limits */}
        <div className="space-y-2 text-sm">
          <p>{tier.limits.maxMembers} members</p>
          <p>{tier.limits.maxItems} items</p>
          <p>{tier.limits.maxResources} resources</p>
          <p>{tier.limits.maxAdmins} admin{tier.limits.maxAdmins > 1 ? 's' : ''}</p>
          <p>{tier.limits.maxStorageMb >= 1024
            ? `${tier.limits.maxStorageMb / 1024} GB storage`
            : `${tier.limits.maxStorageMb} MB storage`}
          </p>
        </div>

        {/* Features */}
        <div className="space-y-2 pt-4 border-t">
          {Object.entries(featureLabels).map(([key, label]) => {
            const hasFeature = tier.features[key as keyof typeof tier.features];
            return (
              <div key={key} className="flex items-center gap-2 text-sm">
                {hasFeature ? (
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className={!hasFeature ? 'text-muted-foreground' : ''}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <Button
          className="w-full mt-4"
          variant={isCurrent ? 'outline' : tier.popular ? 'default' : 'secondary'}
          disabled={isCurrent || disabled}
          onClick={onSelect}
        >
          {isCurrent ? (
            'Current Plan'
          ) : isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : isTrialEligible ? (
            'Start Free Trial'
          ) : (
            'Select Plan'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
