/**
 * Run Stripe ID Migration
 *
 * Run with: npx tsx scripts/run-stripe-migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const tierUpdates = [
  {
    id: 'starter',
    stripe_product_id: 'prod_Tq1VJvsgRM3iXm',
    stripe_price_annual_id: 'price_1SsLSFFCgCQzJKRszG0Vwm5O',
    stripe_price_monthly_id: 'price_1SsLSFFCgCQzJKRspIKgLhBc',
  },
  {
    id: 'community',
    stripe_product_id: 'prod_Tq1VHf5DzNG9j9',
    stripe_price_annual_id: 'price_1SsLSGFCgCQzJKRsHDfazRlC',
    stripe_price_monthly_id: 'price_1SsLSGFCgCQzJKRsGeOkAooL',
  },
  {
    id: 'growth',
    stripe_product_id: 'prod_Tq1V94Ke5WORjw',
    stripe_price_annual_id: 'price_1SsLSHFCgCQzJKRs6U0uaQji',
    stripe_price_monthly_id: 'price_1SsLSHFCgCQzJKRsjcG6Su5P',
  },
  {
    id: 'professional',
    stripe_product_id: 'prod_Tq1VfqFNzJVqMD',
    stripe_price_annual_id: 'price_1SsLSHFCgCQzJKRsSgS6a44h',
    stripe_price_monthly_id: 'price_1SsLSIFCgCQzJKRsDUITfjBu',
  },
];

const addonUpdates = [
  { addon_id: 'extra_admin', stripe_product_id: 'prod_Tq1VLv7TTJgFXv', stripe_price_id: 'price_1SsLSIFCgCQzJKRs2uwI8il1' },
  { addon_id: 'extra_members_10', stripe_product_id: 'prod_Tq1V0PCJl6vm1j', stripe_price_id: 'price_1SsLSJFCgCQzJKRsWpmlS6vc' },
  { addon_id: 'extra_items_20', stripe_product_id: 'prod_Tq1VjXCctmkRb2', stripe_price_id: 'price_1SsLSJFCgCQzJKRs3pMLmnr6' },
  { addon_id: 'extra_resources_5', stripe_product_id: 'prod_Tq1Vt92QA3TBe4', stripe_price_id: 'price_1SsLSKFCgCQzJKRsVy30FqzI' },
  { addon_id: 'extra_storage_2gb', stripe_product_id: 'prod_Tq1V1s1Se78riy', stripe_price_id: 'price_1SsLSKFCgCQzJKRssKkcLDPX' },
  { addon_id: 'marketplace', stripe_product_id: 'prod_Tq1ViHfYoHL08b', stripe_price_id: 'price_1SsLSLFCgCQzJKRssaH7gcmN' },
  { addon_id: 'custom_branding', stripe_product_id: 'prod_Tq1V6Li6oORTS2', stripe_price_id: 'price_1SsLSLFCgCQzJKRsLucr88af' },
  { addon_id: 'priority_support', stripe_product_id: 'prod_Tq1VSCDTqY4ZZa', stripe_price_id: 'price_1SsLSMFCgCQzJKRsr2BipEtK' },
  { addon_id: 'api_access', stripe_product_id: 'prod_Tq1V5GrKB2HzSN', stripe_price_id: 'price_1SsLSNFCgCQzJKRs34AkNLZG' },
];

async function main() {
  console.log('📝 Updating database with Stripe IDs...\n');

  // Update subscription tiers
  console.log('Updating subscription tiers...');
  for (const tier of tierUpdates) {
    const { error } = await supabase
      .from('subscription_tiers')
      .update({
        stripe_product_id: tier.stripe_product_id,
        stripe_price_annual_id: tier.stripe_price_annual_id,
        stripe_price_monthly_id: tier.stripe_price_monthly_id,
      })
      .eq('id', tier.id);

    if (error) {
      console.log(`  ✗ ${tier.id}: ${error.message}`);
    } else {
      console.log(`  ✓ ${tier.id}`);
    }
  }

  // Update add-on prices
  console.log('\nUpdating add-on prices...');
  for (const addon of addonUpdates) {
    const { error } = await supabase
      .from('addon_prices')
      .update({
        stripe_product_id: addon.stripe_product_id,
        stripe_price_id: addon.stripe_price_id,
      })
      .eq('addon_id', addon.addon_id);

    if (error) {
      console.log(`  ✗ ${addon.addon_id}: ${error.message}`);
    } else {
      console.log(`  ✓ ${addon.addon_id}`);
    }
  }

  console.log('\n✅ Done!');
}

main().catch(console.error);
