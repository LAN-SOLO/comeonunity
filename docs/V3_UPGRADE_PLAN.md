# ComeOnUnity v3 Upgrade Plan

> **Last Updated:** January 2026
> **Status:** In Progress - Phase 1 Complete

## Executive Summary

This document outlines the upgrade path from v2 to v3, introducing two major new modules:
1. **Office Community Type** - Desk booking, floor plans, meeting rooms, parking, visitors
2. **Full Marketplace with Escrow** - Complete buying/selling with secure payments

---

## Current Progress

### Completed
- [x] **V3 Upgrade Plan** - This document
- [x] **Database Migration 014** - Office module tables with RLS policies
- [x] **Database Migration 015** - Marketplace enhancements with escrow
- [x] **TypeScript Types** - `lib/types/office.ts` and `lib/types/marketplace.ts`
- [x] **Validation Updates** - Added `office` type and office plans
- [x] **Office Dashboard** - `app/(app)/c/[communityId]/office/page.tsx`
- [x] **Desk Booking Page** - `app/(app)/c/[communityId]/office/desks/page.tsx`
- [x] **Team Calendar Page** - `app/(app)/c/[communityId]/office/team/page.tsx`

### In Progress
- [ ] Run SQL migrations in Supabase
- [ ] Create remaining Office pages (floor plans, meeting rooms, parking, visitors)

### Pending
- [ ] Stripe Office tier products
- [ ] Marketplace UI components
- [ ] Escrow payment integration

---

## Current State (v2) vs Target State (v3)

### Community Types

| Type | v2 Status | v3 Status |
|------|-----------|-----------|
| WEG (Homeowners Association) | ✅ Implemented | ✅ No changes |
| House Community | ✅ Implemented | ✅ No changes |
| Neighborhood | ✅ Implemented | ✅ No changes |
| Co-Housing | ✅ Implemented | ✅ No changes |
| Interest Group | ✅ Implemented | ✅ No changes |
| **Office** | ❌ Not implemented | 🆕 New in v3 |

### Pricing Tiers

| Tier | v2 Price | v3 Price | Changes |
|------|----------|----------|---------|
| Free | €0 | €0 | No change |
| Starter | €9/year | €9/year | No change |
| Community | €15/year | €15/year | No change |
| Growth | €35/year | €35/year | No change |
| Professional | €79/year | €79/year | No change |
| **Office Starter** | ❌ N/A | 🆕 €15/year | New tier |
| **Office Pro** | ❌ N/A | 🆕 €35/year | New tier |
| **Office Enterprise** | ❌ N/A | 🆕 €79/year | New tier |

### Marketplace

| Feature | v2 Status | v3 Status |
|---------|-----------|-----------|
| Listings table | ✅ Basic | ✅ Enhanced |
| Transactions table | ✅ Basic | ✅ Enhanced |
| Fee ledger | ✅ Implemented | ✅ No changes |
| **Escrow System** | ❌ Not implemented | 🆕 New |
| **Disputes** | ❌ Not implemented | 🆕 New |
| **Reviews** | ❌ Not implemented | 🆕 New |
| **Messaging** | ❌ Not implemented | 🆕 New |
| **Favorites** | ❌ Not implemented | 🆕 New |
| Marketplace UI | ⚠️ Minimal | 🆕 Full implementation |

### Office Features (All New in v3)

| Feature | v2 Status | v3 Status |
|---------|-----------|-----------|
| Floor Plans | ❌ N/A | 🆕 New |
| Desks | ❌ N/A | 🆕 New |
| Desk Bookings | ❌ N/A | 🆕 New |
| Meeting Rooms | ❌ N/A | 🆕 New |
| Room Bookings | ❌ N/A | 🆕 New |
| Parking Spots | ❌ N/A | 🆕 New |
| Visitors | ❌ N/A | 🆕 New |
| Work Locations | ❌ N/A | 🆕 New |

---

## Phase 1: Database Schema Updates

### Priority: HIGH

### 1.1 Office Module Tables

```sql
-- Floor Plans
CREATE TABLE floor_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  floor_number INTEGER NOT NULL DEFAULT 0,
  svg_data TEXT, -- SVG floor plan
  image_url TEXT, -- Uploaded image
  width INTEGER DEFAULT 1000,
  height INTEGER DEFAULT 800,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Desks
CREATE TABLE desks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_plan_id UUID NOT NULL REFERENCES floor_plans(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  desk_number TEXT,
  position_x INTEGER NOT NULL,
  position_y INTEGER NOT NULL,
  width INTEGER DEFAULT 60,
  height INTEGER DEFAULT 40,
  equipment JSONB DEFAULT '[]', -- monitors, docking stations, etc.
  is_bookable BOOLEAN DEFAULT true,
  is_assigned BOOLEAN DEFAULT false,
  assigned_to UUID REFERENCES community_members(id),
  status TEXT DEFAULT 'available', -- available, occupied, maintenance
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Desk Bookings
CREATE TABLE desk_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  desk_id UUID NOT NULL REFERENCES desks(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_full_day BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'confirmed', -- confirmed, cancelled, completed
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meeting Rooms
CREATE TABLE meeting_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_plan_id UUID REFERENCES floor_plans(id) ON DELETE SET NULL,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 6,
  position_x INTEGER,
  position_y INTEGER,
  width INTEGER DEFAULT 100,
  height INTEGER DEFAULT 80,
  equipment JSONB DEFAULT '[]', -- projector, whiteboard, video conferencing
  hourly_rate DECIMAL(10,2) DEFAULT 0,
  min_booking_duration INTEGER DEFAULT 30, -- minutes
  max_booking_duration INTEGER DEFAULT 480, -- 8 hours
  advance_booking_days INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Room Bookings
CREATE TABLE room_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES meeting_rooms(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  attendees UUID[] DEFAULT '{}',
  external_attendees JSONB DEFAULT '[]', -- {name, email}
  status TEXT DEFAULT 'confirmed',
  recurring_pattern JSONB, -- for recurring meetings
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parking Spots
CREATE TABLE parking_spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  spot_number TEXT NOT NULL,
  location TEXT, -- e.g., "Underground Level 1"
  type TEXT DEFAULT 'standard', -- standard, handicap, ev_charging, motorcycle
  is_bookable BOOLEAN DEFAULT true,
  is_assigned BOOLEAN DEFAULT false,
  assigned_to UUID REFERENCES community_members(id),
  monthly_rate DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Visitors
CREATE TABLE visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  host_member_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  visitor_name TEXT NOT NULL,
  visitor_email TEXT,
  visitor_company TEXT,
  visit_date DATE NOT NULL,
  expected_arrival TIME,
  expected_departure TIME,
  purpose TEXT,
  status TEXT DEFAULT 'expected', -- expected, checked_in, checked_out, cancelled
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  badge_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Work Locations (for team visibility)
CREATE TABLE work_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  location_type TEXT NOT NULL, -- office, home, travel, off
  desk_id UUID REFERENCES desks(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, date)
);
```

### 1.2 Enhanced Marketplace Tables

```sql
-- Marketplace Conversations (for buyer-seller communication)
CREATE TABLE marketplace_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active', -- active, closed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketplace Messages
CREATE TABLE marketplace_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES marketplace_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketplace Reviews
CREATE TABLE marketplace_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES marketplace_transactions(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  is_buyer_review BOOLEAN NOT NULL, -- true = buyer reviewing seller
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketplace Disputes
CREATE TABLE marketplace_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES marketplace_transactions(id) ON DELETE CASCADE,
  initiated_by UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'open', -- open, under_review, resolved_buyer, resolved_seller, closed
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketplace Favorites
CREATE TABLE marketplace_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, listing_id)
);

-- Enhance existing marketplace_transactions for escrow
ALTER TABLE marketplace_transactions ADD COLUMN IF NOT EXISTS
  escrow_status TEXT DEFAULT 'none', -- none, held, released, refunded
  escrow_held_at TIMESTAMPTZ,
  escrow_released_at TIMESTAMPTZ,
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  buyer_confirmed_at TIMESTAMPTZ,
  auto_release_at TIMESTAMPTZ; -- 7 days after delivery
```

### 1.3 Office Pricing Tiers

```sql
-- Add Office subscription tiers
INSERT INTO subscription_tiers (id, name, slug, annual_price, monthly_price, max_members, max_items, max_resources, storage_mb, features, stripe_annual_price_id, stripe_monthly_price_id, is_office_tier)
VALUES
  (gen_random_uuid(), 'Office Starter', 'office_starter', 15.00, 1.47, 25, 0, 10, 2048,
   '{"desk_booking": true, "floor_plans": 1, "meeting_rooms": 2, "parking_spots": 10, "visitors": true}',
   'price_office_starter_annual', 'price_office_starter_monthly', true),
  (gen_random_uuid(), 'Office Pro', 'office_pro', 35.00, 3.42, 75, 0, 25, 5120,
   '{"desk_booking": true, "floor_plans": 3, "meeting_rooms": 5, "parking_spots": 30, "visitors": true, "team_calendar": true, "analytics": true}',
   'price_office_pro_annual', 'price_office_pro_monthly', true),
  (gen_random_uuid(), 'Office Enterprise', 'office_enterprise', 79.00, 7.72, 200, 0, 100, 20480,
   '{"desk_booking": true, "floor_plans": -1, "meeting_rooms": -1, "parking_spots": -1, "visitors": true, "team_calendar": true, "analytics": true, "api_access": true, "sso": true, "custom_branding": true}',
   'price_office_enterprise_annual', 'price_office_enterprise_monthly', true);

-- Add is_office_tier column if not exists
ALTER TABLE subscription_tiers ADD COLUMN IF NOT EXISTS is_office_tier BOOLEAN DEFAULT false;
```

---

## Phase 2: Office Module Implementation

### Priority: HIGH

### 2.1 Directory Structure

```
app/(app)/c/[communityId]/office/
├── page.tsx                    # Office dashboard
├── floor-plans/
│   ├── page.tsx               # List floor plans
│   ├── [floorPlanId]/
│   │   ├── page.tsx           # View floor plan with desks
│   │   └── edit/page.tsx      # Edit floor plan (admin)
│   └── new/page.tsx           # Create floor plan (admin)
├── desks/
│   ├── page.tsx               # Desk booking calendar
│   └── [deskId]/page.tsx      # Desk details & booking
├── meeting-rooms/
│   ├── page.tsx               # Room list & availability
│   └── [roomId]/
│       ├── page.tsx           # Room details
│       └── book/page.tsx      # Book room
├── parking/
│   ├── page.tsx               # Parking overview
│   └── book/page.tsx          # Book parking spot
├── visitors/
│   ├── page.tsx               # Visitor log
│   ├── register/page.tsx      # Register visitor
│   └── [visitorId]/page.tsx   # Visitor details
└── team/
    └── page.tsx               # Team location calendar

components/office/
├── floor-plan-viewer.tsx      # Interactive SVG viewer
├── floor-plan-editor.tsx      # Admin editor
├── desk-card.tsx              # Desk info card
├── desk-booking-modal.tsx     # Booking dialog
├── room-calendar.tsx          # Meeting room availability
├── room-booking-form.tsx      # Room booking form
├── parking-map.tsx            # Parking visualization
├── visitor-form.tsx           # Visitor registration
├── team-calendar.tsx          # Where is everyone
└── work-location-picker.tsx   # Set your location
```

### 2.2 Key Components to Build

1. **Floor Plan Viewer** - Interactive SVG with clickable desks
2. **Desk Booking Calendar** - Week/day view for desk availability
3. **Meeting Room Scheduler** - Time-slot based booking
4. **Visitor Management** - Check-in/out with badge printing
5. **Team Calendar** - Visual "where is everyone" view

---

## Phase 3: Marketplace Enhancement

### Priority: MEDIUM

### 3.1 Directory Structure

```
app/(app)/c/[communityId]/marketplace/
├── page.tsx                    # Marketplace home
├── listings/
│   ├── page.tsx               # Browse listings
│   ├── [listingId]/
│   │   ├── page.tsx           # Listing details
│   │   └── edit/page.tsx      # Edit listing
│   └── new/page.tsx           # Create listing
├── messages/
│   ├── page.tsx               # All conversations
│   └── [conversationId]/page.tsx  # Chat view
├── my-listings/page.tsx       # Seller dashboard
├── my-purchases/page.tsx      # Buyer history
├── favorites/page.tsx         # Saved listings
└── disputes/
    ├── page.tsx               # My disputes
    └── [disputeId]/page.tsx   # Dispute details

components/marketplace/
├── listing-card.tsx           # Grid item
├── listing-gallery.tsx        # Image carousel
├── listing-form.tsx           # Create/edit form
├── price-badge.tsx            # Price display with fee
├── chat-window.tsx            # Messaging interface
├── escrow-status.tsx          # Payment status
├── review-form.tsx            # Leave review
├── review-stars.tsx           # Star rating display
├── dispute-form.tsx           # Open dispute
└── transaction-timeline.tsx   # Status tracking
```

### 3.2 Escrow Flow

```
1. Buyer clicks "Buy Now"
   └── Stripe checkout creates PaymentIntent (hold funds)

2. Payment successful
   └── Transaction created with escrow_status = 'held'
   └── Seller notified

3. Seller marks as shipped/delivered
   └── Buyer has 7 days to confirm or dispute

4a. Buyer confirms receipt
    └── escrow_status = 'released'
    └── Funds transferred to seller (minus fees)
    └── Review prompts sent

4b. Buyer opens dispute
    └── Admin reviews evidence
    └── Resolution: buyer refund OR seller payment

4c. 7 days pass without action
    └── Auto-release to seller
```

---

## Phase 4: API Routes

### Office API Routes

```
app/api/communities/[id]/office/
├── floor-plans/
│   ├── route.ts              # GET list, POST create
│   └── [floorPlanId]/route.ts # GET, PATCH, DELETE
├── desks/
│   ├── route.ts              # GET list, POST create
│   ├── [deskId]/route.ts     # GET, PATCH, DELETE
│   └── [deskId]/book/route.ts # POST book desk
├── desk-bookings/
│   ├── route.ts              # GET my bookings
│   └── [bookingId]/route.ts  # PATCH cancel, POST check-in
├── meeting-rooms/
│   ├── route.ts              # GET list
│   ├── [roomId]/route.ts     # GET, PATCH
│   └── [roomId]/book/route.ts # POST book room
├── room-bookings/
│   └── [bookingId]/route.ts  # PATCH, DELETE
├── parking/
│   ├── route.ts              # GET spots
│   └── book/route.ts         # POST book spot
├── visitors/
│   ├── route.ts              # GET list, POST register
│   └── [visitorId]/route.ts  # PATCH (check-in/out), DELETE
└── work-locations/
    ├── route.ts              # GET team locations
    └── my/route.ts           # GET/POST my location
```

### Marketplace API Routes

```
app/api/communities/[id]/marketplace/
├── listings/
│   ├── route.ts              # GET browse, POST create
│   └── [listingId]/route.ts  # GET, PATCH, DELETE
├── conversations/
│   ├── route.ts              # GET my conversations
│   ├── [conversationId]/route.ts # GET messages
│   └── [conversationId]/messages/route.ts # POST message
├── transactions/
│   ├── route.ts              # GET my transactions
│   └── [transactionId]/
│       ├── route.ts          # GET details
│       ├── confirm/route.ts  # POST buyer confirm
│       └── dispute/route.ts  # POST open dispute
├── reviews/
│   └── route.ts              # POST create review
├── disputes/
│   └── [disputeId]/route.ts  # GET, PATCH (admin resolve)
└── favorites/
    ├── route.ts              # GET my favorites
    └── [listingId]/route.ts  # POST add, DELETE remove
```

---

## Phase 5: Stripe Integration Updates

### 5.1 Escrow Implementation

```typescript
// lib/billing/escrow-manager.ts

export async function createEscrowPayment(
  transactionId: string,
  amount: number,
  buyerId: string,
  sellerId: string
) {
  // 1. Create PaymentIntent with manual capture
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'eur',
    capture_method: 'manual', // Hold funds, don't capture yet
    metadata: {
      transaction_id: transactionId,
      buyer_id: buyerId,
      seller_id: sellerId,
    },
  });

  return paymentIntent;
}

export async function releaseEscrow(transactionId: string) {
  // 1. Capture the held payment
  // 2. Create transfer to seller (minus fees)
  // 3. Update transaction status
}

export async function refundEscrow(transactionId: string, reason: string) {
  // 1. Cancel/refund the PaymentIntent
  // 2. Update transaction status
}
```

### 5.2 Office Tier Stripe Products

Create in Stripe Dashboard:
- `prod_office_starter` with prices for annual/monthly
- `prod_office_pro` with prices for annual/monthly
- `prod_office_enterprise` with prices for annual/monthly

---

## Implementation Timeline

### Week 1-2: Database & Foundation ✅ COMPLETE
- [x] Create migration 014_office_module.sql
- [x] Create migration 015_marketplace_enhancements.sql
- [x] Add RLS policies for new tables
- [x] Update TypeScript types
- [ ] Add office tier to subscription system (Stripe setup pending)

### Week 3-4: Office Core Features 🔄 IN PROGRESS
- [ ] Floor plan viewer component
- [ ] Floor plan list page
- [ ] Floor plan detail page
- [x] Desk booking system (basic page done)
- [ ] Meeting room list page
- [ ] Meeting room booking page

### Week 5-6: Office Advanced Features
- [ ] Floor plan editor (admin)
- [ ] Parking spot management
- [ ] Parking booking page
- [ ] Visitor registration
- [x] Team location calendar ✅
- [x] Office dashboard ✅

### Week 7-8: Marketplace Enhancement
- [ ] Marketplace listing page
- [ ] Create/edit listing forms
- [ ] Conversation/messaging system
- [ ] Escrow payment flow (Stripe)
- [ ] Review system
- [ ] Dispute handling UI
- [ ] Favorites feature

### Week 9-10: Polish & Testing
- [ ] UI/UX refinement
- [ ] Mobile responsiveness
- [ ] Error handling improvements
- [ ] Performance optimization
- [ ] User acceptance testing

---

## Migration Checklist

Before deploying v3:

- [ ] Backup production database
- [ ] Run migrations in staging first
- [ ] Update Stripe products and prices
- [ ] Test subscription tier changes
- [ ] Verify RLS policies
- [ ] Test escrow flow end-to-end
- [ ] Update documentation
- [ ] Prepare user communication

---

## Risk Mitigation

1. **Data Migration**: No existing data changes required - all new tables
2. **Backward Compatibility**: Existing communities unaffected
3. **Payment Security**: Use Stripe's built-in escrow (PaymentIntent with manual capture)
4. **Performance**: Add indexes for common queries
5. **User Experience**: Gradual rollout with feature flags if needed

---

## Success Metrics

- Office communities created
- Desk booking utilization rate
- Meeting room booking volume
- Marketplace transaction volume
- Escrow dispute rate (target: <2%)
- User satisfaction scores

---

## Immediate Next Steps

### Priority 1: Database Setup (Required First)
1. **Run SQL Migrations in Supabase**
   - Go to Supabase Dashboard → SQL Editor
   - Execute `014_office_module.sql` (creates 8 new tables)
   - Execute `015_marketplace_enhancements.sql` (enhances marketplace)
   - Verify tables created: `floor_plans`, `desks`, `desk_bookings`, `meeting_rooms`, `room_bookings`, `parking_spots`, `parking_bookings`, `visitors`, `work_locations`
   - Verify marketplace tables: `marketplace_conversations`, `marketplace_messages`, `marketplace_reviews`, `marketplace_disputes`, `marketplace_favorites`

2. **Add Office Tiers to subscription_tiers Table**
   ```sql
   -- Run after migrations
   INSERT INTO subscription_tiers (name, slug, annual_price, monthly_price, max_members, max_items, max_resources, storage_mb, features)
   VALUES
     ('Office Starter', 'office_starter', 15.00, 1.47, 25, 0, 10, 2048, '{"desk_booking": true, "floor_plans": 1, "meeting_rooms": 2}'),
     ('Office Pro', 'office_pro', 35.00, 3.42, 75, 0, 25, 5120, '{"desk_booking": true, "floor_plans": 3, "meeting_rooms": 5, "analytics": true}'),
     ('Office Enterprise', 'office_enterprise', 79.00, 7.72, 200, 0, 100, 20480, '{"desk_booking": true, "floor_plans": -1, "meeting_rooms": -1, "api_access": true}');
   ```

### Priority 2: Complete Office UI Pages
1. **Floor Plans Module**
   - `app/(app)/c/[communityId]/office/floor-plans/page.tsx` - List all floor plans
   - `app/(app)/c/[communityId]/office/floor-plans/[floorPlanId]/page.tsx` - View floor plan with desks
   - `app/(app)/c/[communityId]/office/floor-plans/new/page.tsx` - Create floor plan (admin)

2. **Meeting Rooms Module**
   - `app/(app)/c/[communityId]/office/meeting-rooms/page.tsx` - List rooms with availability
   - `app/(app)/c/[communityId]/office/meeting-rooms/[roomId]/page.tsx` - Room details & booking

3. **Parking Module**
   - `app/(app)/c/[communityId]/office/parking/page.tsx` - Parking overview & booking

4. **Visitors Module**
   - `app/(app)/c/[communityId]/office/visitors/page.tsx` - Visitor log
   - `app/(app)/c/[communityId]/office/visitors/register/page.tsx` - Register new visitor

### Priority 3: Office Components
Create reusable components in `components/office/`:
- `floor-plan-viewer.tsx` - Interactive SVG/image viewer
- `desk-card.tsx` - Desk information display
- `room-availability-grid.tsx` - Time slot availability
- `visitor-form.tsx` - Visitor registration form
- `parking-spot-card.tsx` - Parking spot display

### Priority 4: Stripe Integration (Office Tiers)
1. Create products in Stripe Dashboard:
   - `prod_office_starter` (€15/year, €1.47/month)
   - `prod_office_pro` (€35/year, €3.42/month)
   - `prod_office_enterprise` (€79/year, €7.72/month)
2. Update `subscription_tiers` with Stripe price IDs
3. Update checkout flow to support office tiers

### Priority 5: Marketplace UI
1. **Listing Pages**
   - Browse listings with filters
   - Listing detail view
   - Create/edit listing forms

2. **Transaction Flow**
   - Checkout with escrow payment
   - Transaction status tracking
   - Delivery confirmation

3. **Communication**
   - Buyer/seller messaging
   - Review submission after transaction

---

## File Reference

### Created Files
| File | Purpose |
|------|---------|
| `supabase/migrations/014_office_module.sql` | Office tables & RLS |
| `supabase/migrations/015_marketplace_enhancements.sql` | Enhanced marketplace |
| `lib/types/office.ts` | Office TypeScript types |
| `lib/types/marketplace.ts` | Marketplace TypeScript types |
| `app/(app)/c/[communityId]/office/page.tsx` | Office dashboard |
| `app/(app)/c/[communityId]/office/desks/page.tsx` | Desk booking |
| `app/(app)/c/[communityId]/office/team/page.tsx` | Team calendar |

### Modified Files
| File | Change |
|------|--------|
| `lib/validations/community.ts` | Added `office` type and office plans |

### Directories Created
```
app/(app)/c/[communityId]/office/
├── page.tsx              ✅ Created
├── desks/
│   └── page.tsx          ✅ Created
├── floor-plans/
│   └── [floorPlanId]/    📁 Empty (pending)
├── meeting-rooms/
│   └── [roomId]/         📁 Empty (pending)
├── parking/              📁 Empty (pending)
├── visitors/             📁 Empty (pending)
└── team/
    └── page.tsx          ✅ Created
```

---

## Testing Checklist

Before considering v3 complete:

### Office Module
- [ ] Can create office community type
- [ ] Can add floor plans with image upload
- [ ] Can add desks to floor plan
- [ ] Can book a desk for a date
- [ ] Can view desk bookings
- [ ] Can cancel desk booking
- [ ] Can add meeting rooms
- [ ] Can book meeting room with time slots
- [ ] Can add parking spots
- [ ] Can book parking spot
- [ ] Can register visitors
- [ ] Can check-in/check-out visitors
- [ ] Can view/set team work locations

### Marketplace Module
- [ ] Can create marketplace listing
- [ ] Can browse/search listings
- [ ] Can favorite listings
- [ ] Can message seller about listing
- [ ] Can purchase with escrow payment
- [ ] Seller can mark as shipped
- [ ] Buyer can confirm receipt
- [ ] Escrow auto-releases after 7 days
- [ ] Can leave review after transaction
- [ ] Can open dispute
- [ ] Admin can resolve dispute

### Integration Tests
- [ ] RLS policies properly restrict access
- [ ] Office pages only show for office communities
- [ ] Desk booking prevents double-booking
- [ ] Room booking checks for conflicts
- [ ] Escrow payment holds funds correctly
