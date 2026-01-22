import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/server';
import { SUBSCRIPTION_TIERS, TRIAL_PERIOD_DAYS } from '@/lib/stripe/config';
import { z } from 'zod';

const checkoutSchema = z.object({
  communityId: z.string().uuid(),
  tierId: z.string(),
  billingPeriod: z.enum(['monthly', 'annual']),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export async function POST(req: Request) {
  const supabase = await createClient();

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const validation = checkoutSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.flatten() }, { status: 400 });
  }

  const { communityId, tierId, billingPeriod, successUrl, cancelUrl } = validation.data;

  // Verify user is admin of community
  const { data: membership } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', communityId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!membership || !['admin', 'owner'].includes(membership.role)) {
    return NextResponse.json({ error: 'Not authorized to manage billing' }, { status: 403 });
  }

  // Check trial eligibility
  const { data: isEligible } = await supabase.rpc('check_trial_eligibility', {
    p_user_id: user.id,
  });

  // Check if in cooldown period
  const { data: inCooldown } = await supabase.rpc('is_in_cooldown', {
    p_user_id: user.id,
  });

  if (inCooldown) {
    return NextResponse.json({
      error: 'You are in a 14-day cooldown period. Please wait before making plan changes.',
    }, { status: 403 });
  }

  // Get tier configuration
  const tier = SUBSCRIPTION_TIERS.find((t) => t.id === tierId);
  if (!tier) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  }

  // Get tier from database for Stripe price IDs
  const { data: dbTier } = await supabase
    .from('subscription_tiers')
    .select('stripe_price_annual_id, stripe_price_monthly_id')
    .eq('id', tierId)
    .single();

  // Use database price IDs if available, otherwise we need to create prices in Stripe
  const priceId = billingPeriod === 'annual'
    ? dbTier?.stripe_price_annual_id
    : dbTier?.stripe_price_monthly_id;

  if (!priceId) {
    // If no price ID configured, return error (admin needs to set up Stripe products first)
    return NextResponse.json({
      error: 'Stripe prices not configured. Please contact support.',
    }, { status: 500 });
  }

  // Check for existing subscription
  const { data: existingSub } = await supabase
    .from('community_subscriptions')
    .select('stripe_customer_id, is_trial, status')
    .eq('community_id', communityId)
    .single();

  // Determine if trial should be applied
  const shouldApplyTrial = isEligible && (!existingSub || existingSub.status === 'canceled');

  // Create Stripe checkout session
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card', 'sepa_debit'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      community_id: communityId,
      tier_id: tierId,
      user_id: user.id,
      is_trial: shouldApplyTrial ? 'true' : 'false',
    },
    subscription_data: {
      metadata: {
        community_id: communityId,
        tier_id: tierId,
        user_id: user.id,
      },
      ...(shouldApplyTrial && { trial_period_days: TRIAL_PERIOD_DAYS }),
    },
    customer_email: user.email,
    payment_method_collection: 'always',
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    tax_id_collection: { enabled: true },
    locale: 'de',
  };

  // Use existing customer if available
  if (existingSub?.stripe_customer_id) {
    sessionParams.customer = existingSub.stripe_customer_id;
    delete sessionParams.customer_email;
  }

  try {
    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      isTrial: shouldApplyTrial,
      trialDays: shouldApplyTrial ? TRIAL_PERIOD_DAYS : 0,
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
