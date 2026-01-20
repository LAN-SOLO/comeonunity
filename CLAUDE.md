# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js 16 application with TypeScript, using the App Router architecture. Includes shadcn/ui component library (New York style) and Supabase integration for backend services.

## Development Commands

**Development server:**
```bash
npm run dev
```
Server runs on http://localhost:3000 with hot reload.

**Production build:**
```bash
npm run build
npm start
```

**Linting:**
```bash
npm run lint
```

## Architecture & Key Patterns

### Framework Stack
- **Next.js 16** with App Router (not Pages Router)
- **React 19** with Server Components by default
- **TypeScript** with strict mode enabled
- **Tailwind CSS v4** with custom theme system
- **Supabase** for authentication and database (@supabase/supabase-js, @supabase/ssr)

### Project Structure

```
app/                    # App Router directory
  layout.tsx           # Root layout with font setup
  page.tsx             # Home page (route: /)
  globals.css          # Tailwind v4 + CSS variables
components/
  ui/                  # shadcn components (managed by CLI)
lib/
  supabase/            # Supabase client utilities
    client.ts          # Browser client
    server.ts          # Server client
    middleware.ts      # Session management
  utils.ts             # cn() utility for className merging
proxy.ts               # Next.js proxy (session refresh, auth guards)
.env.local.example     # Environment variable template
```

### Path Aliases

Import using `@/` prefix (configured in tsconfig.json and components.json):
```typescript
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
```

Available aliases:
- `@/components` → components directory
- `@/lib` → lib directory
- `@/ui` → components/ui directory
- `@/hooks` → hooks directory

### shadcn/ui Configuration

**Style:** New York (components.json:3)
**Base color:** Neutral (components.json:9)
**Icon library:** lucide-react

**Installed components:**
- button, card, input, label
- dropdown-menu, sheet, dialog
- avatar, color-picker

**Adding new components:**
```bash
npx shadcn@latest add [component-name]
```

**Component customization:** Edit files in `components/ui/` directly. These files are owned by you after installation, not managed by shadcn.

### Styling System

**Tailwind v4 features:**
- CSS variables for theming (app/globals.css)
- Custom `@theme inline` block for design tokens
- Dark mode via `.dark` class on parent element
- Custom radius variables (--radius-sm through --radius-4xl)

**Using cn() utility:**
Merge Tailwind classes properly with conflict resolution:
```typescript
import { cn } from "@/lib/utils"

<div className={cn("px-4 py-2", className)} />
```

### Typography

Custom fonts loaded via next/font/google:
- **Geist Sans:** `--font-geist-sans` (body text)
- **Geist Mono:** `--font-geist-mono` (code)

Applied via CSS variables in layout.tsx:20-33.

### Supabase Integration

**Project Reference:** `pnswkyciqbrxfazltqqq`
**Project URL:** https://pnswkyciqbrxfazltqqq.supabase.co
**Dashboard:** https://supabase.com/dashboard/project/pnswkyciqbrxfazltqqq

Packages installed:
- `@supabase/supabase-js` - Client library
- `@supabase/ssr` - Server-side rendering utilities for Next.js

**Client architecture (lib/supabase/):**
- `client.ts` - Browser client (Client Components with `"use client"`)
- `server.ts` - Server client (Server Components, Route Handlers, Server Actions)
- `middleware.ts` - Session refresh logic for proxy

**Environment setup:**
1. Copy `.env.local.example` to `.env.local`
2. Get your anon key from: https://supabase.com/dashboard/project/pnswkyciqbrxfazltqqq/settings/api
3. Add to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://pnswkyciqbrxfazltqqq.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

**Usage patterns:**

Client Component:
```typescript
"use client"
import { createClient } from "@/lib/supabase/client"

const supabase = createClient()
```

Server Component:
```typescript
import { createClient } from "@/lib/supabase/server"

const supabase = await createClient()
```

**Proxy:** Configured in `proxy.ts` to refresh user sessions on every request. Matches all routes except static assets. Handles auth guards for protected routes, admin routes, and redirecting authenticated users from auth pages.

### TypeScript Configuration

- Strict mode enabled (tsconfig.json:7)
- Path aliases use `@/*` pattern (tsconfig.json:22)
- JSX transform: react-jsx (tsconfig.json:14)
- Target: ES2017 (tsconfig.json:3)

## Important Conventions

### File Organization
- Use Server Components by default (app directory)
- Add `"use client"` directive only when needed (interactivity, hooks, browser APIs)
- Place reusable UI components in `components/`
- Place utilities and helpers in `lib/`

### Component Patterns
- shadcn components use Radix UI primitives + Tailwind
- All UI components accept `className` prop for customization
- Button component uses `class-variance-authority` for variants

### State Management
No global state library installed. Use:
- React Context for app-wide state
- URL search params for shareable state
- Server Components for data fetching

### Testing
No testing framework configured yet. Consider installing:
- Jest + React Testing Library, or
- Vitest + React Testing Library

## Style Guide

See `docs/STYLE_GUIDE.md` for design standards and component usage patterns.

**Key requirement:** All color selection options must include the `ColorPicker` component from `@/components/ui/color-picker`. This applies to theme customization, category colors, branding settings, etc.

## Git Repository

Initialized as git repository during setup. No remote configured.
