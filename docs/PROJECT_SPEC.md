# ComeOnUnity v2.0 - Project Initialization Prompt

> **Use with claude-code or AI coding assistants. Reference `06_ComeOnUnity_EN_v2.md` for business logic, security requirements, and design system.**

---

## Project Overview

Build **ComeOnUnity v2.0** - an enterprise-grade platform for neighborhood and house communities featuring member directories, skill sharing, item lending, resource booking, community news, **comprehensive admin tools**, and **Apple-inspired design**. This prompt covers the complete implementation including security hardening and admin dashboards.

**Tech Stack (Streamlined):**
- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS · shadcn/ui
- Supabase (Auth, Database, Storage, Realtime)
- Zod (validation) · react-hook-form
- FullCalendar · next-intl (EN/DE)
- Upstash Redis (rate limiting)
- Resend (email) · Stripe (payments)

**Key Components:** Multi-Tenant Architecture · 2FA Authentication · Admin Dashboards · Audit Logging · Apple Design System

---

## Phase 1: Project Initialization

### 1.1 Create Next.js Project

```bash
npx create-next-app@latest comeonunity --typescript --tailwind --eslint --app --import-alias "@/*"
cd comeonunity
```

### 1.2 Install Dependencies (Minimal Set)

```bash
# Core - Supabase
npm install @supabase/supabase-js @supabase/ssr

# UI - shadcn/ui (Radix primitives)
npm install @radix-ui/react-slot @radix-ui/react-select @radix-ui/react-dialog \
  @radix-ui/react-tabs @radix-ui/react-avatar @radix-ui/react-dropdown-menu \
  @radix-ui/react-popover @radix-ui/react-tooltip @radix-ui/react-switch \
  class-variance-authority clsx tailwind-merge lucide-react

# Forms & Validation
npm install zod react-hook-form @hookform/resolvers

# Calendar
npm install @fullcalendar/core @fullcalendar/react @fullcalendar/daygrid \
  @fullcalendar/timegrid @fullcalendar/interaction

# i18n
npm install next-intl

# Date handling
npm install date-fns

# Security - 2FA
npm install otplib qrcode
npm install -D @types/qrcode

# Rate Limiting
npm install @upstash/ratelimit @upstash/redis

# Email
npm install resend

# ID Generation
npm install nanoid

# shadcn/ui setup
npx shadcn@latest init
npx shadcn@latest add button input label card form toast select dialog badge \
  tabs table textarea avatar dropdown-menu separator sheet calendar popover \
  command switch tooltip alert sonner
```

### 1.3 Environment Variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Upstash Redis (Rate Limiting)
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

# Email
RESEND_API_KEY=re_xxx

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=ComeOnUnity

# Security
ENCRYPTION_KEY=your_32_byte_hex_key
```

**⚠️ CRITICAL:** Never commit `.env.local`. Add to `.gitignore`.

### 1.4 Next.js Configuration

**File:** `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
```

---

## Phase 2: Directory Structure

```
src/
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Browser client
│   │   ├── server.ts              # Server client
│   │   └── admin.ts               # Service role client
│   ├── security/
│   │   ├── rate-limit.ts          # Rate limiting
│   │   ├── totp.ts                # 2FA helpers
│   │   ├── audit.ts               # Audit logging
│   │   └── encryption.ts          # Secret encryption
│   ├── validations/
│   │   ├── auth.ts                # Auth schemas
│   │   ├── community.ts           # Community schemas
│   │   ├── member.ts              # Member schemas
│   │   ├── item.ts                # Item schemas
│   │   └── booking.ts             # Booking schemas
│   └── utils.ts
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx               # Landing page
│   │   └── layout.tsx
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   ├── verify-2fa/page.tsx    # 2FA verification
│   │   └── auth/callback/route.ts
│   ├── (app)/
│   │   ├── layout.tsx
│   │   ├── page.tsx               # Dashboard / community selector
│   │   ├── settings/
│   │   │   ├── page.tsx           # Account settings
│   │   │   ├── security/page.tsx  # 2FA, sessions
│   │   │   └── export/page.tsx    # GDPR export
│   │   ├── communities/
│   │   │   ├── new/page.tsx
│   │   │   └── join/page.tsx
│   │   └── c/[communityId]/
│   │       ├── layout.tsx
│   │       ├── page.tsx           # Community dashboard
│   │       ├── members/
│   │       ├── items/
│   │       ├── calendar/
│   │       ├── resources/
│   │       ├── news/
│   │       ├── settings/          # Community settings
│   │       └── admin/             # Community admin area
│   │           ├── page.tsx       # Admin dashboard
│   │           ├── members/page.tsx
│   │           ├── reports/page.tsx
│   │           └── audit-log/page.tsx
│   ├── (admin)/                   # Platform admin (super admin)
│   │   ├── layout.tsx
│   │   ├── page.tsx               # Platform dashboard
│   │   ├── communities/page.tsx
│   │   ├── users/page.tsx
│   │   └── audit-log/page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   ├── callback/route.ts
│   │   │   ├── 2fa/
│   │   │   │   ├── setup/route.ts
│   │   │   │   ├── verify/route.ts
│   │   │   │   └── disable/route.ts
│   │   │   └── sessions/route.ts
│   │   ├── admin/                 # Platform admin APIs
│   │   │   ├── dashboard/route.ts
│   │   │   ├── communities/route.ts
│   │   │   ├── users/route.ts
│   │   │   └── audit-logs/route.ts
│   │   ├── communities/
│   │   │   └── [id]/
│   │   │       ├── admin/         # Community admin APIs
│   │   │       │   ├── dashboard/route.ts
│   │   │       │   ├── members/route.ts
│   │   │       │   ├── reports/route.ts
│   │   │       │   └── audit-logs/route.ts
│   │   │       └── ...
│   │   └── ...
│   └── layout.tsx
├── components/
│   ├── ui/                        # shadcn components
│   ├── design-system/             # Apple-inspired components
│   │   ├── card-group.tsx
│   │   ├── list-row.tsx
│   │   ├── section-header.tsx
│   │   └── stat-card.tsx
│   ├── auth/
│   │   ├── login-form.tsx
│   │   ├── signup-form.tsx
│   │   ├── two-factor-setup.tsx
│   │   ├── two-factor-verify.tsx
│   │   ├── session-list.tsx
│   │   └── logout-button.tsx
│   ├── admin/
│   │   ├── platform/
│   │   │   ├── dashboard-stats.tsx
│   │   │   ├── community-table.tsx
│   │   │   ├── user-table.tsx
│   │   │   └── audit-log-table.tsx
│   │   └── community/
│   │       ├── admin-nav.tsx
│   │       ├── member-management.tsx
│   │       ├── moderation-queue.tsx
│   │       └── analytics-cards.tsx
│   ├── community/
│   ├── members/
│   ├── items/
│   ├── calendar/
│   └── news/
├── hooks/
│   ├── use-community.ts
│   ├── use-member.ts
│   ├── use-admin.ts               # Admin context
│   └── use-notifications.ts
├── middleware.ts
└── locales/
    ├── en/
    │   ├── common.json
    │   ├── auth.json
    │   ├── admin.json
    │   └── ...
    └── de/
        └── ...
```

---

## Phase 3: Design System Implementation

### 3.1 Tailwind Configuration

**File:** `tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Apple-inspired font stack
      fontFamily: {
        sans: [
          'SF Pro Display',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: ['SF Mono', 'ui-monospace', 'Cascadia Code', 'monospace'],
      },
      // Apple type scale
      fontSize: {
        'xs': ['0.6875rem', { lineHeight: '1.2' }],        // 11px
        'sm': ['0.8125rem', { lineHeight: '1.4' }],        // 13px
        'base': ['0.9375rem', { lineHeight: '1.47' }],     // 15px
        'lg': ['1.0625rem', { lineHeight: '1.47' }],       // 17px
        'xl': ['1.25rem', { lineHeight: '1.3' }],          // 20px
        '2xl': ['1.5rem', { lineHeight: '1.25' }],         // 24px
        '3xl': ['1.75rem', { lineHeight: '1.2' }],         // 28px
        '4xl': ['2.125rem', { lineHeight: '1.15' }],       // 34px - Large Title
      },
      // Apple colors
      colors: {
        // System colors
        blue: {
          DEFAULT: '#007AFF',
          dark: '#0A84FF',
        },
        green: {
          DEFAULT: '#34C759',
          dark: '#30D158',
        },
        orange: {
          DEFAULT: '#FF9500',
          dark: '#FF9F0A',
        },
        red: {
          DEFAULT: '#FF3B30',
          dark: '#FF453A',
        },
        purple: {
          DEFAULT: '#AF52DE',
          dark: '#BF5AF2',
        },
        teal: {
          DEFAULT: '#5AC8FA',
          dark: '#64D2FF',
        },
        // Semantic
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      // Apple-style border radius (continuous corners)
      borderRadius: {
        'sm': '6px',
        'md': '10px',
        'lg': '14px',
        'xl': '20px',
        '2xl': '28px',
      },
      // Apple-style shadows
      boxShadow: {
        'apple-sm': '0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.08)',
        'apple-md': '0 2px 4px rgba(0, 0, 0, 0.04), 0 4px 8px rgba(0, 0, 0, 0.08)',
        'apple-lg': '0 4px 8px rgba(0, 0, 0, 0.04), 0 8px 24px rgba(0, 0, 0, 0.12)',
        'apple-xl': '0 8px 16px rgba(0, 0, 0, 0.08), 0 16px 48px rgba(0, 0, 0, 0.16)',
      },
      // Animation timing
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        'apple-spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      // Animation keyframes
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
```

### 3.2 CSS Variables

**File:** `src/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Light mode - Apple-inspired */
    --background: 0 0% 100%;
    --foreground: 0 0% 0%;
    
    --card: 0 0% 100%;
    --card-foreground: 0 0% 0%;
    
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 0%;
    
    --primary: 211 100% 50%;
    --primary-foreground: 0 0% 100%;
    
    --secondary: 240 5% 96%;
    --secondary-foreground: 240 6% 10%;
    
    --muted: 240 5% 96%;
    --muted-foreground: 240 4% 46%;
    
    --accent: 240 5% 96%;
    --accent-foreground: 240 6% 10%;
    
    --destructive: 4 90% 58%;
    --destructive-foreground: 0 0% 100%;
    
    --border: 240 6% 90%;
    --input: 240 6% 90%;
    --ring: 211 100% 50%;
    
    --radius: 10px;
  }

  .dark {
    --background: 0 0% 0%;
    --foreground: 0 0% 100%;
    
    --card: 240 6% 10%;
    --card-foreground: 0 0% 100%;
    
    --popover: 240 6% 10%;
    --popover-foreground: 0 0% 100%;
    
    --primary: 211 100% 50%;
    --primary-foreground: 0 0% 100%;
    
    --secondary: 240 4% 16%;
    --secondary-foreground: 0 0% 100%;
    
    --muted: 240 4% 16%;
    --muted-foreground: 240 5% 65%;
    
    --accent: 240 4% 16%;
    --accent-foreground: 0 0% 100%;
    
    --destructive: 4 90% 58%;
    --destructive-foreground: 0 0% 100%;
    
    --border: 240 4% 16%;
    --input: 240 4% 16%;
    --ring: 211 100% 50%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}

/* Apple-style focus ring */
@layer utilities {
  .focus-ring {
    @apply focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2;
  }
  
  /* Apple-style button press */
  .press-effect {
    @apply transition-transform duration-100 active:scale-[0.98];
  }
  
  /* Reduce motion */
  @media (prefers-reduced-motion: reduce) {
    .animate-fade-in,
    .animate-scale-in,
    .animate-slide-up {
      animation: none !important;
    }
  }
}
```

### 3.3 Design System Components

**File:** `src/components/design-system/stat-card.tsx`

```typescript
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    trend: 'up' | 'down' | 'neutral'
  }
  icon?: React.ReactNode
  className?: string
}

export function StatCard({ title, value, change, icon, className }: StatCardProps) {
  return (
    <Card className={cn(
      'p-5 transition-shadow hover:shadow-apple-md',
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
          {change && (
            <p className={cn(
              'text-sm font-medium',
              change.trend === 'up' && 'text-green',
              change.trend === 'down' && 'text-red',
              change.trend === 'neutral' && 'text-muted-foreground'
            )}>
              {change.trend === 'up' && '↑'}
              {change.trend === 'down' && '↓'}
              {' '}{Math.abs(change.value)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="rounded-lg bg-primary/10 p-3 text-primary">
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}
```

**File:** `src/components/design-system/list-row.tsx`

```typescript
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ListRowProps {
  icon?: React.ReactNode
  title: string
  subtitle?: string
  value?: string | React.ReactNode
  showChevron?: boolean
  onClick?: () => void
  destructive?: boolean
  className?: string
}

export function ListRow({
  icon,
  title,
  subtitle,
  value,
  showChevron = true,
  onClick,
  destructive,
  className,
}: ListRowProps) {
  const Component = onClick ? 'button' : 'div'
  
  return (
    <Component
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3',
        'bg-card border-b border-border last:border-b-0',
        'transition-colors',
        onClick && 'hover:bg-muted/50 cursor-pointer press-effect',
        className
      )}
    >
      {icon && (
        <div className={cn(
          'flex h-8 w-8 items-center justify-center rounded-md',
          destructive ? 'bg-red/10 text-red' : 'bg-primary/10 text-primary'
        )}>
          {icon}
        </div>
      )}
      <div className="flex-1 text-left">
        <p className={cn(
          'font-medium',
          destructive && 'text-red'
        )}>
          {title}
        </p>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {value && (
        <span className="text-sm text-muted-foreground">{value}</span>
      )}
      {showChevron && onClick && (
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      )}
    </Component>
  )
}
```

**File:** `src/components/design-system/section-header.tsx`

```typescript
import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  title: string
  action?: React.ReactNode
  className?: string
}

export function SectionHeader({ title, action, className }: SectionHeaderProps) {
  return (
    <div className={cn(
      'flex items-center justify-between px-4 py-2',
      className
    )}>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {action}
    </div>
  )
}
```

---

## Phase 4: Security Implementation

### 4.1 Rate Limiting

**File:** `src/lib/security/rate-limit.ts`

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Different rate limiters for different purposes
export const rateLimiters = {
  // Standard API: 100 requests per minute
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
    prefix: 'rl:api',
  }),
  
  // Auth: 5 attempts per 15 minutes
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    analytics: true,
    prefix: 'rl:auth',
  }),
  
  // Strict: 3 attempts per hour (for sensitive operations)
  strict: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    analytics: true,
    prefix: 'rl:strict',
  }),
  
  // Invite codes: 10 per day
  invite: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '24 h'),
    analytics: true,
    prefix: 'rl:invite',
  }),
}

export async function checkRateLimit(
  limiter: keyof typeof rateLimiters,
  identifier: string
): Promise<{ success: boolean; reset: number }> {
  const result = await rateLimiters[limiter].limit(identifier)
  return {
    success: result.success,
    reset: result.reset,
  }
}
```

### 4.2 Two-Factor Authentication

**File:** `src/lib/security/totp.ts`

```typescript
import { authenticator } from 'otplib'
import QRCode from 'qrcode'

// Configure TOTP
authenticator.options = {
  window: 1, // Allow 1 step before/after for clock drift
}

export function generateTOTPSecret(): string {
  return authenticator.generateSecret()
}

export function verifyTOTP(token: string, secret: string): boolean {
  return authenticator.verify({ token, secret })
}

export async function generateTOTPUri(
  secret: string,
  email: string
): Promise<{ uri: string; qrCode: string }> {
  const uri = authenticator.keyuri(
    email,
    process.env.NEXT_PUBLIC_APP_NAME || 'ComeOnUnity',
    secret
  )
  
  const qrCode = await QRCode.toDataURL(uri)
  
  return { uri, qrCode }
}

export function generateRecoveryCodes(count = 10): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    // Generate 8-character recovery codes
    const code = Array.from({ length: 8 }, () =>
      'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]
    ).join('')
    codes.push(code)
  }
  return codes
}
```

### 4.3 Encryption Helpers

**File:** `src/lib/security/encryption.ts`

```typescript
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key || key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
  }
  return Buffer.from(key, 'hex')
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':')
  
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv)
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}
```

### 4.4 Audit Logging

**File:** `src/lib/security/audit.ts`

```typescript
import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'

export type AuditAction =
  | 'auth.login'
  | 'auth.logout'
  | 'auth.2fa_enabled'
  | 'auth.2fa_disabled'
  | 'member.invite'
  | 'member.join'
  | 'member.suspend'
  | 'member.remove'
  | 'member.role_change'
  | 'item.create'
  | 'item.update'
  | 'item.delete'
  | 'item.flag'
  | 'booking.create'
  | 'booking.cancel'
  | 'news.create'
  | 'news.delete'
  | 'news.flag'
  | 'community.create'
  | 'community.update'
  | 'community.suspend'
  | 'admin.user_suspend'
  | 'admin.user_delete'
  | 'data.export_request'
  | 'data.account_delete'

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical'

interface AuditLogParams {
  userId?: string
  userEmail?: string
  communityId?: string
  action: AuditAction
  resourceType: string
  resourceId?: string
  details?: Record<string, any>
  previousState?: Record<string, any>
  newState?: Record<string, any>
  severity?: AuditSeverity
}

export async function createAuditLog(params: AuditLogParams) {
  const supabase = createAdminClient()
  const headersList = await headers()
  
  const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || 
                    headersList.get('x-real-ip') || 
                    'unknown'
  const userAgent = headersList.get('user-agent') || 'unknown'
  
  const { error } = await supabase.from('audit_logs').insert({
    user_id: params.userId,
    user_email: params.userEmail,
    ip_address: ipAddress,
    user_agent: userAgent,
    community_id: params.communityId,
    action: params.action,
    resource_type: params.resourceType,
    resource_id: params.resourceId,
    details: params.details,
    previous_state: params.previousState,
    new_state: params.newState,
    severity: params.severity || 'info',
  })
  
  if (error) {
    console.error('Failed to create audit log:', error)
  }
}
```

### 4.5 Validation Schemas

**File:** `src/lib/validations/auth.ts`

```typescript
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  name: z.string().min(2, 'Name must be at least 2 characters'),
})

export const totpVerifySchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must be numeric'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type TOTPVerifyInput = z.infer<typeof totpVerifySchema>
```

**File:** `src/lib/validations/community.ts`

```typescript
import { z } from 'zod'

export const createCommunitySchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  type: z.enum(['weg', 'house', 'neighborhood', 'cohousing', 'interest']),
  description: z.string().max(500).optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
})

export const updateCommunitySchema = createCommunitySchema.partial()

export const inviteSchema = z.object({
  maxUses: z.number().min(1).max(100).default(10),
  expiresInDays: z.number().min(1).max(30).default(7),
})

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>
export type UpdateCommunityInput = z.infer<typeof updateCommunitySchema>
export type InviteInput = z.infer<typeof inviteSchema>
```

---

## Phase 5: Supabase Clients

### 5.1 Browser Client

**File:** `src/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### 5.2 Server Client

**File:** `src/lib/supabase/server.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

### 5.3 Admin Client (Service Role)

**File:** `src/lib/supabase/admin.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

// Use this only for server-side admin operations
// NEVER expose to client
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
```

---

## Phase 6: Middleware

**File:** `src/middleware.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that require authentication
const protectedRoutes = ['/c/', '/communities', '/settings', '/admin']

// Routes that require platform admin role
const adminRoutes = ['/admin']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Check if route requires authentication
  const isProtected = protectedRoutes.some(route => path.startsWith(route))
  const isAdminRoute = adminRoutes.some(route => path.startsWith(route))

  // Redirect unauthenticated users
  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  // Check platform admin access
  if (isAdminRoute && user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('platform_role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'superadmin'].includes(profile.platform_role)) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // Redirect authenticated users from auth pages
  if (user && ['/login', '/signup'].includes(path)) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Check if user needs 2FA verification
  if (user && isProtected && !path.startsWith('/verify-2fa')) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('totp_enabled')
      .eq('id', user.id)
      .single()

    // Check if 2FA is required but not verified this session
    // This would be tracked via a separate session flag
    // Implementation depends on your session management approach
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
```

---

## Phase 7: Authentication with 2FA

### 7.1 2FA Setup API

**File:** `src/app/api/auth/2fa/setup/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateTOTPSecret, generateTOTPUri, generateRecoveryCodes } from '@/lib/security/totp'
import { encrypt } from '@/lib/security/encryption'
import { checkRateLimit } from '@/lib/security/rate-limit'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit
  const { success } = await checkRateLimit('strict', `2fa_setup:${user.id}`)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // Check if already enabled
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('totp_enabled')
    .eq('id', user.id)
    .single()

  if (profile?.totp_enabled) {
    return NextResponse.json({ error: '2FA already enabled' }, { status: 400 })
  }

  // Generate new secret and QR code
  const secret = generateTOTPSecret()
  const { uri, qrCode } = await generateTOTPUri(secret, user.email!)

  // Store encrypted secret temporarily (will be confirmed on verify)
  const adminClient = createAdminClient()
  await adminClient
    .from('user_profiles')
    .upsert({
      id: user.id,
      totp_secret: encrypt(secret), // Store encrypted
    })

  return NextResponse.json({
    qrCode,
    uri,
    // Don't send secret to client - it's already stored encrypted
  })
}
```

### 7.2 2FA Verify API

**File:** `src/app/api/auth/2fa/verify/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyTOTP, generateRecoveryCodes } from '@/lib/security/totp'
import { encrypt, decrypt } from '@/lib/security/encryption'
import { createAuditLog } from '@/lib/security/audit'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { totpVerifySchema } from '@/lib/validations/auth'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit
  const { success } = await checkRateLimit('auth', `2fa_verify:${user.id}`)
  if (!success) {
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 })
  }

  const body = await request.json()
  const result = totpVerifySchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json({ error: result.error.errors }, { status: 400 })
  }

  const { code } = result.data

  // Get stored secret
  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('totp_secret, totp_enabled')
    .eq('id', user.id)
    .single()

  if (!profile?.totp_secret) {
    return NextResponse.json({ error: 'Setup required' }, { status: 400 })
  }

  // Decrypt and verify
  const secret = decrypt(profile.totp_secret)
  const isValid = verifyTOTP(code, secret)

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  }

  // If enabling for the first time, generate recovery codes
  if (!profile.totp_enabled) {
    const recoveryCodes = generateRecoveryCodes()
    const encryptedCodes = recoveryCodes.map(code => encrypt(code))

    await adminClient
      .from('user_profiles')
      .update({
        totp_enabled: true,
        recovery_codes: encryptedCodes,
      })
      .eq('id', user.id)

    // Audit log
    await createAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: 'auth.2fa_enabled',
      resourceType: 'user',
      resourceId: user.id,
      severity: 'info',
    })

    return NextResponse.json({
      success: true,
      recoveryCodes, // Show once only
    })
  }

  return NextResponse.json({ success: true })
}
```

### 7.3 Two-Factor Setup Component

**File:** `src/components/auth/two-factor-setup.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

export function TwoFactorSetup() {
  const router = useRouter()
  const [step, setStep] = useState<'init' | 'qr' | 'verify' | 'recovery'>('init')
  const [qrCode, setQrCode] = useState<string>('')
  const [code, setCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const startSetup = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/2fa/setup')
      if (!res.ok) throw new Error('Failed to start setup')
      const data = await res.json()
      setQrCode(data.qrCode)
      setStep('qr')
    } catch (error) {
      toast.error('Failed to start 2FA setup')
    } finally {
      setLoading(false)
    }
  }

  const verifyCode = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Invalid code')
      }
      const data = await res.json()
      if (data.recoveryCodes) {
        setRecoveryCodes(data.recoveryCodes)
        setStep('recovery')
      } else {
        toast.success('2FA verified successfully')
        router.refresh()
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const copyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Recovery codes copied')
  }

  if (step === 'init') {
    return (
      <Card className="p-6 max-w-md mx-auto">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold">Enable Two-Factor Authentication</h2>
          <p className="text-muted-foreground">
            Add an extra layer of security to your account using an authenticator app.
          </p>
          <Button onClick={startSetup} disabled={loading} className="w-full">
            {loading ? 'Setting up...' : 'Get Started'}
          </Button>
        </div>
      </Card>
    )
  }

  if (step === 'qr') {
    return (
      <Card className="p-6 max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">Scan QR Code</h2>
          <p className="text-sm text-muted-foreground">
            Scan this code with your authenticator app (Google Authenticator, Authy, etc.)
          </p>
        </div>
        
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCode} alt="2FA QR Code" className="rounded-lg" />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Enter verification code</label>
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="text-center text-2xl tracking-widest"
          />
        </div>
        
        <Button
          onClick={verifyCode}
          disabled={code.length !== 6 || loading}
          className="w-full"
        >
          {loading ? 'Verifying...' : 'Verify & Enable'}
        </Button>
      </Card>
    )
  }

  if (step === 'recovery') {
    return (
      <Card className="p-6 max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">Save Recovery Codes</h2>
          <p className="text-sm text-muted-foreground">
            Save these codes in a safe place. You can use them to access your account if you lose your phone.
          </p>
        </div>
        
        <Alert>
          <AlertDescription>
            Each code can only be used once. Keep them secure!
          </AlertDescription>
        </Alert>
        
        <div className="grid grid-cols-2 gap-2 bg-muted p-4 rounded-lg font-mono text-sm">
          {recoveryCodes.map((code, i) => (
            <div key={i} className="text-center py-1">
              {code}
            </div>
          ))}
        </div>
        
        <Button onClick={copyRecoveryCodes} variant="outline" className="w-full">
          {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
          {copied ? 'Copied!' : 'Copy Codes'}
        </Button>
        
        <Button onClick={() => router.push('/settings/security')} className="w-full">
          Done
        </Button>
      </Card>
    )
  }

  return null
}
```

---

## Phase 8: Admin Dashboards

### 8.1 Community Admin Dashboard

**File:** `src/app/(app)/c/[communityId]/admin/page.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StatCard } from '@/components/design-system/stat-card'
import { SectionHeader } from '@/components/design-system/section-header'
import { Users, Package, Calendar, FileText, Flag, Activity } from 'lucide-react'

interface Props {
  params: { communityId: string }
}

export default async function CommunityAdminPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check admin role
  const { data: member } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', params.communityId)
    .eq('user_id', user.id)
    .single()

  if (!member || member.role !== 'admin') {
    redirect(`/c/${params.communityId}`)
  }

  // Fetch analytics
  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [
    { count: totalMembers },
    { count: activeMembers },
    { count: totalItems },
    { count: totalBookings },
    { count: pendingReports },
  ] = await Promise.all([
    supabase.from('community_members').select('*', { count: 'exact', head: true })
      .eq('community_id', params.communityId).eq('status', 'active'),
    supabase.from('community_members').select('*', { count: 'exact', head: true })
      .eq('community_id', params.communityId).gte('last_active_at', weekAgo),
    supabase.from('items').select('*', { count: 'exact', head: true })
      .eq('community_id', params.communityId),
    supabase.from('bookings').select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo),
    supabase.from('moderation_reports').select('*', { count: 'exact', head: true })
      .eq('community_id', params.communityId).eq('status', 'pending'),
  ])

  // Recent activity
  const { data: recentActivity } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('community_id', params.communityId)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Manage your community</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Members"
          value={totalMembers || 0}
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="Active This Week"
          value={activeMembers || 0}
          icon={<Activity className="w-5 h-5" />}
        />
        <StatCard
          title="Items Listed"
          value={totalItems || 0}
          icon={<Package className="w-5 h-5" />}
        />
        <StatCard
          title="Bookings (7d)"
          value={totalBookings || 0}
          icon={<Calendar className="w-5 h-5" />}
        />
      </div>

      {/* Pending Reports Alert */}
      {(pendingReports || 0) > 0 && (
        <div className="bg-orange/10 border border-orange/20 rounded-lg p-4 flex items-center gap-3">
          <Flag className="w-5 h-5 text-orange" />
          <div>
            <p className="font-medium text-orange">
              {pendingReports} pending moderation {pendingReports === 1 ? 'report' : 'reports'}
            </p>
            <p className="text-sm text-muted-foreground">
              Review flagged content in the moderation queue
            </p>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <SectionHeader title="Recent Activity" />
        <div className="bg-card rounded-lg border overflow-hidden">
          {recentActivity?.map((log) => (
            <div
              key={log.id}
              className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0"
            >
              <div className="w-2 h-2 rounded-full bg-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">{formatAction(log.action)}</p>
                <p className="text-xs text-muted-foreground">
                  {log.user_email} · {new Date(log.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
          {(!recentActivity || recentActivity.length === 0) && (
            <p className="p-4 text-center text-muted-foreground">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  )
}

function formatAction(action: string): string {
  const map: Record<string, string> = {
    'member.join': 'New member joined',
    'member.invite': 'Member invited',
    'member.suspend': 'Member suspended',
    'item.create': 'New item listed',
    'item.flag': 'Item flagged',
    'booking.create': 'New booking',
    'news.create': 'News posted',
  }
  return map[action] || action
}
```

### 8.2 Platform Admin Dashboard (Super Admin)

**File:** `src/app/(admin)/page.tsx`

```typescript
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { StatCard } from '@/components/design-system/stat-card'
import { SectionHeader } from '@/components/design-system/section-header'
import { Users, Building2, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react'

export default async function PlatformAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Verify platform admin role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('platform_role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'superadmin'].includes(profile.platform_role)) {
    redirect('/')
  }

  // Use admin client for platform-wide queries
  const adminClient = createAdminClient()

  const [
    { count: totalUsers },
    { count: totalCommunities },
    { count: activeCommunities },
    { count: paidSubscriptions },
  ] = await Promise.all([
    adminClient.from('user_profiles').select('*', { count: 'exact', head: true }),
    adminClient.from('communities').select('*', { count: 'exact', head: true }),
    adminClient.from('communities').select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    adminClient.from('communities').select('*', { count: 'exact', head: true })
      .neq('plan', 'free'),
  ])

  // Recent signups
  const { data: recentUsers } = await adminClient
    .from('user_profiles')
    .select('id, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  // Recent communities
  const { data: recentCommunities } = await adminClient
    .from('communities')
    .select('id, name, plan, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight">Platform Dashboard</h1>
        <p className="text-muted-foreground mt-1">ComeOnUnity administration</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={totalUsers || 0}
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="Communities"
          value={totalCommunities || 0}
          change={{ value: 12, trend: 'up' }}
          icon={<Building2 className="w-5 h-5" />}
        />
        <StatCard
          title="Active Communities"
          value={activeCommunities || 0}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          title="Paid Subscriptions"
          value={paidSubscriptions || 0}
          icon={<DollarSign className="w-5 h-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Users */}
        <div>
          <SectionHeader title="Recent Signups" />
          <div className="bg-card rounded-lg border">
            {recentUsers?.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between px-4 py-3 border-b last:border-b-0"
              >
                <span className="text-sm font-medium truncate">
                  {user.id.slice(0, 8)}...
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Communities */}
        <div>
          <SectionHeader title="Recent Communities" />
          <div className="bg-card rounded-lg border">
            {recentCommunities?.map((community) => (
              <div
                key={community.id}
                className="flex items-center justify-between px-4 py-3 border-b last:border-b-0"
              >
                <div>
                  <span className="text-sm font-medium">{community.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {community.plan}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(community.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

### 8.3 Member Management

**File:** `src/app/api/communities/[id]/admin/members/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/security/audit'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { z } from 'zod'

const updateMemberSchema = z.object({
  action: z.enum(['suspend', 'activate', 'remove', 'change_role']),
  role: z.enum(['admin', 'moderator', 'member']).optional(),
  reason: z.string().max(500).optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit
  const { success } = await checkRateLimit('api', `admin_member:${user.id}`)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // Verify admin role
  const { data: adminMember } = await supabase
    .from('community_members')
    .select('id, role')
    .eq('community_id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!adminMember || adminMember.role !== 'admin') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const body = await request.json()
  const { memberId, ...actionData } = body
  
  const result = updateMemberSchema.safeParse(actionData)
  if (!result.success) {
    return NextResponse.json({ error: result.error.errors }, { status: 400 })
  }

  const { action, role, reason } = result.data

  // Get target member
  const { data: targetMember } = await supabase
    .from('community_members')
    .select('*')
    .eq('id', memberId)
    .eq('community_id', params.id)
    .single()

  if (!targetMember) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  // Prevent self-modification for destructive actions
  if (targetMember.user_id === user.id && ['suspend', 'remove'].includes(action)) {
    return NextResponse.json({ error: 'Cannot modify your own account' }, { status: 400 })
  }

  let updateData: any = {}
  let auditAction: string = ''

  switch (action) {
    case 'suspend':
      updateData = {
        status: 'suspended',
        suspended_reason: reason,
        suspended_at: new Date().toISOString(),
        suspended_by: adminMember.id,
      }
      auditAction = 'member.suspend'
      break

    case 'activate':
      updateData = {
        status: 'active',
        suspended_reason: null,
        suspended_at: null,
        suspended_by: null,
      }
      auditAction = 'member.activate'
      break

    case 'remove':
      // Soft delete - change status
      updateData = { status: 'inactive' }
      auditAction = 'member.remove'
      break

    case 'change_role':
      if (!role) {
        return NextResponse.json({ error: 'Role required' }, { status: 400 })
      }
      updateData = { role }
      auditAction = 'member.role_change'
      break
  }

  const { error } = await supabase
    .from('community_members')
    .update(updateData)
    .eq('id', memberId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Audit log
  await createAuditLog({
    userId: user.id,
    userEmail: user.email,
    communityId: params.id,
    action: auditAction as any,
    resourceType: 'member',
    resourceId: memberId,
    previousState: {
      status: targetMember.status,
      role: targetMember.role,
    },
    newState: updateData,
    details: { reason },
  })

  return NextResponse.json({ success: true })
}
```

---

## Phase 9: Moderation System

### 9.1 Flag Content API

**File:** `src/app/api/items/[id]/flag/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/security/audit'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { z } from 'zod'

const flagSchema = z.object({
  reason: z.enum(['spam', 'harassment', 'inappropriate', 'dangerous', 'other']),
  description: z.string().max(500).optional(),
})

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit
  const { success } = await checkRateLimit('api', `flag:${user.id}`)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const body = await request.json()
  const result = flagSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json({ error: result.error.errors }, { status: 400 })
  }

  const { reason, description } = result.data

  // Get item and verify membership
  const { data: item } = await supabase
    .from('items')
    .select('*, community_id')
    .eq('id', params.id)
    .single()

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  const { data: member } = await supabase
    .from('community_members')
    .select('id')
    .eq('community_id', item.community_id)
    .eq('user_id', user.id)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Not a member' }, { status: 403 })
  }

  // Create moderation report
  const { error: reportError } = await supabase
    .from('moderation_reports')
    .insert({
      community_id: item.community_id,
      reporter_id: member.id,
      target_type: 'item',
      target_id: item.id,
      reason,
      description,
    })

  if (reportError) {
    return NextResponse.json({ error: reportError.message }, { status: 500 })
  }

  // Update item flagged status
  await supabase
    .from('items')
    .update({
      flagged: true,
      flagged_reason: reason,
      flagged_at: new Date().toISOString(),
      flagged_by: member.id,
    })
    .eq('id', params.id)

  // Audit log
  await createAuditLog({
    userId: user.id,
    userEmail: user.email,
    communityId: item.community_id,
    action: 'item.flag',
    resourceType: 'item',
    resourceId: params.id,
    details: { reason, description },
  })

  return NextResponse.json({ success: true })
}
```

---

## Phase 10: Error Troubleshooting Guide

### Common Issues

| Issue | Solution |
|-------|----------|
| HTTP 431 (Headers too large) | Clear browser cookies for localhost |
| Turbopack Panic | `rm -rf .next && npm run dev` |
| Auth callback loops | Verify callback only uses `code` param |
| RLS blocking data | Check user membership, test policies in SQL editor |
| 2FA not verifying | Check clock sync, verify secret encryption |
| Rate limit blocking | Increase limits or check Redis connection |
| Audit log not writing | Verify service role key, check insert permissions |

### Multi-Tenant Security Testing

1. Create two test communities
2. Create test user in each
3. Verify no cross-community data leakage via RLS
4. Test admin actions don't affect other communities
5. Verify audit logs are properly scoped

---

## Critical Implementation Rules

### ✅ DO

1. Use Zod for ALL input validation
2. Implement rate limiting on sensitive endpoints
3. Use service role only for admin operations
4. Always include `community_id` in queries
5. Encrypt sensitive data (2FA secrets, recovery codes)
6. Log all admin actions to audit trail
7. Test RLS policies thoroughly

### ❌ DO NOT

1. Trust client-side data
2. Skip rate limiting
3. Expose service role key to client
4. Store plain-text secrets
5. Skip audit logging for admin actions
6. Allow cross-community data access
7. Disable RLS for "convenience"

---

## Security Checklist

- [ ] RLS enabled on ALL tables
- [ ] Input validation with Zod on ALL endpoints
- [ ] Rate limiting on auth and admin endpoints
- [ ] 2FA secrets encrypted at rest
- [ ] Recovery codes encrypted at rest
- [ ] Audit logging for all admin actions
- [ ] Session management implemented
- [ ] CSRF protection (via SameSite cookies)
- [ ] Security headers configured
- [ ] Service role key never exposed to client

---

## Next Steps After This Prompt

1. Set up Supabase with complete schema
2. Configure RLS policies (copy from spec)
3. Implement auth flow with 2FA
4. Build admin dashboards
5. Apply design system to all components
6. Set up audit logging Edge Functions
7. Configure rate limiting with Upstash
8. Test security thoroughly

---

*Reference: `06_ComeOnUnity_EN_v2.md` for complete database schema, design system, and security requirements.*
