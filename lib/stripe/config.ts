// Subscription tier definitions
// Prices are in cents (EUR)

export const TRIAL_PERIOD_DAYS = 14;
export const COOLDOWN_PERIOD_DAYS = 14;

export interface TierLimits {
  maxMembers: number;
  maxItems: number;
  maxResources: number;
  maxAdmins: number;
  maxStorageMb: number;
  maxCommunities: number;
}

export interface TierFeatures {
  events: boolean;
  polls: boolean;
  documents: boolean;
  messaging: boolean;
  analytics: boolean;
  customBranding: boolean;
  prioritySupport: boolean;
  apiAccess: boolean;
}

export interface SubscriptionTier {
  id: string;
  name: string;
  displayName: string;
  description: string;
  priceAnnual: number;  // cents
  priceMonthly: number; // cents
  limits: TierLimits;
  features: TierFeatures;
  popular?: boolean;
}

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: 'starter',
    name: 'starter',
    displayName: 'Starter',
    description: 'Perfect for small house communities',
    priceAnnual: 900,      // €9/year
    priceMonthly: 89,      // €0.89/month
    limits: {
      maxMembers: 10,
      maxItems: 10,
      maxResources: 2,
      maxAdmins: 1,
      maxStorageMb: 500,
      maxCommunities: 1,
    },
    features: {
      events: true,
      polls: false,
      documents: false,
      messaging: false,
      analytics: true,
      customBranding: false,
      prioritySupport: false,
      apiAccess: false,
    },
  },
  {
    id: 'community',
    name: 'community',
    displayName: 'Community',
    description: 'Great for growing communities',
    priceAnnual: 1500,     // €15/year
    priceMonthly: 147,     // €1.47/month
    limits: {
      maxMembers: 15,
      maxItems: 20,
      maxResources: 5,
      maxAdmins: 1,
      maxStorageMb: 1024,
      maxCommunities: 1,
    },
    features: {
      events: true,
      polls: true,
      documents: true,
      messaging: false,
      analytics: true,
      customBranding: false,
      prioritySupport: false,
      apiAccess: false,
    },
    popular: true,
  },
  {
    id: 'growth',
    name: 'growth',
    displayName: 'Growth',
    description: 'For active, engaged communities',
    priceAnnual: 3500,     // €35/year
    priceMonthly: 342,     // €3.42/month
    limits: {
      maxMembers: 30,
      maxItems: 50,
      maxResources: 10,
      maxAdmins: 2,
      maxStorageMb: 3072,
      maxCommunities: 1,
    },
    features: {
      events: true,
      polls: true,
      documents: true,
      messaging: true,
      analytics: true,
      customBranding: false,
      prioritySupport: false,
      apiAccess: false,
    },
  },
  {
    id: 'professional',
    name: 'professional',
    displayName: 'Professional',
    description: 'For large communities and property managers',
    priceAnnual: 7900,     // €79/year
    priceMonthly: 772,     // €7.72/month
    limits: {
      maxMembers: 75,
      maxItems: 150,
      maxResources: 25,
      maxAdmins: 3,
      maxStorageMb: 10240,
      maxCommunities: 3,
    },
    features: {
      events: true,
      polls: true,
      documents: true,
      messaging: true,
      analytics: true,
      customBranding: true,
      prioritySupport: true,
      apiAccess: false,
    },
  },
];

// Add-on definitions
export interface AddOn {
  id: string;
  name: string;
  description: string;
  pricePerYear: number; // cents
  metricIncrease?: {
    metric: 'members' | 'items' | 'resources' | 'admins' | 'storage_mb';
    amount: number;
  };
}

export const AVAILABLE_ADDONS: AddOn[] = [
  {
    id: 'extra_admin',
    name: 'Extra Admin',
    description: 'Add one additional admin to your community',
    pricePerYear: 500, // €5
    metricIncrease: { metric: 'admins', amount: 1 },
  },
  {
    id: 'extra_members_10',
    name: '10 Extra Members',
    description: 'Increase your member limit by 10',
    pricePerYear: 300, // €3
    metricIncrease: { metric: 'members', amount: 10 },
  },
  {
    id: 'extra_items_20',
    name: '20 Extra Items',
    description: 'Increase your item limit by 20',
    pricePerYear: 200, // €2
    metricIncrease: { metric: 'items', amount: 20 },
  },
  {
    id: 'extra_resources_5',
    name: '5 Extra Resources',
    description: 'Add 5 more bookable resources',
    pricePerYear: 300, // €3
    metricIncrease: { metric: 'resources', amount: 5 },
  },
  {
    id: 'extra_storage_2gb',
    name: '2 GB Extra Storage',
    description: 'Increase your storage by 2 GB',
    pricePerYear: 400, // €4
    metricIncrease: { metric: 'storage_mb', amount: 2048 },
  },
  {
    id: 'marketplace',
    name: 'Marketplace',
    description: 'Enable buying and selling within your community',
    pricePerYear: 500, // €5
  },
  {
    id: 'custom_branding',
    name: 'Custom Branding',
    description: 'Add your logo and custom colors',
    pricePerYear: 1000, // €10
  },
  {
    id: 'priority_support',
    name: 'Priority Support',
    description: '12-hour response time guarantee',
    pricePerYear: 1500, // €15
  },
  {
    id: 'api_access',
    name: 'API Access',
    description: 'Developer API for custom integrations',
    pricePerYear: 2500, // €25
  },
];

// Marketplace fee calculation
export interface FeeCalculation {
  itemPrice: number;        // Original price in cents
  fee: number;              // Platform fee in cents
  buyerTotal: number;       // What buyer pays
  sellerReceives: number;   // What seller gets
  feePercentage: number;    // Effective fee percentage
}

export function calculateMarketplaceFee(priceInCents: number): FeeCalculation {
  let fee: number;

  if (priceInCents === 0) {
    // Free items - no fee
    fee = 0;
  } else if (priceInCents <= 1000) {
    // €0-10: flat €0.25 fee
    fee = 25;
  } else if (priceInCents <= 5000) {
    // €10-50: 2.5% fee
    fee = Math.round(priceInCents * 0.025);
  } else if (priceInCents <= 20000) {
    // €50-200: 2.0% fee
    fee = Math.round(priceInCents * 0.02);
  } else {
    // €200+: 1.5% fee, max €10
    fee = Math.min(1000, Math.round(priceInCents * 0.015));
  }

  return {
    itemPrice: priceInCents,
    fee,
    buyerTotal: priceInCents + fee,
    sellerReceives: priceInCents,
    feePercentage: priceInCents > 0 ? (fee / priceInCents) * 100 : 0,
  };
}

// Helper to get tier by ID
export function getTierById(tierId: string): SubscriptionTier | undefined {
  return SUBSCRIPTION_TIERS.find((tier) => tier.id === tierId);
}

// Helper to get addon by ID
export function getAddonById(addonId: string): AddOn | undefined {
  return AVAILABLE_ADDONS.find((addon) => addon.id === addonId);
}

// Format price for display (EUR)
export function formatPrice(cents: number, locale = 'de-DE'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}
