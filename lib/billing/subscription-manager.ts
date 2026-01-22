import { stripe } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/server';

export class SubscriptionManager {
  private supabase: Awaited<ReturnType<typeof createClient>>;

  constructor(supabase: Awaited<ReturnType<typeof createClient>>) {
    this.supabase = supabase;
  }

  async getSubscription(communityId: string) {
    const { data, error } = await this.supabase
      .from('community_subscriptions')
      .select(`
        *,
        tier:subscription_tiers(*),
        addons:subscription_addons(*)
      `)
      .eq('community_id', communityId)
      .single();

    return { data, error };
  }

  async getUsage(communityId: string) {
    const { data, error } = await this.supabase
      .from('usage_tracking')
      .select('*')
      .eq('community_id', communityId);

    return { data, error };
  }

  async getBillingHistory(communityId: string, limit = 12) {
    const { data, error } = await this.supabase
      .from('billing_history')
      .select('*')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return { data, error };
  }

  async changeTier(communityId: string, newTierId: string) {
    const { data: subscription } = await this.getSubscription(communityId);

    if (!subscription?.stripe_subscription_id) {
      throw new Error('No active subscription');
    }

    const { data: newTier } = await this.supabase
      .from('subscription_tiers')
      .select('stripe_price_annual_id, stripe_price_monthly_id')
      .eq('id', newTierId)
      .single();

    if (!newTier) {
      throw new Error('Tier not found');
    }

    const newPriceId = subscription.billing_period === 'annual'
      ? newTier.stripe_price_annual_id
      : newTier.stripe_price_monthly_id;

    if (!newPriceId) {
      throw new Error('Price not configured for this tier');
    }

    // Get current subscription from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id
    );

    // Update subscription with prorated change
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      items: [{
        id: stripeSubscription.items.data[0].id,
        price: newPriceId,
      }],
      proration_behavior: 'create_prorations',
      metadata: {
        ...stripeSubscription.metadata,
        tier_id: newTierId,
      },
    });

    // Update local record
    await this.supabase
      .from('community_subscriptions')
      .update({ tier_id: newTierId })
      .eq('community_id', communityId);

    // Update usage limits
    await this.supabase.rpc('initialize_usage_tracking', {
      p_community_id: communityId,
      p_tier_id: newTierId,
    });

    // Update community plan
    await this.supabase
      .from('communities')
      .update({ plan: newTierId })
      .eq('id', communityId);
  }

  async cancelSubscription(communityId: string, immediately = false) {
    const { data: subscription } = await this.getSubscription(communityId);

    if (!subscription?.stripe_subscription_id) {
      throw new Error('No active subscription');
    }

    if (immediately) {
      await stripe.subscriptions.cancel(subscription.stripe_subscription_id);

      await this.supabase
        .from('community_subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
        })
        .eq('community_id', communityId);
    } else {
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true,
      });

      await this.supabase
        .from('community_subscriptions')
        .update({ cancel_at_period_end: true })
        .eq('community_id', communityId);
    }
  }

  async resumeSubscription(communityId: string) {
    const { data: subscription } = await this.getSubscription(communityId);

    if (!subscription?.stripe_subscription_id) {
      throw new Error('No active subscription');
    }

    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    await this.supabase
      .from('community_subscriptions')
      .update({ cancel_at_period_end: false })
      .eq('community_id', communityId);
  }

  async syncUsage(communityId: string) {
    // Count actual members
    const { count: memberCount } = await this.supabase
      .from('community_members')
      .select('*', { count: 'exact', head: true })
      .eq('community_id', communityId)
      .eq('status', 'active');

    // Count actual items
    const { count: itemCount } = await this.supabase
      .from('items')
      .select('*', { count: 'exact', head: true })
      .eq('community_id', communityId);

    // Count actual resources
    const { count: resourceCount } = await this.supabase
      .from('resources')
      .select('*', { count: 'exact', head: true })
      .eq('community_id', communityId);

    // Count admins
    const { count: adminCount } = await this.supabase
      .from('community_members')
      .select('*', { count: 'exact', head: true })
      .eq('community_id', communityId)
      .eq('role', 'admin')
      .eq('status', 'active');

    // Update tracking
    const updates = [
      { metric: 'members', value: memberCount || 0 },
      { metric: 'items', value: itemCount || 0 },
      { metric: 'resources', value: resourceCount || 0 },
      { metric: 'admins', value: adminCount || 0 },
    ];

    for (const { metric, value } of updates) {
      await this.supabase
        .from('usage_tracking')
        .update({ current_value: value, last_updated: new Date().toISOString() })
        .eq('community_id', communityId)
        .eq('metric', metric);
    }
  }
}

export async function createSubscriptionManager() {
  const supabase = await createClient();
  return new SubscriptionManager(supabase);
}
