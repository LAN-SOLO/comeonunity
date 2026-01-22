import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BillingPageClient } from './billing-page-client';

interface BillingPageProps {
  params: Promise<{ communityId: string }>;
}

export default async function BillingPage({ params }: BillingPageProps) {
  const { communityId } = await params;
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Check if the value looks like a UUID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(communityId);

  // Get community details by slug or ID
  let communityQuery = supabase
    .from('communities')
    .select('id, name, slug, plan');

  if (isUUID) {
    communityQuery = communityQuery.or(`slug.eq.${communityId},id.eq.${communityId}`);
  } else {
    communityQuery = communityQuery.eq('slug', communityId);
  }

  const { data: community, error: communityError } = await communityQuery.single();

  if (communityError || !community) {
    redirect('/');
  }

  // Use the actual community ID for all subsequent queries
  const actualCommunityId = community.id;

  // Check if user is admin
  const { data: membership } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', actualCommunityId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!membership || !['admin', 'owner'].includes(membership.role)) {
    redirect(`/c/${community.slug}`);
  }

  // Get subscription data
  const { data: subscription } = await supabase
    .from('community_subscriptions')
    .select(`
      *,
      tier:subscription_tiers(*)
    `)
    .eq('community_id', actualCommunityId)
    .single();

  // Get usage data
  const { data: usage } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('community_id', actualCommunityId);

  // Get billing history
  const { data: invoices } = await supabase
    .from('billing_history')
    .select('*')
    .eq('community_id', actualCommunityId)
    .order('created_at', { ascending: false })
    .limit(12);

  // Get subscription tiers for pricing table
  const { data: tiers } = await supabase
    .from('subscription_tiers')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  // Get active add-ons
  const { data: activeAddons } = await supabase
    .from('subscription_addons')
    .select('*')
    .eq('community_id', actualCommunityId);

  // Check trial eligibility
  const { data: isTrialEligible } = await supabase.rpc('check_trial_eligibility', {
    p_user_id: user.id,
  });

  return (
    <BillingPageClient
      community={community}
      subscription={subscription}
      usage={usage || []}
      invoices={invoices || []}
      tiers={tiers || []}
      activeAddons={activeAddons || []}
      isTrialEligible={isTrialEligible ?? true}
    />
  );
}
