-- =====================================================
-- UPDATE STRIPE IDS FOR PRODUCTS AND PRICES
-- Generated from Stripe API - Test Mode
-- =====================================================

-- Update subscription tiers with Stripe IDs
UPDATE subscription_tiers SET
  stripe_product_id = 'prod_Tq1VJvsgRM3iXm',
  stripe_price_annual_id = 'price_1SsLSFFCgCQzJKRszG0Vwm5O',
  stripe_price_monthly_id = 'price_1SsLSFFCgCQzJKRspIKgLhBc'
WHERE id = 'starter';

UPDATE subscription_tiers SET
  stripe_product_id = 'prod_Tq1VHf5DzNG9j9',
  stripe_price_annual_id = 'price_1SsLSGFCgCQzJKRsHDfazRlC',
  stripe_price_monthly_id = 'price_1SsLSGFCgCQzJKRsGeOkAooL'
WHERE id = 'community';

UPDATE subscription_tiers SET
  stripe_product_id = 'prod_Tq1V94Ke5WORjw',
  stripe_price_annual_id = 'price_1SsLSHFCgCQzJKRs6U0uaQji',
  stripe_price_monthly_id = 'price_1SsLSHFCgCQzJKRsjcG6Su5P'
WHERE id = 'growth';

UPDATE subscription_tiers SET
  stripe_product_id = 'prod_Tq1VfqFNzJVqMD',
  stripe_price_annual_id = 'price_1SsLSHFCgCQzJKRsSgS6a44h',
  stripe_price_monthly_id = 'price_1SsLSIFCgCQzJKRsDUITfjBu'
WHERE id = 'professional';

-- Update add-on prices with Stripe IDs
UPDATE addon_prices SET
  stripe_product_id = 'prod_Tq1VLv7TTJgFXv',
  stripe_price_id = 'price_1SsLSIFCgCQzJKRs2uwI8il1'
WHERE addon_id = 'extra_admin';

UPDATE addon_prices SET
  stripe_product_id = 'prod_Tq1V0PCJl6vm1j',
  stripe_price_id = 'price_1SsLSJFCgCQzJKRsWpmlS6vc'
WHERE addon_id = 'extra_members_10';

UPDATE addon_prices SET
  stripe_product_id = 'prod_Tq1VjXCctmkRb2',
  stripe_price_id = 'price_1SsLSJFCgCQzJKRs3pMLmnr6'
WHERE addon_id = 'extra_items_20';

UPDATE addon_prices SET
  stripe_product_id = 'prod_Tq1Vt92QA3TBe4',
  stripe_price_id = 'price_1SsLSKFCgCQzJKRsVy30FqzI'
WHERE addon_id = 'extra_resources_5';

UPDATE addon_prices SET
  stripe_product_id = 'prod_Tq1V1s1Se78riy',
  stripe_price_id = 'price_1SsLSKFCgCQzJKRssKkcLDPX'
WHERE addon_id = 'extra_storage_2gb';

UPDATE addon_prices SET
  stripe_product_id = 'prod_Tq1ViHfYoHL08b',
  stripe_price_id = 'price_1SsLSLFCgCQzJKRssaH7gcmN'
WHERE addon_id = 'marketplace';

UPDATE addon_prices SET
  stripe_product_id = 'prod_Tq1V6Li6oORTS2',
  stripe_price_id = 'price_1SsLSLFCgCQzJKRsLucr88af'
WHERE addon_id = 'custom_branding';

UPDATE addon_prices SET
  stripe_product_id = 'prod_Tq1VSCDTqY4ZZa',
  stripe_price_id = 'price_1SsLSMFCgCQzJKRsr2BipEtK'
WHERE addon_id = 'priority_support';

UPDATE addon_prices SET
  stripe_product_id = 'prod_Tq1V5GrKB2HzSN',
  stripe_price_id = 'price_1SsLSNFCgCQzJKRs34AkNLZG'
WHERE addon_id = 'api_access';
