# 🏘️ ComeOnUnity v2.0

> **Digital Platform for Neighborhood & House Communities**  
> *Enterprise-Grade Security · Comprehensive Admin · Apple-Inspired Design*

---

## Executive Summary

A self-service platform that connects residents of house communities, neighborhoods, or interest groups. Members can share skills, lend items, book shared resources, and stay informed about community news and events. Built for the European market with enterprise-grade security, comprehensive administration capabilities, and an Apple-inspired user experience.

| Metric | Value |
|--------|-------|
| **Target Market** | House communities, WEGs, neighborhoods, interest groups |
| **MVP Story Points** | 68 |
| **Timeline** | 10 Weeks |
| **Revenue Model** | Freemium SaaS (per community) |
| **Languages** | 🇬🇧 English, 🇩🇪 German |
| **Security Standard** | OWASP Top 10, GDPR, ISO 27001-aligned |

---

## What's New in v2.0

### 🔐 Security Enhancements
- Two-Factor Authentication (TOTP/SMS)
- Comprehensive audit logging
- Rate limiting & brute force protection
- Session management & device tracking
- CSRF protection on all forms
- Input validation with Zod schemas
- Data encryption at rest

### 👨‍💼 Comprehensive Admin Area
- Platform-level super admin dashboard
- Community-level admin controls
- User management with role assignment
- Content moderation queue
- Analytics and reporting dashboard
- Billing and subscription management

### 🎨 Apple-Inspired Design System
- SF Pro-inspired typography
- Cupertino color palette
- Fluid animations & micro-interactions
- Accessibility-first (WCAG 2.1 AA)
- Responsive across all devices

---

## Market Gap & Opportunity

### The Problem

Existing solutions fail to meet the needs of residential communities:

- **Facebook Groups** — No structure, privacy concerns, no booking system
- **WhatsApp Groups** — Chaotic, no persistence, no resource management
- **Property Management Tools** — Too formal, expensive, admin-focused
- **Nextdoor** — US-centric, advertising-heavy, neighborhood-wide (too broad)

### The Opportunity

| Segment (Germany) | Size |
|-------------------|------|
| WEG Communities (Wohnungseigentümergemeinschaften) | ~1.5 Million |
| Rental House Communities (5+ units) | ~2 Million |
| Housing Cooperatives (Genossenschaften) | ~2,000 (5M members) |
| Intentional Communities / Co-Housing | Growing trend |
| Neighborhood Associations | Thousands |

**Trend:** Post-pandemic desire for local connection + rising sharing economy + sustainability focus.

**Pain Point:** No affordable, privacy-focused, easy-to-use solution for German-speaking market.

---

## Target Audiences & Personas

### 👩‍💼 House Manager Petra
- **Context:** Manages a 12-unit apartment building (WEG)
- **Pain Points:** Endless emails, lost documents, no overview of who has which key
- **Needs:** Central platform for announcements, document storage, member directory, **admin tools for managing members**

### 👨‍👩‍👧 Young Family — The Müllers
- **Context:** New to the neighborhood, want to connect with others
- **Pain Points:** Don't know neighbors, unsure how to borrow tools, miss community events
- **Needs:** Easy way to see what's available, join events, offer their skills, **secure login they can trust**

### 👴 Retired Neighbor Hans
- **Context:** Has time and skills (woodworking), wants to help and stay connected
- **Pain Points:** Feels isolated, doesn't use complex apps
- **Needs:** Simple interface, clear notifications, way to offer help, **large text and accessible design**

### 🏠 Co-Housing Resident Lisa
- **Context:** Lives in intentional community with shared resources (car, tools, guest room)
- **Pain Points:** Booking conflicts, unclear who borrowed what, missed cleaning duties
- **Needs:** Booking calendar, item tracking, task management, **transparency on who did what**

### 🔧 Platform Administrator Max (New)
- **Context:** Manages the ComeOnUnity platform for multiple communities
- **Pain Points:** Needs visibility into platform health, user issues, billing status
- **Needs:** Super admin dashboard, user management, analytics, audit logs

---

## User Stories (MoSCoW)

### ✅ Must Have (MVP)

| Story | Points | Category |
|-------|--------|----------|
| As an admin, I want to create a community and invite members | 5 | Setup |
| As a member, I want to join a community via invite link | 3 | Setup |
| As a member, I want to create a profile with my skills and offerings | 5 | Directory |
| As a member, I want to browse other members' skills and contact them | 5 | Directory |
| As a member, I want to list items I can lend | 5 | Lending |
| As a member, I want to browse and request to borrow items | 5 | Lending |
| As an owner, I want to approve/decline borrow requests | 3 | Lending |
| As a member, I want to see a calendar with bookable resources | 8 | Calendar |
| As a member, I want to book a shared resource (room, equipment) | 5 | Calendar |
| As an admin, I want to post announcements and news | 3 | News |
| **As a user, I want to enable 2FA for my account** | 5 | **Security** |
| **As an admin, I want to manage members (invite, suspend, remove)** | 5 | **Admin** |
| **As an admin, I want to see an activity log for my community** | 5 | **Admin** |
| **As a super admin, I want a platform dashboard** | 6 | **Admin** |
| **MVP Total** | **68** | |

### 📋 Should Have

| Story | Points | Category |
|-------|--------|----------|
| As a member, I want to create and RSVP to events | 5 | Events |
| As a member, I want to receive notifications (email/push) | 5 | Notifications |
| As a member, I want to chat with other members | 8 | Messaging |
| As an admin, I want to create polls for community decisions | 5 | Voting |
| As a member, I want to see a document archive | 3 | Documents |
| **As an admin, I want moderation tools (flag/report content)** | 5 | **Admin** |
| **As an admin, I want analytics (active users, popular items)** | 5 | **Admin** |
| **As a user, I want to manage my active sessions** | 3 | **Security** |
| **As a user, I want to export my personal data (GDPR)** | 3 | **Compliance** |

### 💡 Could Have

| Story | Points | Category |
|-------|--------|----------|
| As a member, I want to split shared expenses | 8 | Finance |
| As a member, I want to report maintenance issues | 5 | Maintenance |
| As a member, I want to see a task board (cleaning schedule) | 5 | Tasks |
| As a member, I want time-banking for skill exchanges | 8 | Advanced |
| **As an admin, I want automated backup scheduling** | 5 | **Admin** |
| **As an admin, I want custom branding (logo, colors)** | 5 | **Admin** |

### ❌ Won't Have (v1)

| Story | Reason |
|-------|--------|
| Marketplace (buy/sell) | Adds complexity, legal issues |
| Group purchases | Requires payment splitting |
| Automated rent collection | Financial regulations |

---

## Technical Architecture

### Tech Stack (Streamlined)

```
┌─────────────────────────────────────────────────────────────┐
│                       FRONTEND                               │
│  Next.js 16 (App Router) · React 19 · Tailwind CSS v4       │
│  shadcn/ui · FullCalendar · next-intl (i18n)                │
├─────────────────────────────────────────────────────────────┤
│                       VALIDATION                             │
│  Zod (schema validation) · react-hook-form                  │
├─────────────────────────────────────────────────────────────┤
│                       BACKEND                                │
│  Next.js API Routes · Supabase Edge Functions               │
├─────────────────────────────────────────────────────────────┤
│                      DATABASE                                │
│  Supabase PostgreSQL + Row Level Security                   │
├─────────────────────────────────────────────────────────────┤
│                      STORAGE                                 │
│  Supabase Storage (images, documents)                       │
├─────────────────────────────────────────────────────────────┤
│                      AUTH & SECURITY                         │
│  Supabase Auth (Email, Magic Link, Google OAuth)            │
│  TOTP 2FA via @otplib · Rate limiting via Upstash           │
├─────────────────────────────────────────────────────────────┤
│                      REALTIME                                │
│  Supabase Realtime (notifications, live updates)            │
├─────────────────────────────────────────────────────────────┤
│                      EMAIL                                   │
│  Resend (transactional emails)                              │
├─────────────────────────────────────────────────────────────┤
│                      PAYMENTS                                │
│  Stripe (subscriptions, invoicing)                          │
├─────────────────────────────────────────────────────────────┤
│                      ANALYTICS                               │
│  PostHog (product analytics, feature flags)                 │
├─────────────────────────────────────────────────────────────┤
│                      DEVTOOLS                                │
│  VS Code · claude-code · Git/GitHub                         │
└─────────────────────────────────────────────────────────────┘
```

### Dependencies Philosophy

**Core Principle:** Use Supabase for as much as possible. Add external services only when necessary.

| Category | Primary Tool | Rationale |
|----------|--------------|-----------|
| Database | Supabase PostgreSQL | Multi-tenant RLS, real-time subscriptions |
| Auth | Supabase Auth | Built-in, secure, supports OAuth |
| Storage | Supabase Storage | Integrated with RLS policies |
| Realtime | Supabase Realtime | Built-in, no extra service |
| Validation | Zod | Type-safe, works with TypeScript |
| Forms | react-hook-form | Minimal re-renders, Zod integration |
| UI | shadcn/ui | Accessible, customizable, not a dependency |
| Calendar | FullCalendar | Industry standard, feature-rich |
| i18n | next-intl | Built for Next.js App Router |
| Rate Limiting | Upstash Redis | Serverless, pay-per-request |
| Email | Resend | Simple API, good deliverability |
| Payments | Stripe | Industry standard, European support |
| Analytics | PostHog | Privacy-focused, self-hostable |

---

## Design System: Apple-Inspired Guidelines

### Design Philosophy

ComeOnUnity follows Apple's Human Interface Guidelines principles adapted for web, emphasizing clarity, deference, and depth.

### Core Principles

1. **Clarity** — Text is legible at every size, icons are precise, adornments are subtle
2. **Deference** — Fluid motion and crisp interface help users understand content
3. **Depth** — Visual layers and realistic motion convey hierarchy and vitality

### Typography System

```css
:root {
  /* Font Stack - SF Pro inspired */
  --font-display: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-text: 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'SF Mono', ui-monospace, 'Cascadia Code', monospace;
  
  /* Type Scale (Apple's Large Title style) */
  --text-xs: 0.6875rem;     /* 11px */
  --text-sm: 0.8125rem;     /* 13px */
  --text-base: 0.9375rem;   /* 15px - default body */
  --text-lg: 1.0625rem;     /* 17px */
  --text-xl: 1.25rem;       /* 20px */
  --text-2xl: 1.5rem;       /* 24px */
  --text-3xl: 1.75rem;      /* 28px */
  --text-4xl: 2.125rem;     /* 34px - Large Title */
  
  /* Line Heights */
  --leading-tight: 1.2;
  --leading-normal: 1.47;   /* Apple's default */
  --leading-relaxed: 1.6;
  
  /* Letter Spacing */
  --tracking-tight: -0.022em;
  --tracking-normal: -0.016em;
  --tracking-wide: 0.02em;
}
```

### Color System

```css
:root {
  /* Cupertino Colors - Light Mode */
  --color-bg-primary: #FFFFFF;
  --color-bg-secondary: #F2F2F7;
  --color-bg-tertiary: #E5E5EA;
  --color-bg-elevated: #FFFFFF;
  
  /* Text Colors */
  --color-text-primary: #000000;
  --color-text-secondary: #3C3C43;        /* 60% opacity */
  --color-text-tertiary: #3C3C4399;       /* 30% opacity */
  --color-text-quaternary: #3C3C434D;     /* 18% opacity */
  
  /* System Colors - Accessible Variants */
  --color-blue: #007AFF;
  --color-green: #34C759;
  --color-orange: #FF9500;
  --color-red: #FF3B30;
  --color-purple: #AF52DE;
  --color-teal: #5AC8FA;
  --color-pink: #FF2D55;
  --color-yellow: #FFCC00;
  
  /* Semantic Colors */
  --color-primary: var(--color-blue);
  --color-success: var(--color-green);
  --color-warning: var(--color-orange);
  --color-danger: var(--color-red);
  
  /* Borders & Dividers */
  --color-separator: rgba(60, 60, 67, 0.12);
  --color-separator-opaque: #C6C6C8;
  
  /* Fills (for controls) */
  --color-fill-primary: rgba(120, 120, 128, 0.2);
  --color-fill-secondary: rgba(120, 120, 128, 0.16);
  --color-fill-tertiary: rgba(120, 120, 128, 0.12);
}

/* Dark Mode */
[data-theme="dark"] {
  --color-bg-primary: #000000;
  --color-bg-secondary: #1C1C1E;
  --color-bg-tertiary: #2C2C2E;
  --color-bg-elevated: #1C1C1E;
  
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #EBEBF5;
  --color-text-tertiary: #EBEBF599;
  --color-text-quaternary: #EBEBF54D;
  
  --color-separator: rgba(84, 84, 88, 0.6);
  --color-separator-opaque: #38383A;
}
```

### Spacing System

```css
:root {
  /* 4px base unit (Apple uses 4pt) */
  --space-0: 0;
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  
  /* Standard Margins (Apple's system) */
  --margin-default: var(--space-4);     /* 16px */
  --margin-compact: var(--space-3);     /* 12px */
  --margin-large: var(--space-6);       /* 24px */
  
  /* Standard Padding */
  --padding-cell: var(--space-4);
  --padding-card: var(--space-5);
  --padding-section: var(--space-6);
}
```

### Border Radius

```css
:root {
  /* Continuous Corners (iOS style) */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;
  --radius-2xl: 28px;
  --radius-full: 9999px;
  
  /* Component-specific */
  --radius-button: var(--radius-md);
  --radius-card: var(--radius-lg);
  --radius-modal: var(--radius-xl);
  --radius-input: var(--radius-sm);
}
```

### Animation & Motion

```css
:root {
  /* Apple's spring-based timing */
  --ease-default: cubic-bezier(0.25, 0.1, 0.25, 1);
  --ease-in: cubic-bezier(0.42, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.58, 1);
  --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
  
  /* Duration Scale */
  --duration-instant: 100ms;
  --duration-fast: 200ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
  
  /* Standard Transitions */
  --transition-colors: color var(--duration-fast) var(--ease-default),
                       background-color var(--duration-fast) var(--ease-default);
  --transition-transform: transform var(--duration-normal) var(--ease-spring);
  --transition-opacity: opacity var(--duration-fast) var(--ease-out);
}

/* Micro-interactions */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Shadows & Elevation

```css
:root {
  /* Layered shadow system (Apple-style) */
  --shadow-sm: 
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 1px 3px rgba(0, 0, 0, 0.08);
  
  --shadow-md: 
    0 2px 4px rgba(0, 0, 0, 0.04),
    0 4px 8px rgba(0, 0, 0, 0.08);
  
  --shadow-lg: 
    0 4px 8px rgba(0, 0, 0, 0.04),
    0 8px 24px rgba(0, 0, 0, 0.12);
  
  --shadow-xl: 
    0 8px 16px rgba(0, 0, 0, 0.08),
    0 16px 48px rgba(0, 0, 0, 0.16);
  
  /* Elevation tokens */
  --elevation-card: var(--shadow-sm);
  --elevation-dropdown: var(--shadow-lg);
  --elevation-modal: var(--shadow-xl);
  --elevation-popover: var(--shadow-md);
}
```

### Component Patterns

#### Buttons
```css
.button {
  height: 44px;                           /* Apple's minimum touch target */
  padding: 0 var(--space-4);
  border-radius: var(--radius-button);
  font-weight: 500;
  font-size: var(--text-base);
  transition: var(--transition-colors), var(--transition-transform);
}

.button:hover {
  filter: brightness(1.1);
}

.button:active {
  transform: scale(0.98);
}

.button-primary {
  background: var(--color-primary);
  color: white;
}

.button-secondary {
  background: var(--color-fill-secondary);
  color: var(--color-primary);
}
```

#### Cards
```css
.card {
  background: var(--color-bg-elevated);
  border-radius: var(--radius-card);
  padding: var(--padding-card);
  box-shadow: var(--elevation-card);
  border: 1px solid var(--color-separator);
}
```

#### Lists (iOS-style grouped)
```css
.list-grouped {
  background: var(--color-bg-secondary);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.list-grouped-item {
  background: var(--color-bg-elevated);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-separator);
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.list-grouped-item:last-child {
  border-bottom: none;
}
```

### Accessibility Standards

| Requirement | Standard | Implementation |
|-------------|----------|----------------|
| Color Contrast | WCAG 2.1 AA (4.5:1) | All text colors tested |
| Touch Targets | 44x44px minimum | All interactive elements |
| Focus Indicators | Visible focus ring | Custom focus-visible styles |
| Screen Readers | ARIA labels | Semantic HTML + ARIA |
| Reduced Motion | prefers-reduced-motion | Respects user preference |
| Text Scaling | Up to 200% | Fluid typography |

### Icon System

Use Lucide React icons with consistent sizing:

```tsx
// Icon sizes (matching Apple's SF Symbols)
const iconSizes = {
  xs: 12,   // Inline badges
  sm: 16,   // Button icons
  md: 20,   // Default
  lg: 24,   // Navigation
  xl: 32,   // Empty states
}

// Example usage
<Users className="w-5 h-5" strokeWidth={1.5} />
```

---

## Database Schema

### Core Tables (Existing)

```sql
-- Communities (Multi-tenant root)
CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('weg', 'house', 'neighborhood', 'cohousing', 'interest')),
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'DE',
  locale TEXT DEFAULT 'de',
  timezone TEXT DEFAULT 'Europe/Berlin',
  
  -- Settings
  settings JSONB DEFAULT '{}',
  
  -- Branding (v2)
  logo_url TEXT,
  primary_color TEXT DEFAULT '#007AFF',
  
  -- Billing
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'community', 'pro')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  
  -- Status (v2)
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community Members
CREATE TABLE community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  
  -- Profile
  display_name TEXT,
  unit_number TEXT,
  phone TEXT,
  show_phone BOOLEAN DEFAULT FALSE,
  show_email BOOLEAN DEFAULT TRUE,
  bio TEXT,
  avatar_url TEXT,
  
  -- Skills
  skills TEXT[],
  skills_description TEXT,
  available_for_help BOOLEAN DEFAULT TRUE,
  
  -- Status (v2: enhanced)
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
  suspended_reason TEXT,
  suspended_at TIMESTAMPTZ,
  suspended_by UUID REFERENCES community_members,
  
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ,
  
  UNIQUE(community_id, user_id)
);

-- Items (Lending)
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities NOT NULL,
  owner_id UUID REFERENCES community_members NOT NULL,
  
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  category TEXT NOT NULL,
  images TEXT[],
  
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'borrowed', 'unavailable', 'damaged')),
  condition TEXT DEFAULT 'good',
  
  requires_approval BOOLEAN DEFAULT TRUE,
  max_borrow_days INTEGER DEFAULT 7,
  deposit_amount INTEGER,
  notes TEXT,
  pickup_location TEXT,
  
  -- Moderation (v2)
  flagged BOOLEAN DEFAULT FALSE,
  flagged_reason TEXT,
  flagged_at TIMESTAMPTZ,
  flagged_by UUID REFERENCES community_members,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resources (Bookable)
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities NOT NULL,
  
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('room', 'vehicle', 'equipment', 'space', 'other')),
  images TEXT[],
  
  booking_type TEXT DEFAULT 'slot' CHECK (booking_type IN ('slot', 'day', 'flexible')),
  slot_duration_minutes INTEGER DEFAULT 60,
  min_advance_hours INTEGER DEFAULT 1,
  max_advance_days INTEGER DEFAULT 30,
  max_duration_hours INTEGER,
  
  available_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,0],
  available_from TIME DEFAULT '08:00',
  available_until TIME DEFAULT '22:00',
  
  requires_approval BOOLEAN DEFAULT FALSE,
  rules TEXT,
  capacity INTEGER,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES resources NOT NULL,
  member_id UUID REFERENCES community_members NOT NULL,
  
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  title TEXT,
  notes TEXT,
  attendees INTEGER,
  
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  
  recurring_rule TEXT,
  parent_booking_id UUID REFERENCES bookings,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT
);

-- Borrow Requests
CREATE TABLE borrow_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items NOT NULL,
  borrower_id UUID REFERENCES community_members NOT NULL,
  
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  message TEXT,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'active', 'returned', 'overdue')),
  
  owner_response TEXT,
  responded_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  return_condition TEXT,
  return_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- News
CREATE TABLE news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities NOT NULL,
  author_id UUID REFERENCES community_members NOT NULL,
  
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_html TEXT,
  
  type TEXT DEFAULT 'announcement' CHECK (type IN ('announcement', 'update', 'important', 'event')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  pinned BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  attachments JSONB,
  allow_comments BOOLEAN DEFAULT TRUE,
  
  -- Moderation (v2)
  flagged BOOLEAN DEFAULT FALSE,
  flagged_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- News Comments
CREATE TABLE news_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id UUID REFERENCES news NOT NULL,
  author_id UUID REFERENCES community_members NOT NULL,
  
  content TEXT NOT NULL,
  parent_id UUID REFERENCES news_comments,
  
  -- Moderation (v2)
  flagged BOOLEAN DEFAULT FALSE,
  flagged_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invites
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities NOT NULL,
  
  code TEXT UNIQUE NOT NULL,
  email TEXT,
  
  max_uses INTEGER DEFAULT 1,
  uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  
  created_by UUID REFERENCES community_members,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  community_id UUID REFERENCES communities,
  
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  link TEXT,
  
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### New Tables (v2)

```sql
-- =====================================================
-- SECURITY & ADMIN TABLES (v2)
-- =====================================================

-- User Profiles (Extended auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  
  -- 2FA
  totp_secret TEXT,              -- Encrypted TOTP secret
  totp_enabled BOOLEAN DEFAULT FALSE,
  recovery_codes TEXT[],         -- Encrypted recovery codes
  
  -- Security Settings
  require_2fa BOOLEAN DEFAULT FALSE,
  last_password_change TIMESTAMPTZ,
  password_reset_required BOOLEAN DEFAULT FALSE,
  
  -- Preferences
  locale TEXT DEFAULT 'de',
  timezone TEXT DEFAULT 'Europe/Berlin',
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  
  -- Platform Role
  platform_role TEXT DEFAULT 'user' CHECK (platform_role IN ('user', 'support', 'admin', 'superadmin')),
  
  -- Account Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  suspended_reason TEXT,
  suspended_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Active Sessions
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  
  -- Session Info
  session_token TEXT UNIQUE NOT NULL,
  device_info JSONB,            -- { browser, os, device }
  ip_address INET,
  location TEXT,                -- Geo-located
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

-- Audit Log
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Actor
  user_id UUID REFERENCES auth.users,
  user_email TEXT,
  ip_address INET,
  user_agent TEXT,
  
  -- Context
  community_id UUID REFERENCES communities,
  
  -- Event
  action TEXT NOT NULL,          -- 'member.invite', 'item.create', 'booking.cancel', etc.
  resource_type TEXT NOT NULL,   -- 'member', 'item', 'booking', 'resource', 'news', etc.
  resource_id UUID,
  
  -- Details
  details JSONB,                 -- Action-specific data
  previous_state JSONB,          -- For update actions
  new_state JSONB,               -- For update actions
  
  -- Metadata
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_community ON audit_logs(community_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Moderation Reports
CREATE TABLE moderation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities NOT NULL,
  reporter_id UUID REFERENCES community_members NOT NULL,
  
  -- Target
  target_type TEXT NOT NULL CHECK (target_type IN ('member', 'item', 'news', 'comment', 'booking')),
  target_id UUID NOT NULL,
  
  -- Report Details
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'dangerous', 'other')),
  description TEXT,
  
  -- Resolution
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  resolved_by UUID REFERENCES community_members,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate Limiting (for API abuse prevention)
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  key TEXT NOT NULL,             -- 'ip:192.168.1.1', 'user:uuid', 'api:endpoint'
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER DEFAULT 1,
  
  UNIQUE(key, window_start)
);

-- Create index for rate limit lookups
CREATE INDEX idx_rate_limits_key ON rate_limits(key, window_start DESC);

-- Platform Analytics (aggregated)
CREATE TABLE platform_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  date DATE NOT NULL,
  
  -- User Metrics
  total_users INTEGER DEFAULT 0,
  active_users_daily INTEGER DEFAULT 0,
  active_users_weekly INTEGER DEFAULT 0,
  active_users_monthly INTEGER DEFAULT 0,
  new_signups INTEGER DEFAULT 0,
  
  -- Community Metrics
  total_communities INTEGER DEFAULT 0,
  active_communities INTEGER DEFAULT 0,
  new_communities INTEGER DEFAULT 0,
  
  -- Feature Usage
  items_created INTEGER DEFAULT 0,
  borrow_requests INTEGER DEFAULT 0,
  bookings_created INTEGER DEFAULT 0,
  news_posts INTEGER DEFAULT 0,
  
  -- Revenue (for super admin)
  mrr_cents INTEGER DEFAULT 0,
  new_subscriptions INTEGER DEFAULT 0,
  churned_subscriptions INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(date)
);

-- Community Analytics
CREATE TABLE community_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  community_id UUID REFERENCES communities NOT NULL,
  date DATE NOT NULL,
  
  -- Member Metrics
  total_members INTEGER DEFAULT 0,
  active_members INTEGER DEFAULT 0,
  new_members INTEGER DEFAULT 0,
  
  -- Feature Usage
  items_listed INTEGER DEFAULT 0,
  borrow_requests INTEGER DEFAULT 0,
  bookings_made INTEGER DEFAULT 0,
  news_posts INTEGER DEFAULT 0,
  comments_posted INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(community_id, date)
);

-- Data Export Requests (GDPR)
CREATE TABLE data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
  
  -- Export Details
  export_format TEXT DEFAULT 'json' CHECK (export_format IN ('json', 'csv')),
  download_url TEXT,
  expires_at TIMESTAMPTZ,
  
  -- Processing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security Policies

```sql
-- Enable RLS on all tables
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrow_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_reports ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- COMMUNITY POLICIES
-- =====================================================

-- Members can view their communities
CREATE POLICY "members_view_communities" ON communities
  FOR SELECT USING (
    id IN (
      SELECT community_id FROM community_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Only admins can update their communities
CREATE POLICY "admins_update_communities" ON communities
  FOR UPDATE USING (
    id IN (
      SELECT community_id FROM community_members
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    )
  );

-- Platform admins can view all communities
CREATE POLICY "platform_admins_view_all" ON communities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND platform_role IN ('admin', 'superadmin')
    )
  );

-- =====================================================
-- MEMBER POLICIES
-- =====================================================

-- Members can view other members in their communities
CREATE POLICY "members_view_members" ON community_members
  FOR SELECT USING (
    community_id IN (
      SELECT community_id FROM community_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Members can update their own profile
CREATE POLICY "members_update_own" ON community_members
  FOR UPDATE USING (user_id = auth.uid());

-- Admins can update any member in their community
CREATE POLICY "admins_update_members" ON community_members
  FOR UPDATE USING (
    community_id IN (
      SELECT community_id FROM community_members
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    )
  );

-- =====================================================
-- AUDIT LOG POLICIES
-- =====================================================

-- Community admins can view their community's audit logs
CREATE POLICY "admins_view_audit_logs" ON audit_logs
  FOR SELECT USING (
    community_id IN (
      SELECT community_id FROM community_members
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND platform_role IN ('admin', 'superadmin')
    )
  );

-- Only system can insert audit logs
CREATE POLICY "system_insert_audit_logs" ON audit_logs
  FOR INSERT WITH CHECK (TRUE);  -- Controlled via service role

-- =====================================================
-- USER PROFILE POLICIES
-- =====================================================

-- Users can view and update their own profile
CREATE POLICY "users_own_profile" ON user_profiles
  FOR ALL USING (id = auth.uid());

-- Platform admins can view all profiles
CREATE POLICY "platform_admins_profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND platform_role IN ('admin', 'superadmin')
    )
  );

-- =====================================================
-- SESSION POLICIES
-- =====================================================

-- Users can view and revoke their own sessions
CREATE POLICY "users_own_sessions" ON user_sessions
  FOR ALL USING (user_id = auth.uid());
```

---

## API Endpoints

### Authentication & Security

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/callback` | OAuth callback |
| `POST` | `/api/auth/magic-link` | Send magic link |
| `GET` | `/api/auth/2fa/setup` | Get 2FA setup QR code |
| `POST` | `/api/auth/2fa/verify` | Verify and enable 2FA |
| `POST` | `/api/auth/2fa/disable` | Disable 2FA |
| `GET` | `/api/auth/sessions` | List active sessions |
| `DELETE` | `/api/auth/sessions/:id` | Revoke session |

### Admin - Platform (Super Admin)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/dashboard` | Platform analytics |
| `GET` | `/api/admin/communities` | List all communities |
| `PUT` | `/api/admin/communities/:id` | Update/suspend community |
| `GET` | `/api/admin/users` | List all users |
| `PUT` | `/api/admin/users/:id` | Update user status/role |
| `GET` | `/api/admin/audit-logs` | Platform audit logs |

### Admin - Community

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/communities/:id/admin/dashboard` | Community analytics |
| `GET` | `/api/communities/:id/admin/members` | Member management |
| `PUT` | `/api/communities/:id/admin/members/:memberId` | Update/suspend member |
| `GET` | `/api/communities/:id/admin/audit-logs` | Community audit logs |
| `GET` | `/api/communities/:id/admin/reports` | Moderation reports |
| `PUT` | `/api/communities/:id/admin/reports/:id` | Resolve report |
| `GET` | `/api/communities/:id/admin/settings` | Community settings |
| `PUT` | `/api/communities/:id/admin/settings` | Update settings |

### Communities

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/communities` | List user's communities |
| `POST` | `/api/communities` | Create community |
| `GET` | `/api/communities/:id` | Get community details |
| `PUT` | `/api/communities/:id` | Update community |
| `POST` | `/api/communities/:id/join` | Join via invite code |
| `GET` | `/api/communities/:id/members` | List members |
| `POST` | `/api/communities/:id/invite` | Generate invite link |

### Member Directory

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/members` | List members (with skills filter) |
| `GET` | `/api/members/:id` | Get member profile |
| `PUT` | `/api/members/:id` | Update own profile |
| `GET` | `/api/skills` | List skill categories |

### Items / Lending

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/items` | List available items |
| `POST` | `/api/items` | Add item to lend |
| `GET` | `/api/items/:id` | Get item details |
| `PUT` | `/api/items/:id` | Update item |
| `DELETE` | `/api/items/:id` | Remove item |
| `POST` | `/api/items/:id/request` | Request to borrow |
| `POST` | `/api/items/:id/flag` | Flag item |
| `PUT` | `/api/borrow-requests/:id` | Approve/decline request |
| `POST` | `/api/borrow-requests/:id/return` | Mark as returned |

### Resources / Calendar

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/resources` | List bookable resources |
| `POST` | `/api/resources` | Add resource (admin) |
| `GET` | `/api/resources/:id` | Get resource details |
| `GET` | `/api/resources/:id/availability` | Get availability slots |
| `GET` | `/api/bookings` | List bookings (calendar) |
| `POST` | `/api/bookings` | Create booking |
| `DELETE` | `/api/bookings/:id` | Cancel booking |

### News

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/news` | List news/announcements |
| `POST` | `/api/news` | Create news (admin/mod) |
| `GET` | `/api/news/:id` | Get news detail |
| `POST` | `/api/news/:id/comments` | Add comment |
| `POST` | `/api/news/:id/flag` | Flag news |

### Notifications

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/notifications` | List notifications |
| `PUT` | `/api/notifications/:id/read` | Mark as read |
| `PUT` | `/api/notifications/read-all` | Mark all as read |

### User Account

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/user/profile` | Get own profile |
| `PUT` | `/api/user/profile` | Update profile |
| `POST` | `/api/user/export` | Request data export (GDPR) |
| `DELETE` | `/api/user/account` | Delete account |

---

## Security Checklist

### Authentication & Access Control

- [ ] Supabase Auth with email confirmation
- [ ] Magic link login option
- [ ] Google OAuth integration
- [ ] TOTP-based 2FA
- [ ] Session management with device tracking
- [ ] Role-based access control (RBAC)
- [ ] RLS policies on all tables

### Input Validation & Sanitization

- [ ] Zod schemas for all API inputs
- [ ] Server-side validation (never trust client)
- [ ] HTML sanitization for rich text
- [ ] File upload validation (type, size)
- [ ] SQL injection prevention (parameterized queries via Supabase)

### Rate Limiting & Abuse Prevention

- [ ] API rate limiting (Upstash Redis)
- [ ] Login attempt limiting (5 attempts/15 min)
- [ ] Invite code rate limiting
- [ ] File upload size limits

### Data Protection

- [ ] GDPR compliance
- [ ] Data minimization
- [ ] User data export (right to portability)
- [ ] Account deletion (right to erasure)
- [ ] Encrypted secrets (2FA, recovery codes)
- [ ] Secure cookie settings (httpOnly, secure, sameSite)

### Audit & Monitoring

- [ ] Comprehensive audit logging
- [ ] Security event alerts
- [ ] Failed login monitoring
- [ ] Admin action logging

### Headers & Transport

- [ ] HTTPS only
- [ ] Strict-Transport-Security
- [ ] Content-Security-Policy
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY
- [ ] Referrer-Policy: strict-origin-when-cross-origin

---

## MVP Scope v2

### Included ✅

- [x] Community creation and settings
- [x] Member invitation via link
- [x] Member directory with profiles
- [x] Skills listing and search
- [x] Item lending library
- [x] Borrow request workflow
- [x] Shared resource calendar
- [x] Resource booking system
- [x] News/announcement board
- [x] Basic notifications (in-app)
- [x] **Full EN/DE localization**
- [x] **Two-factor authentication**
- [x] **Community admin dashboard**
- [x] **Member management (suspend/remove)**
- [x] **Audit logging**
- [x] **Platform super admin dashboard**
- [x] **Content flagging/moderation**
- [x] **Apple-inspired design system**

### Excluded ❌

- [ ] Direct messaging / chat
- [ ] Events with RSVP
- [ ] Polls and voting
- [ ] Document archive
- [ ] Expense splitting
- [ ] Maintenance requests
- [ ] Time banking credits
- [ ] Marketplace

---

## Development Timeline

```
Week 1-2   ████████░░░░░░░░░░  Auth, 2FA, Community CRUD, Member Profiles, i18n
Week 3-4   ████████████░░░░░░  Skill Directory, Item Lending, Borrow Workflow
Week 5-6   ████████████████░░  Calendar, Resource Booking, Conflict Detection
Week 7-8   ██████████████████  News Board, Notifications, Moderation
Week 9-10  ██████████████████  Admin Dashboards, Analytics, Security Hardening
```

| Phase | Tasks | Deliverables |
|-------|-------|--------------|
| **Week 1-2** | Auth, 2FA, Community, Members, i18n | Secure user management |
| **Week 3-4** | Skills, Items, Borrowing | Lending library works |
| **Week 5-6** | Calendar, Resources, Booking | Booking system complete |
| **Week 7-8** | News, Notifications, Moderation | Community engagement |
| **Week 9-10** | Admin dashboards, Analytics, Polish | Production-ready |

---

## Pricing Model

| Plan | Price | Features |
|------|-------|----------|
| **Free** | €0 | 1 Community, 10 Members, 10 Items, 3 Resources |
| **Starter** | €9/month | 1 Community, 30 Members, Unlimited Items, 10 Resources, **2FA** |
| **Community** | €29/month | 1 Community, 100 Members, Unlimited Everything, Custom Branding, **Admin Dashboard** |
| **Pro** | €79/month | 5 Communities, Unlimited Members, Priority Support, **Analytics API**, **Data Export** |

---

## Success Metrics

### North Star Metric
**Weekly Active Communities** (communities with >3 members active per week)

### Supporting Metrics

| Metric | Target (Month 3) |
|--------|------------------|
| Communities Created | 100 |
| Active Members | 500 |
| Items Listed | 300 |
| Bookings Made | 200 |
| News Posts | 150 |
| 2FA Adoption | 20% |
| Paid Conversion | 5% |
| MRR | €500 |
| NPS | >40 |

---

## Next Steps

1. **Set up Supabase project** with multi-tenant schema
2. **Configure RLS policies** for all tables
3. **Implement authentication** with 2FA support
4. **Build admin dashboard** infrastructure
5. **Apply design system** to all components
6. **Set up audit logging** Edge Functions

---

*Created: January 2026 | Version: 2.0*
