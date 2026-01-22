'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock, CreditCard, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface TrialBannerProps {
  trialEndsAt: string;
  communitySlug: string;
  isPastDue?: boolean;
}

function calculateDaysRemaining(trialEndsAt: string): number {
  const endDate = new Date(trialEndsAt);
  const now = new Date();
  const days = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

export function TrialBanner({ trialEndsAt, communitySlug, isPastDue = false }: TrialBannerProps) {
  const [daysRemaining, setDaysRemaining] = useState(() => calculateDaysRemaining(trialEndsAt));

  useEffect(() => {
    setDaysRemaining(calculateDaysRemaining(trialEndsAt));
  }, [trialEndsAt]);

  if (isPastDue) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Payment Failed</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>
            Your subscription payment failed. Please update your payment method to continue.
          </span>
          <Button asChild size="sm" variant="default">
            <Link href={`/c/${communitySlug}/admin/billing`}>
              <CreditCard className="mr-2 h-4 w-4" />
              Update Payment
            </Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (daysRemaining <= 0) return null;

  const isUrgent = daysRemaining <= 3;

  return (
    <Alert variant={isUrgent ? 'destructive' : 'default'} className="mb-6">
      <Clock className="h-4 w-4" />
      <AlertTitle>
        {isUrgent ? 'Trial Ending Soon!' : 'You\'re on a Free Trial'}
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
        <span>
          {daysRemaining === 1
            ? 'Your trial ends tomorrow.'
            : `${daysRemaining} days remaining in your trial.`}
          {' '}Your payment method will be charged when the trial ends.
        </span>
        <Button asChild size="sm" variant={isUrgent ? 'default' : 'outline'}>
          <Link href={`/c/${communitySlug}/admin/billing`}>
            <CreditCard className="mr-2 h-4 w-4" />
            Manage Billing
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}

// Compact version for dashboard header
export function TrialBadge({ trialEndsAt }: { trialEndsAt: string }) {
  const [daysRemaining, setDaysRemaining] = useState(() => calculateDaysRemaining(trialEndsAt));

  useEffect(() => {
    setDaysRemaining(calculateDaysRemaining(trialEndsAt));
  }, [trialEndsAt]);

  if (daysRemaining <= 0) return null;

  const isUrgent = daysRemaining <= 3;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
      isUrgent
        ? 'bg-destructive/10 text-destructive'
        : 'bg-primary/10 text-primary'
    }`}>
      <Clock className="h-3 w-3" />
      <span>Trial: {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left</span>
    </div>
  );
}
