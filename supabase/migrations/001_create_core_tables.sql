-- =====================================================
-- ComeOnUnity v2.0 - Core Tables Migration
-- =====================================================

-- Communities (Multi-tenant root)
CREATE TABLE IF NOT EXISTS communities (
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

  -- Branding
  logo_url TEXT,
  primary_color TEXT DEFAULT '#007AFF',

  -- Billing
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'community', 'pro')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),

  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community Members
CREATE TABLE IF NOT EXISTS community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
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

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
  suspended_reason TEXT,
  suspended_at TIMESTAMPTZ,
  suspended_by UUID REFERENCES community_members,

  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ,

  UNIQUE(community_id, user_id)
);

-- Items (Lending Library)
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES community_members ON DELETE CASCADE NOT NULL,

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

  -- Moderation
  flagged BOOLEAN DEFAULT FALSE,
  flagged_reason TEXT,
  flagged_at TIMESTAMPTZ,
  flagged_by UUID REFERENCES community_members,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resources (Bookable)
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities ON DELETE CASCADE NOT NULL,

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
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES resources ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES community_members ON DELETE CASCADE NOT NULL,

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
CREATE TABLE IF NOT EXISTS borrow_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items ON DELETE CASCADE NOT NULL,
  borrower_id UUID REFERENCES community_members ON DELETE CASCADE NOT NULL,

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
CREATE TABLE IF NOT EXISTS news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES community_members ON DELETE SET NULL,

  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  content_html TEXT,

  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'announcement', 'update', 'important', 'event', 'maintenance', 'social')),
  image_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),

  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  pinned BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  attachments JSONB,
  allow_comments BOOLEAN DEFAULT TRUE,

  -- Moderation
  flagged BOOLEAN DEFAULT FALSE,
  flagged_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- News Comments
CREATE TABLE IF NOT EXISTS news_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id UUID REFERENCES news ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES community_members ON DELETE SET NULL,

  content TEXT NOT NULL,
  parent_id UUID REFERENCES news_comments ON DELETE CASCADE,

  -- Moderation
  flagged BOOLEAN DEFAULT FALSE,
  flagged_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invites
CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities ON DELETE CASCADE NOT NULL,

  code TEXT UNIQUE NOT NULL,
  email TEXT,

  max_uses INTEGER DEFAULT 1,
  uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,

  created_by UUID REFERENCES community_members,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES community_members ON DELETE CASCADE NOT NULL,
  community_id UUID REFERENCES communities ON DELETE CASCADE,

  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB,
  link TEXT,

  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_communities_updated_at
  BEFORE UPDATE ON communities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_news_updated_at
  BEFORE UPDATE ON news
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_news_comments_updated_at
  BEFORE UPDATE ON news_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
