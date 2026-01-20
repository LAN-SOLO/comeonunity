-- =====================================================
-- ComeOnUnity v2.0 - Events Table Migration
-- =====================================================

-- Events (Community Calendar)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities ON DELETE CASCADE NOT NULL,
  organizer_id UUID REFERENCES community_members ON DELETE SET NULL,

  title TEXT NOT NULL,
  description TEXT,
  location TEXT,

  -- Timing
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  timezone TEXT DEFAULT 'Europe/Berlin',

  -- Recurrence
  recurring_rule TEXT, -- RRULE format
  parent_event_id UUID REFERENCES events ON DELETE CASCADE,

  -- Type and category
  type TEXT DEFAULT 'event' CHECK (type IN ('event', 'meeting', 'maintenance', 'social', 'workshop', 'other')),
  category TEXT,
  color TEXT DEFAULT '#3B82F6',

  -- Images
  cover_image_url TEXT,
  images TEXT[],

  -- RSVP settings
  rsvp_enabled BOOLEAN DEFAULT TRUE,
  max_attendees INTEGER,
  rsvp_deadline TIMESTAMPTZ,

  -- Visibility
  visibility TEXT DEFAULT 'all' CHECK (visibility IN ('all', 'members', 'admins')),

  -- Status
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('draft', 'scheduled', 'cancelled', 'completed')),
  cancelled_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event RSVPs
CREATE TABLE IF NOT EXISTS event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES community_members ON DELETE CASCADE NOT NULL,

  status TEXT DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going')),
  guests INTEGER DEFAULT 0,
  note TEXT,

  responded_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(event_id, member_id)
);

-- Create indexes for events
CREATE INDEX IF NOT EXISTS idx_events_community ON events(community_id);
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events(starts_at);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event ON event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_member ON event_rsvps(member_id);

-- Apply updated_at trigger
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

-- Events policies
CREATE POLICY "Members can view events in their community"
  ON events FOR SELECT
  USING (
    community_id IN (
      SELECT community_id FROM community_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Admins and moderators can create events"
  ON events FOR INSERT
  WITH CHECK (
    community_id IN (
      SELECT community_id FROM community_members
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins, moderators and organizers can update events"
  ON events FOR UPDATE
  USING (
    community_id IN (
      SELECT community_id FROM community_members
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('admin', 'moderator')
    )
    OR organizer_id IN (
      SELECT id FROM community_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Admins and moderators can delete events"
  ON events FOR DELETE
  USING (
    community_id IN (
      SELECT community_id FROM community_members
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('admin', 'moderator')
    )
  );

-- Event RSVPs policies
CREATE POLICY "Members can view RSVPs for events in their community"
  ON event_rsvps FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events WHERE community_id IN (
        SELECT community_id FROM community_members
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY "Members can manage their own RSVPs"
  ON event_rsvps FOR ALL
  USING (
    member_id IN (
      SELECT id FROM community_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
