'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BillingOverview } from '@/components/billing/billing-overview';
import { UsageMetrics } from '@/components/billing/usage-metrics';
import { InvoiceHistory } from '@/components/billing/invoice-history';
import { PricingTable } from '@/components/billing/pricing-table';
import { TrialBanner } from '@/components/billing/trial-banner';
import { AddonsManager } from '@/components/billing/addons-manager';
import { toast } from 'sonner';

interface Community {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

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
    id: string;
    display_name: string;
    price_annual: number;
    price_monthly: number;
  };
}

interface UsageData {
  metric: string;
  current_value: number;
  limit_value: number;
}

interface Invoice {
  id: string;
  stripe_invoice_id: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  invoice_pdf_url: string | null;
  hosted_invoice_url: string | null;
  created_at: string;
}

interface Tier {
  id: string;
  name: string;
  display_name: string;
  price_annual: number;
  price_monthly: number;
}

interface ActiveAddon {
  id: string;
  addon_id: string;
  quantity: number;
  is_active: boolean;
}

interface BillingPageClientProps {
  community: Community;
  subscription: Subscription | null;
  usage: UsageData[];
  invoices: Invoice[];
  tiers: Tier[];
  activeAddons: ActiveAddon[];
  isTrialEligible: boolean;
}

export function BillingPageClient({
  community,
  subscription,
  usage,
  invoices,
  activeAddons,
  isTrialEligible,
}: BillingPageClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const handleCheckout = async (tierId: string, billingPeriod: 'monthly' | 'annual') => {
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityId: community.id,
          tierId,
          billingPeriod,
          successUrl: `${window.location.origin}/c/${community.slug}/admin/billing?success=true`,
          cancelUrl: `${window.location.origin}/c/${community.slug}/admin/billing`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe checkout
      window.location.href = data.url;
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
    }
  };

  const handleManageBilling = async () => {
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communityId: community.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open billing portal');
      }

      // Redirect to Stripe portal
      window.location.href = data.url;
    } catch (error) {
      console.error('Portal error:', error);
      toast.error('Failed to open billing portal. Please try again.');
    }
  };

  const handleCancelSubscription = async () => {
    try {
      const response = await fetch(`/api/communities/${community.id}/subscription/cancel`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      toast.success('Subscription will be canceled at the end of the billing period.');
      router.refresh();
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error('Failed to cancel subscription. Please try again.');
    } finally {
      setShowCancelDialog(false);
    }
  };

  const handleResumeSubscription = async () => {
    try {
      const response = await fetch(`/api/communities/${community.id}/subscription/resume`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to resume subscription');
      }

      toast.success('Subscription resumed successfully.');
      router.refresh();
    } catch (error) {
      console.error('Resume error:', error);
      toast.error('Failed to resume subscription. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription, view usage, and access invoices.
        </p>
      </div>

      {/* Trial/Status Banner */}
      {subscription?.is_trial && subscription.trial_ends_at && (
        <TrialBanner
          trialEndsAt={subscription.trial_ends_at}
          communitySlug={community.slug}
        />
      )}

      {subscription?.status === 'past_due' && (
        <TrialBanner
          trialEndsAt={subscription.current_period_end}
          communitySlug={community.slug}
          isPastDue
        />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="addons">Add-ons</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <BillingOverview
                subscription={subscription}
                communityId={community.id}
                communitySlug={community.slug}
                onManageBilling={handleManageBilling}
                onChangePlan={() => setActiveTab('plans')}
                onCancelSubscription={async () => setShowCancelDialog(true)}
                onResumeSubscription={handleResumeSubscription}
              />
            </div>
            <div>
              <UsageMetrics
                usage={usage}
                tierName={subscription?.tier?.display_name}
                communitySlug={community.slug}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="plans" className="mt-6">
          <PricingTable
            currentTierId={subscription?.tier_id}
            communityId={community.id}
            isTrialEligible={isTrialEligible && !subscription}
            onSelectTier={handleCheckout}
          />
        </TabsContent>

        <TabsContent value="addons" className="mt-6">
          <AddonsManager
            communityId={community.id}
            activeAddons={activeAddons}
            hasSubscription={!!subscription && subscription.status !== 'canceled'}
            onAddonChange={() => router.refresh()}
          />
        </TabsContent>

        <TabsContent value="invoices" className="mt-6">
          <InvoiceHistory invoices={invoices} showTitle={false} />
        </TabsContent>
      </Tabs>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will remain active until the end of the current billing period.
              After that, your community will be downgraded to the free tier with limited features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
