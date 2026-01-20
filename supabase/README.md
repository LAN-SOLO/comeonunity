# ComeOnUnity Database Schema

This directory contains the Supabase database migrations and configuration for ComeOnUnity v2.0.

## Schema Overview

### Core Tables
- `communities` - Multi-tenant root table for communities
- `community_members` - Members of each community with roles and profiles
- `items` - Items available for lending
- `borrow_requests` - Requests to borrow items
- `resources` - Bookable resources (rooms, equipment, etc.)
- `bookings` - Resource reservations
- `news` - Community announcements and news
- `news_comments` - Comments on news posts
- `invites` - Invitation codes for joining communities
- `notifications` - User notifications

### Security Tables
- `user_profiles` - Extended user data including 2FA settings
- `user_sessions` - Active session tracking
- `audit_logs` - Security and admin action logging
- `moderation_reports` - Content flagging and moderation
- `rate_limits` - API rate limiting data

### Analytics Tables
- `platform_analytics` - Platform-wide metrics
- `community_analytics` - Per-community metrics
- `data_export_requests` - GDPR data export requests

## Setup Instructions

### Option 1: Using Supabase CLI (Recommended)

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link to your project:
   ```bash
   supabase link --project-ref pnswkyciqbrxfazltqqq
   ```

4. Push migrations:
   ```bash
   supabase db push
   ```

### Option 2: Manual Setup via Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run each migration file in order:
   - `001_create_core_tables.sql`
   - `002_create_security_tables.sql`
   - `003_create_rls_policies.sql`
   - `004_create_indexes_functions.sql`
   - `005_create_storage.sql`

### Option 3: Local Development

1. Start local Supabase:
   ```bash
   supabase start
   ```

2. Apply migrations:
   ```bash
   supabase db reset
   ```

3. View local Studio at http://localhost:54323

## Migration Files

| File | Description |
|------|-------------|
| `001_create_core_tables.sql` | Core business tables |
| `002_create_security_tables.sql` | Security and admin tables |
| `003_create_rls_policies.sql` | Row Level Security policies |
| `004_create_indexes_functions.sql` | Performance indexes and helper functions |
| `005_create_storage.sql` | Storage buckets and policies |

## Storage Buckets

| Bucket | Public | Max Size | Allowed Types |
|--------|--------|----------|---------------|
| `avatars` | Yes | 5MB | JPEG, PNG, WebP, GIF |
| `community-logos` | Yes | 2MB | JPEG, PNG, WebP, SVG |
| `item-images` | Yes | 10MB | JPEG, PNG, WebP |
| `resource-images` | Yes | 10MB | JPEG, PNG, WebP |
| `news-attachments` | Yes | 20MB | Images, PDF |
| `documents` | No | 50MB | PDF, Word, Excel |
| `exports` | No | 100MB | JSON, CSV, ZIP |

## Row Level Security

All tables have RLS enabled. Key policies:

- **Communities**: Members can view, admins can update
- **Members**: Members can view peers, admins can manage
- **Items**: Community members can view, owners can manage
- **Bookings**: Members can view/create, owners can manage
- **Audit Logs**: Community admins can view their logs

## Helper Functions

| Function | Description |
|----------|-------------|
| `is_community_member(uuid)` | Check if user is member |
| `is_community_admin(uuid)` | Check if user is admin |
| `is_community_moderator(uuid)` | Check if user is mod/admin |
| `is_platform_admin()` | Check if user is platform admin |
| `check_booking_conflict(...)` | Check for booking overlaps |
| `generate_invite_code(int)` | Generate random invite code |
| `generate_slug(text)` | Generate URL-safe slug |

## Scheduled Tasks

These functions should be called via cron jobs or Supabase Edge Functions:

- `cleanup_expired_sessions()` - Remove expired sessions
- `cleanup_expired_invites()` - Remove expired invites
- `mark_overdue_borrows()` - Mark overdue borrow requests

## Troubleshooting

### RLS blocking queries
- Check user authentication status
- Verify community membership
- Test policies in SQL Editor with `SET ROLE authenticated`

### Permission denied errors
- Ensure RLS policies exist for the operation
- Check if using correct Supabase client (client vs server vs admin)

### Migration conflicts
- Run `supabase db reset` for clean slate (development only)
- Check for duplicate index/policy names
