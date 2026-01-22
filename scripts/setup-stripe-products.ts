/**
 * Setup Stripe Products & Prices
 *
 * Run with: npx tsx scripts/setup-stripe-products.ts
 *
 * This script creates all subscription tier products/prices and add-on products/prices
 * in Stripe, then updates the database with the Stripe IDs.
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Subscription tiers configuration
const TIERS = [
  {
    id: 'starter',
    name: 'ComeOnUnity Starter',
    description: 'Perfect for small house communities - up to 10 members, 10 items, 2 resources',
    priceAnnual: 900,   // €9/year in cents
    priceMonthly: 89,   // €0.89/month in cents
  },
  {
    id: 'community',
    name: 'ComeOnUnity Community',
    description: 'Great for growing communities - up to 15 members, 20 items, 5 resources',
    priceAnnual: 1500,  // €15/year
    priceMonthly: 147,  // €1.47/month
  },
  {
    id: 'growth',
    name: 'ComeOnUnity Growth',
    description: 'For active, engaged communities - up to 30 members, 50 items, 10 resources',
    priceAnnual: 3500,  // €35/year
    priceMonthly: 342,  // €3.42/month
  },
  {
    id: 'professional',
    name: 'ComeOnUnity Professional',
    description: 'For large communities and property managers - up to 75 members, 150 items, 25 resources',
    priceAnnual: 7900,  // €79/year
    priceMonthly: 772,  // €7.72/month
  },
];

// Add-ons configuration
const ADDONS = [
  {
    id: 'extra_admin',
    name: 'Extra Admin',
    description: 'Add one additional admin to your community',
    pricePerYear: 500, // €5/year
  },
  {
    id: 'extra_members_10',
    name: '10 Extra Members',
    description: 'Increase your member limit by 10',
    pricePerYear: 300, // €3/year
  },
  {
    id: 'extra_items_20',
    name: '20 Extra Items',
    description: 'Increase your item limit by 20',
    pricePerYear: 200, // €2/year
  },
  {
    id: 'extra_resources_5',
    name: '5 Extra Resources',
    description: 'Add 5 more bookable resources',
    pricePerYear: 300, // €3/year
  },
  {
    id: 'extra_storage_2gb',
    name: '2 GB Extra Storage',
    description: 'Increase your storage by 2 GB',
    pricePerYear: 400, // €4/year
  },
  {
    id: 'marketplace',
    name: 'Marketplace Add-on',
    description: 'Enable buying and selling within your community',
    pricePerYear: 500, // €5/year
  },
  {
    id: 'custom_branding',
    name: 'Custom Branding',
    description: 'Add your logo and custom colors',
    pricePerYear: 1000, // €10/year
  },
  {
    id: 'priority_support',
    name: 'Priority Support',
    description: '12-hour response time guarantee',
    pricePerYear: 1500, // €15/year
  },
  {
    id: 'api_access',
    name: 'API Access',
    description: 'Developer API for custom integrations',
    pricePerYear: 2500, // €25/year
  },
];

async function createTierProducts() {
  console.log('\n📦 Creating subscription tier products...\n');

  for (const tier of TIERS) {
    console.log(`Creating product for ${tier.name}...`);

    // Create product
    const product = await stripe.products.create({
      name: tier.name,
      description: tier.description,
      metadata: {
        tier_id: tier.id,
        type: 'subscription_tier',
      },
    });

    console.log(`  ✓ Product created: ${product.id}`);

    // Create annual price
    const annualPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: tier.priceAnnual,
      currency: 'eur',
      recurring: {
        interval: 'year',
      },
      metadata: {
        tier_id: tier.id,
        billing_period: 'annual',
      },
    });

    console.log(`  ✓ Annual price created: ${annualPrice.id} (€${tier.priceAnnual / 100}/year)`);

    // Create monthly price
    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: tier.priceMonthly,
      currency: 'eur',
      recurring: {
        interval: 'month',
      },
      metadata: {
        tier_id: tier.id,
        billing_period: 'monthly',
      },
    });

    console.log(`  ✓ Monthly price created: ${monthlyPrice.id} (€${tier.priceMonthly / 100}/month)`);

    // Update database
    const { error } = await supabase
      .from('subscription_tiers')
      .update({
        stripe_product_id: product.id,
        stripe_price_annual_id: annualPrice.id,
        stripe_price_monthly_id: monthlyPrice.id,
      })
      .eq('id', tier.id);

    if (error) {
      console.error(`  ✗ Database update failed: ${error.message}`);
    } else {
      console.log(`  ✓ Database updated for ${tier.id}`);
    }

    console.log('');
  }
}

async function createAddonProducts() {
  console.log('\n🔧 Creating add-on products...\n');

  for (const addon of ADDONS) {
    console.log(`Creating product for ${addon.name}...`);

    // Create product
    const product = await stripe.products.create({
      name: addon.name,
      description: addon.description,
      metadata: {
        addon_id: addon.id,
        type: 'addon',
      },
    });

    console.log(`  ✓ Product created: ${product.id}`);

    // Create annual price (add-ons are billed yearly)
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: addon.pricePerYear,
      currency: 'eur',
      recurring: {
        interval: 'year',
      },
      metadata: {
        addon_id: addon.id,
      },
    });

    console.log(`  ✓ Price created: ${price.id} (€${addon.pricePerYear / 100}/year)`);

    // Update database
    const { error } = await supabase
      .from('addon_prices')
      .update({
        stripe_product_id: product.id,
        stripe_price_id: price.id,
      })
      .eq('addon_id', addon.id);

    if (error) {
      console.error(`  ✗ Database update failed: ${error.message}`);
    } else {
      console.log(`  ✓ Database updated for ${addon.id}`);
    }

    console.log('');
  }
}

async function main() {
  console.log('🚀 ComeOnUnity Stripe Setup');
  console.log('============================\n');

  // Verify environment
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY not found in environment');
    process.exit(1);
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Supabase credentials not found in environment');
    process.exit(1);
  }

  // Check if we're in test mode
  const isTestMode = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_');
  console.log(`Mode: ${isTestMode ? '🧪 TEST' : '🔴 LIVE'}`);

  try {
    // Create tier products
    await createTierProducts();

    // Create addon products
    await createAddonProducts();

    console.log('\n✅ Setup complete!\n');
    console.log('Next steps:');
    console.log('1. Configure webhook endpoint in Stripe Dashboard');
    console.log('2. Test the checkout flow');
    console.log('3. Verify webhook events are being received\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

main();
