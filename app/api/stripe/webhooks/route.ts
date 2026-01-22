import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/client';
import { createAdminClient } from '@/lib/supabase/admin';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session, supabase);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription, supabase);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object as Stripe.Subscription, supabase);
        break;

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription, supabase);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice, supabase);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice, supabase);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleCheckoutComplete(
  session: Stripe.Checkout.Session,
  supabase: ReturnType<typeof createAdminClient>
) {
  const communityId = session.metadata?.community_id;
  const tierId = session.metadata?.tier_id;
  const userId = session.metadata?.user_id;
  const isTrial = session.metadata?.is_trial === 'true';

  if (!communityId || !tierId) {
    throw new Error('Missing metadata in checkout session');
  }

  // Get subscription details from Stripe
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string) as any;

  // Create/update subscription record
  const { error: subError } = await supabase.from('community_subscriptions').upsert({
    community_id: communityId,
    tier_id: tierId,
    stripe_customer_id: session.customer as string,
    stripe_subscription_id: subscription.id,
    billing_email: session.customer_email,
    billing_period: subscription.items?.data?.[0]?.price?.recurring?.interval === 'year' ? 'annual' : 'monthly',
    status: subscription.status === 'trialing' ? 'trialing' : 'active',
    is_trial: subscription.status === 'trialing',
    trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null,
    current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
  }, {
    onConflict: 'community_id',
  });

  if (subError) {
    console.error('Error creating subscription record:', subError);
    throw subError;
  }

  // Record trial if applicable
  if (isTrial && userId) {
    const trialEndsAt = subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const cooldownEndsAt = new Date(trialEndsAt);
    cooldownEndsAt.setDate(cooldownEndsAt.getDate() + 14);

    await supabase.from('user_trials').upsert({
      user_id: userId,
      trial_tier_id: tierId,
      trial_started_at: new Date().toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
      cooldown_ends_at: cooldownEndsAt.toISOString(),
    }, {
      onConflict: 'user_id',
    });
  }

  // Initialize usage tracking
  await supabase.rpc('initialize_usage_tracking', {
    p_community_id: communityId,
    p_tier_id: tierId,
  });

  // Update community plan
  await supabase
    .from('communities')
    .update({ plan: tierId })
    .eq('id', communityId);
}

async function handleSubscriptionUpdate(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createAdminClient>
) {
  const communityId = subscription.metadata?.community_id;
  if (!communityId) return;

  const tierId = subscription.metadata?.tier_id;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub = subscription as any;
  await supabase.from('community_subscriptions').update({
    tier_id: tierId,
    status: sub.status === 'trialing' ? 'trialing' : sub.status,
    is_trial: sub.status === 'trialing',
    trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
    current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end,
  }).eq('stripe_subscription_id', sub.id);

  // Update usage limits if tier changed
  if (tierId) {
    await supabase.rpc('initialize_usage_tracking', {
      p_community_id: communityId,
      p_tier_id: tierId,
    });

    await supabase
      .from('communities')
      .update({ plan: tierId })
      .eq('id', communityId);
  }
}

async function handleSubscriptionCanceled(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createAdminClient>
) {
  const communityId = subscription.metadata?.community_id;
  if (!communityId) return;

  await supabase.from('community_subscriptions').update({
    status: 'canceled',
    canceled_at: new Date().toISOString(),
  }).eq('stripe_subscription_id', subscription.id);

  // Optionally downgrade to free tier limits
  await supabase
    .from('communities')
    .update({ plan: 'free' })
    .eq('id', communityId);
}

async function handleTrialWillEnd(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createAdminClient>
) {
  const communityId = subscription.metadata?.community_id;
  if (!communityId) return;

  // Get community admins to notify
  const { data: admins } = await supabase
    .from('community_members')
    .select('user_id')
    .eq('community_id', communityId)
    .eq('role', 'admin')
    .eq('status', 'active');

  if (admins && admins.length > 0) {
    // Create notification for each admin
    const notifications = admins.map((admin) => ({
      user_id: admin.user_id,
      community_id: communityId,
      type: 'trial_ending',
      title: 'Trial Ending Soon',
      body: 'Your trial ends in 3 days. Add a payment method to continue.',
      data: { subscription_id: subscription.id },
      link: `/c/${communityId}/admin/billing`,
    }));

    await supabase.from('notifications').insert(notifications);
  }
}

async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  supabase: ReturnType<typeof createAdminClient>
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inv = invoice as any;
  if (!inv.subscription) return;

  // Get community from subscription
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscription = await stripe.subscriptions.retrieve(inv.subscription as string) as any;
  const communityId = subscription.metadata?.community_id;
  if (!communityId) return;

  // Record billing history
  await supabase.from('billing_history').insert({
    community_id: communityId,
    stripe_invoice_id: inv.id,
    stripe_payment_intent_id: inv.payment_intent as string,
    amount: inv.amount_paid,
    currency: inv.currency,
    status: 'paid',
    description: inv.description || `Subscription payment`,
    invoice_pdf_url: inv.invoice_pdf,
    hosted_invoice_url: inv.hosted_invoice_url,
    metadata: {
      period_start: inv.period_start,
      period_end: inv.period_end,
    },
  });

  // Mark trial as converted if applicable
  const userId = subscription.metadata?.user_id;
  if (userId) {
    await supabase
      .from('user_trials')
      .update({
        converted_to_paid: true,
        converted_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .is('converted_to_paid', false);
  }

  // Update subscription status
  await supabase.from('community_subscriptions').update({
    status: 'active',
    is_trial: false,
  }).eq('stripe_subscription_id', subscription.id);
}

async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: ReturnType<typeof createAdminClient>
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inv = invoice as any;
  if (!inv.subscription) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subscription = await stripe.subscriptions.retrieve(inv.subscription as string) as any;
  const communityId = subscription.metadata?.community_id;
  if (!communityId) return;

  // Update subscription status
  await supabase.from('community_subscriptions').update({
    status: 'past_due',
  }).eq('stripe_subscription_id', subscription.id);

  // Get community admins to notify
  const { data: admins } = await supabase
    .from('community_members')
    .select('user_id')
    .eq('community_id', communityId)
    .eq('role', 'admin')
    .eq('status', 'active');

  if (admins && admins.length > 0) {
    const notifications = admins.map((admin) => ({
      user_id: admin.user_id,
      community_id: communityId,
      type: 'payment_failed',
      title: 'Payment Failed',
      body: 'Your subscription payment failed. Please update your payment method.',
      data: { invoice_id: inv.id },
      link: `/c/${communityId}/admin/billing`,
    }));

    await supabase.from('notifications').insert(notifications);
  }
}
