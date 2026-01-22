import { getStripe } from '@/lib/stripe/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { AVAILABLE_ADDONS, getAddonById } from '@/lib/stripe/config';

export interface CommunityAddon {
  id: string;
  addon_id: string;
  addon_type: string;
  community_id: string;
  stripe_subscription_item_id: string | null;
  quantity: number;
  status: 'active' | 'canceled' | 'expired';
  is_active: boolean;
  activated_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export class AddonManager {
  private supabase: ReturnType<typeof createAdminClient>;
  private stripe: ReturnType<typeof getStripe>;

  constructor() {
    this.supabase = createAdminClient();
    this.stripe = getStripe();
  }

  async getActiveAddons(communityId: string): Promise<CommunityAddon[]> {
    const { data, error } = await this.supabase
      .from('subscription_addons')
      .select('*')
      .eq('community_id', communityId)
      .eq('status', 'active');

    if (error) throw error;
    // Map addon_type to addon_id for compatibility
    return (data || []).map((addon) => ({
      ...addon,
      addon_id: addon.addon_id || addon.addon_type,
      is_active: addon.status === 'active',
    }));
  }

  async getAllAddons(communityId: string): Promise<CommunityAddon[]> {
    const { data, error } = await this.supabase
      .from('subscription_addons')
      .select('*')
      .eq('community_id', communityId);

    if (error) throw error;
    return (data || []).map((addon) => ({
      ...addon,
      addon_id: addon.addon_id || addon.addon_type,
      is_active: addon.status === 'active',
    }));
  }

  async purchaseAddon(
    communityId: string,
    addonId: string,
    quantity: number = 1
  ): Promise<{ checkoutUrl: string }> {
    const addon = getAddonById(addonId);
    if (!addon) {
      throw new Error('Invalid addon');
    }

    // Get community subscription to find Stripe customer
    const { data: subscription } = await this.supabase
      .from('community_subscriptions')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('community_id', communityId)
      .single();

    if (!subscription?.stripe_subscription_id) {
      throw new Error('Community must have an active subscription to purchase add-ons');
    }

    // Get or create Stripe price for addon
    const { data: dbAddon } = await this.supabase
      .from('addon_prices')
      .select('stripe_price_id')
      .eq('addon_id', addonId)
      .single();

    if (!dbAddon?.stripe_price_id) {
      throw new Error('Add-on price not configured in Stripe');
    }

    // Add addon to existing subscription
    const subscriptionItem = await this.stripe.subscriptionItems.create({
      subscription: subscription.stripe_subscription_id,
      price: dbAddon.stripe_price_id,
      quantity,
    });

    // Record addon in database
    await this.supabase.from('subscription_addons').insert({
      community_id: communityId,
      addon_id: addonId,
      addon_type: addonId,
      stripe_subscription_item_id: subscriptionItem.id,
      quantity,
      price_per_unit: addon.pricePerYear,
      status: 'active',
      activated_at: new Date().toISOString(),
    });

    // Update usage limits if addon increases capacity
    if (addon.metricIncrease) {
      await this.updateUsageLimits(communityId, addon.metricIncrease.metric, addon.metricIncrease.amount * quantity);
    }

    return { checkoutUrl: '' }; // No separate checkout needed, added to subscription
  }

  async updateAddonQuantity(
    communityId: string,
    addonId: string,
    newQuantity: number
  ): Promise<void> {
    const addon = getAddonById(addonId);
    if (!addon) {
      throw new Error('Invalid addon');
    }

    const { data: existingAddon } = await this.supabase
      .from('subscription_addons')
      .select('*')
      .eq('community_id', communityId)
      .or(`addon_id.eq.${addonId},addon_type.eq.${addonId}`)
      .eq('status', 'active')
      .single();

    if (!existingAddon?.stripe_subscription_item_id) {
      throw new Error('Addon not found');
    }

    if (newQuantity === 0) {
      await this.cancelAddon(communityId, addonId);
      return;
    }

    // Update quantity in Stripe
    await this.stripe.subscriptionItems.update(existingAddon.stripe_subscription_item_id, {
      quantity: newQuantity,
    });

    // Update database
    await this.supabase
      .from('subscription_addons')
      .update({ quantity: newQuantity })
      .eq('id', existingAddon.id);

    // Update usage limits
    if (addon.metricIncrease) {
      const quantityDiff = newQuantity - existingAddon.quantity;
      await this.updateUsageLimits(
        communityId,
        addon.metricIncrease.metric,
        addon.metricIncrease.amount * quantityDiff
      );
    }
  }

  async cancelAddon(communityId: string, addonId: string): Promise<void> {
    const addon = getAddonById(addonId);
    if (!addon) {
      throw new Error('Invalid addon');
    }

    const { data: existingAddon } = await this.supabase
      .from('subscription_addons')
      .select('*')
      .eq('community_id', communityId)
      .or(`addon_id.eq.${addonId},addon_type.eq.${addonId}`)
      .eq('status', 'active')
      .single();

    if (!existingAddon) {
      throw new Error('Addon not found');
    }

    // Remove from Stripe subscription
    if (existingAddon.stripe_subscription_item_id) {
      await this.stripe.subscriptionItems.del(existingAddon.stripe_subscription_item_id, {
        proration_behavior: 'create_prorations',
      });
    }

    // Mark as canceled in database
    await this.supabase
      .from('subscription_addons')
      .update({
        status: 'canceled',
        expires_at: new Date().toISOString(),
      })
      .eq('id', existingAddon.id);

    // Reduce usage limits
    if (addon.metricIncrease) {
      await this.updateUsageLimits(
        communityId,
        addon.metricIncrease.metric,
        -addon.metricIncrease.amount * existingAddon.quantity
      );
    }
  }

  async getAvailableAddons(communityId: string): Promise<typeof AVAILABLE_ADDONS> {
    const activeAddons = await this.getActiveAddons(communityId);
    const activeAddonIds = activeAddons.map((a) => a.addon_id);

    // Return all addons with active status
    return AVAILABLE_ADDONS.map((addon) => ({
      ...addon,
      isActive: activeAddonIds.includes(addon.id),
      quantity: activeAddons.find((a) => a.addon_id === addon.id)?.quantity || 0,
    }));
  }

  private async updateUsageLimits(
    communityId: string,
    metric: string,
    amountChange: number
  ): Promise<void> {
    // Get current limit
    const { data: usage } = await this.supabase
      .from('usage_tracking')
      .select('limit_value')
      .eq('community_id', communityId)
      .eq('metric', metric)
      .single();

    if (usage) {
      await this.supabase
        .from('usage_tracking')
        .update({ limit_value: usage.limit_value + amountChange })
        .eq('community_id', communityId)
        .eq('metric', metric);
    }
  }
}

export async function createAddonManager(): Promise<AddonManager> {
  return new AddonManager();
}
